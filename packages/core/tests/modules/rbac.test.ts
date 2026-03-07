import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RbacModule } from '../../src/modules/rbac';
import { TenxyteHttpClient } from '../../src/http/client';

// Helper to create a dummy JWT for testing
function createDummyJwt(payload: any) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${encodedPayload}.signature`;
}

describe('RbacModule', () => {
    let client: TenxyteHttpClient;
    let rbac: RbacModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        rbac = new RbacModule(client);
        vi.spyOn(client, 'request').mockImplementation(async () => {
            return {};
        });
    });

    describe('Synchronous Decoding & Checks', () => {
        const token = createDummyJwt({
            roles: ['admin', 'manager'],
            permissions: ['users.view', 'users.edit']
        });

        it('hasRole should return true if role exists', () => {
            expect(rbac.hasRole('admin', token)).toBe(true);
            expect(rbac.hasRole('user', token)).toBe(false);
        });

        it('hasAnyRole should return true if any role exists', () => {
            expect(rbac.hasAnyRole(['admin', 'user'], token)).toBe(true);
            expect(rbac.hasAnyRole(['user', 'guest'], token)).toBe(false);
        });

        it('hasAllRoles should return true if all roles exist', () => {
            expect(rbac.hasAllRoles(['admin', 'manager'], token)).toBe(true);
            expect(rbac.hasAllRoles(['admin', 'user'], token)).toBe(false);
        });

        it('hasPermission should return true if permission exists', () => {
            expect(rbac.hasPermission('users.view', token)).toBe(true);
            expect(rbac.hasPermission('users.delete', token)).toBe(false);
        });

        it('setToken should cache the token for parameter-less calls', () => {
            rbac.setToken(token);
            expect(rbac.hasRole('admin')).toBe(true);
            expect(rbac.hasPermission('users.edit')).toBe(true);

            rbac.setToken(null);
            expect(rbac.hasRole('admin')).toBe(false);
        });
    });

    describe('Roles CRUD & Permissions', () => {
        it('listRoles should GET /api/v1/auth/roles/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce([{ id: '1', name: 'admin' }]);
            const result = await rbac.listRoles();
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/roles/', { method: 'GET' });
            expect(result.length).toBe(1);
        });

        it('createRole should POST /api/v1/auth/roles/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ id: '2', name: 'newRole' });
            const data = { name: 'newRole', permission_codes: ['a.b'] };
            await rbac.createRole(data);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/roles/', {
                method: 'POST',
                body: data,
            });
        });

        it('assignRoleToUser should POST to users/{id}/roles/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce(undefined);
            await rbac.assignRoleToUser('user123', 'admin');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/users/user123/roles/', {
                method: 'POST',
                body: { role_code: 'admin' },
            });
        });

        it('removePermissionsFromRole should DELETE with body payload if config allows', async () => {
            vi.mocked(client.request).mockResolvedValueOnce(undefined);
            await rbac.removePermissionsFromRole('role123', ['users.view']);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/roles/role123/permissions/', {
                method: 'DELETE',
                body: { permission_codes: ['users.view'] },
            } as any);
        });
    });
});
