import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenxyteHttpClient } from '../src/http/client';
import { MemoryStorage } from '../src/storage';
import { createAuthInterceptor, createRefreshInterceptor, createRetryInterceptor, createDeviceInfoInterceptor } from '../src/http/interceptors';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TenxyteHttpClient', () => {
    let client: TenxyteHttpClient;
    let storage: MemoryStorage;

    beforeEach(() => {
        mockFetch.mockReset();
        storage = new MemoryStorage();
        client = new TenxyteHttpClient({ baseUrl: 'https://api.tenxyte.com/v1' });
    });

    describe('Core HTTP', () => {
        it('should format URL correctly and apply default headers', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: () => Promise.resolve({ data: 'ok' })
            } as any);

            const res = await client.get<{ data: string }>('/users', { params: { limit: 10 } });

            expect(res.data).toBe('ok');
            expect(mockFetch).toHaveBeenCalledWith('https://api.tenxyte.com/v1/users?limit=10', expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                })
            }));
        });

        it('should throw normalized TenxyteError on failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: () => Promise.resolve({ error: 'Bad data', code: 'INVALID_CREDENTIALS', details: { email: ['invalid'] } })
            } as any);

            await expect(client.post('/auth/login', { bad: true })).rejects.toMatchObject({
                error: 'Bad data',
                code: 'INVALID_CREDENTIALS',
                details: { email: ['invalid'] }
            });
        });

        it('should handle 204 No Content correctly without parsing JSON', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 204,
                headers: new Headers()
            } as any);

            const res = await client.delete('/users/1');
            expect(res).toEqual({});
        });
    });

    describe('Interceptors', () => {
        it('should inject Authorization and Context headers', async () => {
            storage.setItem('tx_access', 'jwt.token.123');
            const authInterceptor = createAuthInterceptor(storage, { activeOrgSlug: 'tenxyte-labs', agentTraceId: 'trc_999' });
            client.addRequestInterceptor(authInterceptor);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: () => Promise.resolve({ ok: true })
            } as any);

            await client.get('/me');
            expect(mockFetch).toHaveBeenCalledWith('https://api.tenxyte.com/v1/me', expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer jwt.token.123',
                    'X-Org-Slug': 'tenxyte-labs',
                    'X-Prompt-Trace-ID': 'trc_999'
                })
            }));
        });

        it('should seamlessly refresh token on 401', async () => {
            storage.setItem('tx_access', 'expired.token');
            storage.setItem('tx_refresh', 'valid.refresh.token');

            const onSessionExpired = vi.fn();
            const authInterceptor = createAuthInterceptor(storage, { activeOrgSlug: null, agentTraceId: null });
            const refreshInterceptor = createRefreshInterceptor(client, storage, onSessionExpired);

            client.addRequestInterceptor(authInterceptor);
            client.addResponseInterceptor(refreshInterceptor);

            // 1. Initial request gets 401
            // 2. Interceptor triggers refresh (/auth/refresh/) returning 200 with new token
            // 3. Interceptor retries initial request with new token, returning 200

            mockFetch
                // First fail call '/me' with 401
                .mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    headers: new Headers(),
                    json: () => Promise.resolve({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
                } as any)
                // Refresh call '/auth/refresh/' succeeds
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ access: 'new.access', refresh: 'new.refresh' })
                } as any)
                // Retry call '/me' succeeds
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ id: 1, name: 'Bob' })
                } as any);

            const res = await client.get('/me');

            expect(res).toEqual({ id: 1, name: 'Bob' });
            expect(storage.getItem('tx_access')).toBe('new.access');
            expect(storage.getItem('tx_refresh')).toBe('new.refresh');
            expect(mockFetch).toHaveBeenCalledTimes(3);

            // Verify the retry request had the NEW token!
            expect(mockFetch).toHaveBeenNthCalledWith(3, 'https://api.tenxyte.com/v1/me', expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer new.access'
                })
            }));
        });
    });

    describe('Timeout', () => {
        it('should abort request when timeoutMs is exceeded', async () => {
            const timedClient = new TenxyteHttpClient({ baseUrl: 'https://api.tenxyte.com/v1', timeoutMs: 50 });

            // Simulate a fetch that respects AbortSignal
            mockFetch.mockImplementationOnce((_url: string, init: RequestInit) => {
                return new Promise((resolve, reject) => {
                    const signal = init?.signal;
                    if (signal) {
                        signal.addEventListener('abort', () => {
                            const err = new DOMException('The operation was aborted.', 'AbortError');
                            reject(err);
                        });
                    }
                    // Never resolve — let the abort fire
                });
            });

            await expect(timedClient.get('/slow')).rejects.toMatchObject({ code: 'TIMEOUT' });
        });
    });

    describe('Retry Interceptor', () => {
        it('should retry on 429 and respect Retry-After header', async () => {
            const retryClient = new TenxyteHttpClient({ baseUrl: 'https://api.tenxyte.com/v1' });
            retryClient.addResponseInterceptor(
                createRetryInterceptor({ maxRetries: 2, baseDelayMs: 10 }),
            );

            mockFetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    headers: new Headers({ 'content-type': 'application/json', 'Retry-After': '0' }),
                    json: () => Promise.resolve({ error: 'Too many requests' }),
                } as any)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ data: 'ok' }),
                } as any);

            const result = await retryClient.get('/rate-limited');
            expect(result).toEqual({ data: 'ok' });
            expect(mockFetch).toHaveBeenCalledTimes(2); // original + 1 retry
        });

        it('should retry on 500 errors', async () => {
            const retryClient = new TenxyteHttpClient({ baseUrl: 'https://api.tenxyte.com/v1' });
            retryClient.addResponseInterceptor(
                createRetryInterceptor({ maxRetries: 1, baseDelayMs: 10 }),
            );

            mockFetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ error: 'Internal server error' }),
                } as any)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ recovered: true }),
                } as any);

            const result = await retryClient.get('/flaky');
            expect(result).toEqual({ recovered: true });
        });

        it('should not retry on 400 errors', async () => {
            const retryClient = new TenxyteHttpClient({ baseUrl: 'https://api.tenxyte.com/v1' });
            retryClient.addResponseInterceptor(
                createRetryInterceptor({ maxRetries: 2, baseDelayMs: 10 }),
            );

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: () => Promise.resolve({ error: 'Bad request' }),
            } as any);

            await expect(retryClient.post('/bad', {})).rejects.toMatchObject({ error: 'Bad request' });
            expect(mockFetch).toHaveBeenCalledTimes(1); // no retry
        });
    });

    describe('Device Info Interceptor (unit)', () => {
        it('should inject device_info into matching POST request objects', () => {
            const interceptor = createDeviceInfoInterceptor();
            const request = {
                url: 'https://api.test.com/api/v1/auth/login/email/',
                method: 'POST' as const,
                body: { email: 'test@test.com', password: 'pass' },
                headers: {},
            };

            const result = interceptor(request);
            expect((result.body as Record<string, unknown>).device_info).toBeDefined();
            expect((result.body as Record<string, unknown>).device_info).toContain('v=1');
        });

        it('should NOT inject device_info into non-auth POST requests', () => {
            const interceptor = createDeviceInfoInterceptor();
            const request = {
                url: 'https://api.test.com/api/v1/auth/me/',
                method: 'POST' as const,
                body: { first_name: 'John' },
                headers: {},
            };

            const result = interceptor(request);
            expect((result.body as Record<string, unknown>).device_info).toBeUndefined();
        });

        it('should NOT inject device_info into GET requests', () => {
            const interceptor = createDeviceInfoInterceptor();
            const request = {
                url: 'https://api.test.com/api/v1/auth/login/email/',
                method: 'GET' as const,
                body: undefined,
                headers: {},
            };

            const result = interceptor(request);
            expect(result.body).toBeUndefined();
        });

        it('should NOT overwrite existing device_info', () => {
            const interceptor = createDeviceInfoInterceptor();
            const request = {
                url: 'https://api.test.com/api/v1/auth/register/',
                method: 'POST' as const,
                body: { email: 'a@b.com', password: 'x', device_info: 'custom' },
                headers: {},
            };

            const result = interceptor(request);
            expect((result.body as Record<string, unknown>).device_info).toBe('custom');
        });
    });
});
