import type { TenxyteStorage } from '../storage';
import type { RequestConfig, TenxyteHttpClient } from './client';
import { buildDeviceInfo, type CustomDeviceInfo } from '../utils/device_info';
import type { TenxyteLogger } from '../config';

export interface TenxyteContext {
    activeOrgSlug: string | null;
    agentTraceId: string | null;
}

export function createAuthInterceptor(storage: TenxyteStorage, context: TenxyteContext) {
    return async (request: RequestConfig & { url: string }) => {
        // Inject Authorization if present
        const token = await storage.getItem('tx_access');
        const headers = { ...(request.headers as Record<string, string>) || {} };

        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Inject Contextual Headers based on SDK state
        if (context.activeOrgSlug && !headers['X-Org-Slug']) {
            headers['X-Org-Slug'] = context.activeOrgSlug;
        }

        if (context.agentTraceId && !headers['X-Prompt-Trace-ID']) {
            headers['X-Prompt-Trace-ID'] = context.agentTraceId;
        }

        return { ...request, headers };
    };
}

export function createRefreshInterceptor(
    client: TenxyteHttpClient,
    storage: TenxyteStorage,
    onSessionExpired: () => void,
    onTokenRefreshed?: (accessToken: string, refreshToken?: string) => void,
) {
    let isRefreshing = false;
    let refreshQueue: Array<(token: string | null) => void> = [];

    const processQueue = (error: Error | null, token: string | null = null) => {
        refreshQueue.forEach(prom => prom(token));
        refreshQueue = [];
    };

    return async (response: Response, request: { url: string; config: RequestConfig }): Promise<Response> => {
        // Only intercept 401s when not attempting to login/refresh itself
        if (response.status === 401 && !request.url.includes('/auth/refresh') && !request.url.includes('/auth/login')) {
            const refreshToken = await storage.getItem('tx_refresh');

            if (!refreshToken) {
                onSessionExpired();
                return response; // Pass through 401 if we cannot refresh
            }

            if (isRefreshing) {
                // Wait in queue for the refresh to complete
                return new Promise<Response>((resolve) => {
                    refreshQueue.push((newToken: string | null) => {
                        if (newToken) {
                            const retryHeaders = { ...(request.config.headers as Record<string, string>), Authorization: `Bearer ${newToken}` };
                            resolve(fetch(request.url, { ...request.config, headers: retryHeaders } as RequestInit));
                        } else {
                            resolve(response);
                        }
                    });
                });
            }

            // We are the first one, initiate refresh
            isRefreshing = true;

            try {
                const refreshResponse = await fetch(`${client['baseUrl']}/auth/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (!refreshResponse.ok) {
                    throw new Error('Refresh failed');
                }

                const data = await refreshResponse.json();

                await storage.setItem('tx_access', data.access);
                if (data.refresh) {
                    await storage.setItem('tx_refresh', data.refresh);
                }

                isRefreshing = false;
                onTokenRefreshed?.(data.access, data.refresh);
                processQueue(null, data.access);

                // Retry original request seamlessly for the caller that initiated this
                const retryHeaders = { ...(request.config.headers as Record<string, string>), Authorization: `Bearer ${data.access}` };
                // We use fetch directly to return a true Response object back to the chain,
                // rather than using client.request which resolves the JSON.
                // Wait, the interceptor must return a Promise<Response>!
                const r = await fetch(request.url, { ...request.config, headers: retryHeaders } as RequestInit);
                return r;

            } catch (err) {
                // Refresh failed (invalid token, expired, network error)
                isRefreshing = false;
                await storage.removeItem('tx_access');
                await storage.removeItem('tx_refresh');

                processQueue(err as Error, null);
                onSessionExpired();

                // Pass original 401 back
                return response;
            }
        }

        return response;
    };
}

const DEVICE_INFO_ENDPOINTS = [
    '/login/email/',
    '/login/phone/',
    '/register/',
    '/social/',
];

// ─── Retry Interceptor ───

/** Configuration for the automatic retry middleware. */
export interface RetryConfig {
    /** Maximum number of retries per request. Defaults to 3. */
    maxRetries?: number;
    /** Retry on HTTP 429 (Too Many Requests). Defaults to true. */
    retryOn429?: boolean;
    /** Retry on network errors (fetch failures, timeouts). Defaults to true. */
    retryOnNetworkError?: boolean;
    /** Base delay in ms for exponential backoff. Defaults to 1000. */
    baseDelayMs?: number;
}

const DEFAULT_RETRY: Required<RetryConfig> = {
    maxRetries: 3,
    retryOn429: true,
    retryOnNetworkError: true,
    baseDelayMs: 1000,
};

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a response interceptor that retries failed requests with exponential backoff.
 * Respects the `Retry-After` header when present on 429 responses.
 */
export function createRetryInterceptor(config: RetryConfig = {}, logger?: TenxyteLogger) {
    const opts = { ...DEFAULT_RETRY, ...config };

    return async (response: Response, request: { url: string; config: RequestConfig }): Promise<Response> => {
        const shouldRetry429 = opts.retryOn429 && response.status === 429;
        const shouldRetryServer = response.status >= 500;

        if (!shouldRetry429 && !shouldRetryServer) {
            return response;
        }

        let lastResponse = response;

        for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
            // Determine delay: prefer Retry-After header, fall back to exponential backoff
            let delayMs = opts.baseDelayMs * Math.pow(2, attempt - 1);
            const retryAfter = lastResponse.headers.get('Retry-After');
            if (retryAfter) {
                const parsed = Number(retryAfter);
                if (!isNaN(parsed)) {
                    delayMs = parsed * 1000;
                }
            }

            logger?.debug(`[Tenxyte Retry] Attempt ${attempt}/${opts.maxRetries} after ${delayMs}ms for ${request.url}`);
            await sleep(delayMs);

            try {
                const retryResponse = await fetch(request.url, request.config as RequestInit);

                if (retryResponse.status === 429 && opts.retryOn429 && attempt < opts.maxRetries) {
                    lastResponse = retryResponse;
                    continue;
                }
                if (retryResponse.status >= 500 && attempt < opts.maxRetries) {
                    lastResponse = retryResponse;
                    continue;
                }

                return retryResponse;
            } catch (err) {
                if (!opts.retryOnNetworkError || attempt >= opts.maxRetries) {
                    throw err;
                }
                logger?.warn(`[Tenxyte Retry] Network error on attempt ${attempt}/${opts.maxRetries}`, err);
            }
        }

        return lastResponse;
    };
}

// ─── Device Info Interceptor ───

export function createDeviceInfoInterceptor(override?: CustomDeviceInfo) {
    const fingerprint = buildDeviceInfo(override);

    return (request: RequestConfig & { url: string }) => {
        const isPost = !request.method || request.method === 'POST';
        const matchesEndpoint = DEVICE_INFO_ENDPOINTS.some(ep => request.url.includes(ep));

        if (isPost && matchesEndpoint && request.body && typeof request.body === 'object') {
            const body = request.body as Record<string, unknown>;
            if (!body.device_info) {
                return { ...request, body: { ...body, device_info: fingerprint } };
            }
        }

        return request;
    };
}
