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

    it('getMyRoles should GET /api/v1/auth/me/roles/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ roles: ['admin'], permissions: ['users.view'] });
        const result = await user.getMyRoles();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/me/roles/', { method: 'GET' });
        expect(result.roles).toEqual(['admin']);
    });

    it('getUser should GET /api/v1/auth/admin/users/{id}/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ id: 'user-1', email: 'test@test.com' });
        const result = await user.getUser('user-1');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/users/user-1/', { method: 'GET' });
        expect(result.email).toBe('test@test.com');
    });

    it('adminUpdateUser should PATCH /api/v1/auth/admin/users/{id}/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ id: 'user-1', first_name: 'Updated' });
        const result = await user.adminUpdateUser('user-1', { first_name: 'Updated' });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/users/user-1/', {
            method: 'PATCH',
            body: { first_name: 'Updated' },
        });
    });

    it('adminDeleteUser should DELETE /api/v1/auth/admin/users/{id}/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);
        await user.adminDeleteUser('user-1');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/users/user-1/', {
            method: 'DELETE',
            body: undefined,
        });
    });
});
