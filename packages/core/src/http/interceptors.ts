import type { TenxyteStorage } from '../storage';
import type { RequestConfig, TenxyteHttpClient } from './client';

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
