import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TenxyteClient } from '../../src/client';
import { MemoryStorage } from '../../src/storage';

// Helper to create a dummy JWT with a specific expiry
function createJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${body}.fake_signature`;
}

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Partial<Response> {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers({ 'content-type': 'application/json', ...headers }),
        json: () => Promise.resolve(body),
        clone() { return this as Response; },
    };
}

describe('TenxyteClient Integration', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
        mockFetch.mockReset();
        storage = new MemoryStorage();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ─── ISSUE-021-A — Full login → auto-store → 401 → refresh → retry ───

    describe('Full auth flow with auto-refresh', () => {
        it('login stores tokens, then 401 triggers silent refresh and retries', async () => {
            const tx = new TenxyteClient({
                baseUrl: 'https://api.test.com',
                storage,
                autoRefresh: true,
                autoDeviceInfo: false,
            });

            const futureExp = Math.floor(Date.now() / 1000) + 3600;
            const accessToken = createJwt({ sub: 'user-1', exp: futureExp, roles: ['admin'] });
            const newAccessToken = createJwt({ sub: 'user-1', exp: futureExp + 3600, roles: ['admin'] });

            // 1. Login call returns tokens
            mockFetch.mockResolvedValueOnce(jsonResponse(200, {
                access_token: accessToken,
                refresh_token: 'refresh_1',
                token_type: 'Bearer',
                expires_in: 3600,
            }));

            const loginResult = await tx.auth.loginWithEmail({ email: 'user@test.com', password: 'pass', device_info: '' });
            expect(loginResult.access_token).toBe(accessToken);
            expect(await storage.getItem('tx_access')).toBe(accessToken);
            expect(await storage.getItem('tx_refresh')).toBe('refresh_1');

            // 2. A subsequent request gets 401
            // 3. Refresh interceptor kicks in, refreshes, retries
            mockFetch
                .mockResolvedValueOnce(jsonResponse(401, { error: 'Token expired' }))
                .mockResolvedValueOnce(jsonResponse(200, { access: newAccessToken, refresh: 'refresh_2' }))
                .mockResolvedValueOnce(jsonResponse(200, { id: 'user-1', email: 'user@test.com' }));

            const profile = await tx.user.getProfile();
            expect(profile.id).toBe('user-1');
            expect(await storage.getItem('tx_access')).toBe(newAccessToken);
            expect(await storage.getItem('tx_refresh')).toBe('refresh_2');
            expect(mockFetch).toHaveBeenCalledTimes(4); // login + 401 + refresh + retry
        });
    });

    // ─── ISSUE-021-B — Session expired flow ───

    describe('Session expired flow', () => {
        it('emits session:expired when refresh fails and clears storage', async () => {
            const onSessionExpired = vi.fn();
            const tx = new TenxyteClient({
                baseUrl: 'https://api.test.com',
                storage,
                autoRefresh: true,
                autoDeviceInfo: false,
                onSessionExpired,
            });

            await storage.setItem('tx_access', 'old_expired_token');
            await storage.setItem('tx_refresh', 'bad_refresh');

            const sessionExpiredSpy = vi.fn();
            tx.on('session:expired', sessionExpiredSpy);

            // 1. Request gets 401
            // 2. Refresh call also fails
            mockFetch
                .mockResolvedValueOnce(jsonResponse(401, { error: 'Token expired' }))
                .mockResolvedValueOnce(jsonResponse(401, { error: 'Refresh token invalid' }));

            // The original request should propagate through (returns the 401 response)
            // Since the response interceptor returns the original 401, the client.request
            // will throw a TenxyteError for non-ok status
            try {
                await tx.user.getProfile();
            } catch {
                // Expected: the original 401 is thrown as TenxyteError
            }

            expect(onSessionExpired).toHaveBeenCalled();
            expect(sessionExpiredSpy).toHaveBeenCalled();
            expect(await storage.getItem('tx_access')).toBeNull();
            expect(await storage.getItem('tx_refresh')).toBeNull();
        });
    });

    // ─── ISSUE-021-C — Agent flow ───

    describe('Agent flow', () => {
        it('setAgentToken injects AgentBearer, clearAgentToken reverts to standard Bearer', async () => {
            const tx = new TenxyteClient({
                baseUrl: 'https://api.test.com',
                storage,
                autoRefresh: false,
                autoDeviceInfo: false,
            });

            const futureExp = Math.floor(Date.now() / 1000) + 3600;
            const userToken = createJwt({ sub: 'user-1', exp: futureExp });
            await storage.setItem('tx_access', userToken);

            // 1. Set agent token
            tx.ai.setAgentToken('agt_secret');
            expect(tx.ai.isAgentMode()).toBe(true);

            // 2. Make a request — should use AgentBearer
            mockFetch.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
            await tx.user.getProfile();

            const firstCallHeaders = mockFetch.mock.calls[0][1].headers;
            expect(firstCallHeaders['Authorization']).toBe('AgentBearer agt_secret');

            // 3. Clear agent token
            tx.ai.clearAgentToken();
            expect(tx.ai.isAgentMode()).toBe(false);

            // 4. Make another request — should use standard Bearer
            mockFetch.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
            await tx.user.getProfile();

            const secondCallHeaders = mockFetch.mock.calls[1][1].headers;
            expect(secondCallHeaders['Authorization']).toBe(`Bearer ${userToken}`);
        });
    });

    // ─── ISSUE-021-D — B2B flow ───

    describe('B2B organization context flow', () => {
        it('switchOrganization injects X-Org-Slug, clearOrganization removes it', async () => {
            const tx = new TenxyteClient({
                baseUrl: 'https://api.test.com',
                storage,
                autoRefresh: false,
                autoDeviceInfo: false,
            });

            // 1. Switch to org
            tx.b2b.switchOrganization('acme');

            mockFetch.mockResolvedValueOnce(jsonResponse(200, { id: 'user-1' }));
            await tx.user.getProfile();

            const firstCallHeaders = mockFetch.mock.calls[0][1].headers;
            expect(firstCallHeaders['X-Org-Slug']).toBe('acme');

            // 2. Clear org
            tx.b2b.clearOrganization();

            mockFetch.mockResolvedValueOnce(jsonResponse(200, { id: 'user-1' }));
            await tx.user.getProfile();

            const secondCallHeaders = mockFetch.mock.calls[1][1].headers;
            expect(secondCallHeaders['X-Org-Slug']).toBeUndefined();
        });
    });
});
