import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenxyteHttpClient } from '../src/http/client';
import { MemoryStorage } from '../src/storage';
import { createAuthInterceptor, createRefreshInterceptor } from '../src/http/interceptors';

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
});
