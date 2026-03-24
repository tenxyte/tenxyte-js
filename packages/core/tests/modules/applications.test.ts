import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationsModule } from '../../src/modules/applications';
import { TenxyteHttpClient } from '../../src/http/client';

describe('ApplicationsModule', () => {
    let client: TenxyteHttpClient;
    let apps: ApplicationsModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        apps = new ApplicationsModule(client);
        vi.spyOn(client, 'request').mockImplementation(async () => ({}));
    });

    it('listApplications should GET /api/v1/auth/applications/ with params', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ count: 1, results: [{ id: '1' }] });
        const result = await apps.listApplications({ page: 1, is_active: true });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/applications/', {
            method: 'GET',
            params: { page: 1, is_active: true },
        });
        expect(result.count).toBe(1);
    });

    it('createApplication should POST /api/v1/auth/applications/', async () => {
        const data = { name: 'My App', description: 'Test app' };
        vi.mocked(client.request).mockResolvedValueOnce({ id: 1, name: 'My App', client_id: 'cid', client_secret: 'csec' });
        const result = await apps.createApplication(data);
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/applications/', {
            method: 'POST',
            body: data,
        });
        expect(result.client_secret).toBe('csec');
    });

    it('getApplication should GET /api/v1/auth/applications/:id/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ id: 'app-1', name: 'My App' });
        const result = await apps.getApplication('app-1');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/applications/app-1/', { method: 'GET' });
        expect(result.name).toBe('My App');
    });

    it('updateApplication should PUT /api/v1/auth/applications/:id/', async () => {
        const data = { name: 'Updated App' };
        vi.mocked(client.request).mockResolvedValueOnce({ id: 'app-1', name: 'Updated App' });
        await apps.updateApplication('app-1', data);
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/applications/app-1/', {
            method: 'PUT',
            body: data,
        });
    });

    it('patchApplication should PATCH /api/v1/auth/applications/:id/', async () => {
        const data = { is_active: false };
        vi.mocked(client.request).mockResolvedValueOnce({ id: 'app-1', is_active: false });
        await apps.patchApplication('app-1', data);
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/applications/app-1/', {
            method: 'PATCH',
            body: data,
        });
    });

    it('deleteApplication should DELETE /api/v1/auth/applications/:id/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);
        await apps.deleteApplication('app-1');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/applications/app-1/', {
            method: 'DELETE',
            body: undefined,
        });
    });

    it('regenerateCredentials should POST /api/v1/auth/applications/:id/regenerate/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({
            message: 'Credentials regenerated',
            credentials: { access_key: 'new_key', access_secret: 'new_secret' },
            old_credentials_invalidated: true,
        });
        const result = await apps.regenerateCredentials('app-1');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/applications/app-1/regenerate/', {
            method: 'POST',
            body: { confirmation: 'REGENERATE' },
        });
        expect(result.credentials?.access_secret).toBe('new_secret');
    });
});
