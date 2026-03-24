import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminModule } from '../../src/modules/admin';
import { TenxyteHttpClient } from '../../src/http/client';

describe('AdminModule', () => {
    let client: TenxyteHttpClient;
    let admin: AdminModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        admin = new AdminModule(client);
        vi.spyOn(client, 'request').mockImplementation(async () => ({}));
    });

    // ─── Audit Logs ───

    it('listAuditLogs should GET /api/v1/auth/admin/audit-logs/ with params', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ count: 2, results: [{ id: '1' }, { id: '2' }] });
        const result = await admin.listAuditLogs({ action: 'login', page: 1 });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/audit-logs/', {
            method: 'GET',
            params: { action: 'login', page: 1 },
        });
        expect(result.count).toBe(2);
    });

    it('listAuditLogs should work without params', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ count: 0, results: [] });
        await admin.listAuditLogs();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/audit-logs/', {
            method: 'GET',
            params: undefined,
        });
    });

    it('getAuditLog should GET /api/v1/auth/admin/audit-logs/:id/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ id: 'log-1', action: 'login' });
        const result = await admin.getAuditLog('log-1');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/audit-logs/log-1/', { method: 'GET' });
        expect(result.action).toBe('login');
    });

    // ─── Login Attempts ───

    it('listLoginAttempts should GET /api/v1/auth/admin/login-attempts/ with params', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ count: 1, results: [{ id: '1', success: false }] });
        const result = await admin.listLoginAttempts({ success: false });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/login-attempts/', {
            method: 'GET',
            params: { success: false },
        });
        expect(result.results[0].success).toBe(false);
    });

    // ─── Blacklisted Tokens ───

    it('listBlacklistedTokens should GET /api/v1/auth/admin/blacklisted-tokens/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ count: 0, results: [] });
        await admin.listBlacklistedTokens({ reason: 'logout' });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/blacklisted-tokens/', {
            method: 'GET',
            params: { reason: 'logout' },
        });
    });

    it('cleanupBlacklistedTokens should POST /api/v1/auth/admin/blacklisted-tokens/cleanup/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ deleted_count: 5 });
        const result = await admin.cleanupBlacklistedTokens();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/blacklisted-tokens/cleanup/', {
            method: 'POST',
            body: undefined,
        });
        expect(result).toEqual({ deleted_count: 5 });
    });

    // ─── Refresh Tokens ───

    it('listRefreshTokens should GET /api/v1/auth/admin/refresh-tokens/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ count: 1, results: [{ id: 'rt-1' }] });
        await admin.listRefreshTokens({ is_revoked: false });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/refresh-tokens/', {
            method: 'GET',
            params: { is_revoked: false },
        });
    });

    it('revokeRefreshToken should POST /api/v1/auth/admin/refresh-tokens/:id/revoke/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ id: 'rt-1', is_revoked: true });
        const result = await admin.revokeRefreshToken('rt-1');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/refresh-tokens/rt-1/revoke/', {
            method: 'POST',
            body: undefined,
        });
        expect(result.is_revoked).toBe(true);
    });
});
