import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardModule } from '../../src/modules/dashboard';
import { TenxyteHttpClient } from '../../src/http/client';

describe('DashboardModule', () => {
    let client: TenxyteHttpClient;
    let dashboard: DashboardModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        dashboard = new DashboardModule(client);
        vi.spyOn(client, 'request').mockImplementation(async () => ({}));
    });

    it('getStats should GET /api/v1/auth/dashboard/stats/ with params', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ summary: { total_users: 100 } });
        const result = await dashboard.getStats({ period: '30d', compare: true });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/dashboard/stats/', {
            method: 'GET',
            params: { period: '30d', compare: true },
        });
        expect(result.summary?.total_users).toBe(100);
    });

    it('getStats should work without params', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ summary: {} });
        await dashboard.getStats();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/dashboard/stats/', {
            method: 'GET',
            params: undefined,
        });
    });

    it('getAuthStats should GET /api/v1/auth/dashboard/auth/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ login_count: 50 });
        const result = await dashboard.getAuthStats();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/dashboard/auth/', { method: 'GET' });
        expect(result).toEqual({ login_count: 50 });
    });

    it('getSecurityStats should GET /api/v1/auth/dashboard/security/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ incidents: 2 });
        const result = await dashboard.getSecurityStats();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/dashboard/security/', { method: 'GET' });
        expect(result).toEqual({ incidents: 2 });
    });

    it('getGdprStats should GET /api/v1/auth/dashboard/gdpr/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ pending_deletions: 1 });
        const result = await dashboard.getGdprStats();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/dashboard/gdpr/', { method: 'GET' });
        expect(result).toEqual({ pending_deletions: 1 });
    });

    it('getOrganizationStats should GET /api/v1/auth/dashboard/organizations/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ total_orgs: 5 });
        const result = await dashboard.getOrganizationStats();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/dashboard/organizations/', { method: 'GET' });
        expect(result).toEqual({ total_orgs: 5 });
    });
});
