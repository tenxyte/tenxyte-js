import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserModule } from '../../src/modules/user';
import { TenxyteHttpClient } from '../../src/http/client';

describe('UserModule', () => {
    let client: TenxyteHttpClient;
    let user: UserModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        user = new UserModule(client);
        vi.spyOn(client, 'request').mockImplementation(async () => {
            return {};
        });
    });

    // --- Profile ---
    it('getProfile should GET /api/v1/auth/me/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ id: 'me' });
        const result = await user.getProfile();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/me/', { method: 'GET' });
        expect(result.id).toBe('me');
    });

    it('updateProfile should PATCH /api/v1/auth/me/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ id: 'me' });
        const data = { first_name: 'John' };
        await user.updateProfile(data);
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/me/', {
            method: 'PATCH',
            body: data,
        });
    });

    it('uploadAvatar should PATCH /api/v1/auth/me/ with FormData', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);

        // Mock global FormData if not in purely browser environment
        const FormDataMock = class { append() { } };
        const formData = new FormDataMock() as any;

        await user.uploadAvatar(formData);
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/me/', {
            method: 'PATCH',
            body: formData,
        });
    });

    it('deleteAccount should POST to /api/v1/auth/request-account-deletion/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);
        await user.deleteAccount('mypassword', '123456');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/request-account-deletion/', {
            method: 'POST',
            body: { password: 'mypassword', otp_code: '123456' },
        });
    });

    // --- Admin Actions ---
    it('listUsers should GET /api/v1/auth/admin/users/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce([]);
        await user.listUsers({ page: 1 });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/users/', {
            method: 'GET',
            params: { page: 1 },
        });
    });

    it('banUser should POST /api/v1/auth/admin/users/{id}/ban/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);
        await user.banUser('user-1', 'spam');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/users/user-1/ban/', {
            method: 'POST',
            body: { reason: 'spam' },
        });
    });
});
