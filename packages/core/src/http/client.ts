import type { TenxyteError } from '../types';

export interface HttpClientOptions {
    baseUrl: string;
    timeoutMs?: number;
    headers?: Record<string, string>;
}

export type RequestConfig = Omit<RequestInit, 'body' | 'headers'> & {
    body?: unknown;
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
};

/**
 * Core HTTP Client underlying the SDK.
 * Handles JSON parsing, standard headers, simple request processing,
 * and normalizing errors into TenxyteError format.
 */
export class TenxyteHttpClient {
    private baseUrl: string;
    private defaultHeaders: Record<string, string>;
    private timeoutMs: number | undefined;

    // Interceptors
    private requestInterceptors: Array<(config: RequestConfig & { url: string }) => Promise<RequestConfig & { url: string }> | (RequestConfig & { url: string })> = [];
    private responseInterceptors: Array<(response: Response, request: { url: string; config: RequestConfig }) => Promise<Response> | Response> = [];

    constructor(options: HttpClientOptions) {
        this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.timeoutMs = options.timeoutMs;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...options.headers,
        };
    }

    // Interceptor Registration
    addRequestInterceptor(interceptor: typeof this.requestInterceptors[0]) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(interceptor: typeof this.responseInterceptors[0]) {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Main request method wrapping fetch
     */
    async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
        const urlStr = endpoint.startsWith('http')
            ? endpoint
            : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

        const urlObj = new URL(urlStr);

        if (config.params) {
            Object.entries(config.params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    urlObj.searchParams.append(key, String(value));
                }
            });
        }

        let requestContext: any = {
            url: urlObj.toString(),
            ...config,
            headers: { ...this.defaultHeaders, ...(config.headers || {}) } as Record<string, string>,
        };

        // Handle FormData implicitly for multipart requests
        if (typeof FormData !== 'undefined' && requestContext.body instanceof FormData) {
            const headers = requestContext.headers as Record<string, string>;
            // Explicitly remove Content-Type so fetch can auto-assign the multipart boundary
            delete headers['Content-Type'];
            delete headers['content-type'];
        } else if (requestContext.body && typeof requestContext.body === 'object') {
            const contentType = (requestContext.headers as Record<string, string>)['Content-Type'] || '';
            if (contentType.toLowerCase().includes('application/json')) {
                requestContext.body = JSON.stringify(requestContext.body);
            }
        }

        // Run Request Interceptors
        for (const interceptor of this.requestInterceptors) {
            requestContext = await interceptor(requestContext);
        }

        const { url, ...fetchConfig } = requestContext as any;

        let controller: AbortController | undefined;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        if (this.timeoutMs) {
            controller = new AbortController();
            (fetchConfig as any).signal = controller.signal;
            timeoutId = setTimeout(() => controller!.abort(), this.timeoutMs);
        }

        try {
            let response = await fetch(url, fetchConfig as RequestInit);

            // Run Response Interceptors (e.g., token refresh logic)
            for (const interceptor of this.responseInterceptors) {
                response = await interceptor(response, { url, config: fetchConfig as RequestConfig });
            }

            if (!response.ok) {
                throw await this.normalizeError(response);
            }

            // Handle NoContent
            if (response.status === 204) {
                return {} as T;
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return (await response.json()) as T;
            }

            return (await response.text()) as unknown as T;
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                throw {
                    error: `Request timed out after ${this.timeoutMs}ms`,
                    code: 'TIMEOUT' as import('../types').TenxyteErrorCode,
                    details: url,
                } as TenxyteError;
            }
            if (error && error.code) {
                throw error; // Already normalized
            }
            throw {
                error: error.message || 'Network request failed',
                code: 'NETWORK_ERROR' as import('../types').TenxyteErrorCode,
                details: String(error)
            } as TenxyteError;
        } finally {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
        }
    }

    private async normalizeError(response: Response): Promise<TenxyteError> {
        try {
            const body = await response.json();
            return {
                error: body.error || body.detail || 'API request failed',
                code: body.code || `HTTP_${response.status}`,
                details: body.details || body,
                retry_after: response.headers.has('Retry-After') ? parseInt(response.headers.get('Retry-After')!, 10) : undefined,
            } as TenxyteError;
        } catch (_e) {
            return {
                error: `HTTP Error ${response.status}: ${response.statusText}`,
                code: `HTTP_${response.status}` as unknown as import('../types').TenxyteErrorCode,
            } as TenxyteError;
        }
    }

    // Convenience methods
    get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...config, method: 'GET' });
    }

    post<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...config, method: 'POST', body: data });
    }

    put<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
    }

    patch<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...config, method: 'PATCH', body: data });
    }

    delete<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...config, method: 'DELETE', body: data });
    }
}
