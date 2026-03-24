import { describe, it, expect, vi, beforeEach } from 'vitest';
import { B2bModule } from '../../src/modules/b2b';
import { TenxyteHttpClient } from '../../src/http/client';

describe('B2bModule', () => {
    let client: TenxyteHttpClient;
    let b2b: B2bModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        b2b = new B2bModule(client);
        vi.spyOn(client, 'request').mockImplementation(async () => ({}));
    });

    // ─── Context Management ───

    describe('Context Management', () => {
        it('switchOrganization should set the current org slug', () => {
            b2b.switchOrganization('acme');
            expect(b2b.getCurrentOrganizationSlug()).toBe('acme');
        });

        it('clearOrganization should reset the current org slug', () => {
            b2b.switchOrganization('acme');
            b2b.clearOrganization();
            expect(b2b.getCurrentOrganizationSlug()).toBeNull();
        });

        it('getCurrentOrganizationSlug should return null by default', () => {
            expect(b2b.getCurrentOrganizationSlug()).toBeNull();
        });
    });

    // ─── Organizations CRUD ───

    describe('Organizations CRUD', () => {
        it('createOrganization should POST /api/v1/auth/organizations/', async () => {
            const data = { name: 'Acme Corp', slug: 'acme' };
            vi.mocked(client.request).mockResolvedValueOnce({ id: 1, name: 'Acme Corp', slug: 'acme' });
            const result = await b2b.createOrganization(data);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/', {
                method: 'POST',
                body: data,
            });
            expect(result.name).toBe('Acme Corp');
        });

        it('listMyOrganizations should GET /api/v1/auth/organizations/ with params', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ count: 0, results: [] });
            await b2b.listMyOrganizations({ page: 1, page_size: 10 });
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/', {
                method: 'GET',
                params: { page: 1, page_size: 10 },
            });
        });

        it('getOrganization should GET /api/v1/auth/organizations/:slug/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ id: 1, slug: 'acme' });
            const result = await b2b.getOrganization('acme');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/acme/', { method: 'GET' });
            expect(result.slug).toBe('acme');
        });

        it('updateOrganization should PATCH /api/v1/auth/organizations/:slug/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ id: 1, name: 'Updated' });
            await b2b.updateOrganization('acme', { name: 'Updated' });
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/acme/', {
                method: 'PATCH',
                body: { name: 'Updated' },
            });
        });

        it('deleteOrganization should DELETE /api/v1/auth/organizations/:slug/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ message: 'Deleted' });
            const result = await b2b.deleteOrganization('acme');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/acme/', {
                method: 'DELETE',
                body: undefined,
            });
            expect(result.message).toBe('Deleted');
        });

        it('getOrganizationTree should GET /api/v1/auth/organizations/:slug/tree/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ id: 1, name: 'Acme', slug: 'acme', children: [] });
            await b2b.getOrganizationTree('acme');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/acme/tree/', { method: 'GET' });
        });
    });

    // ─── Members ───

    describe('Member Management', () => {
        it('listMembers should GET /api/v1/auth/organizations/:slug/members/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ count: 1, results: [{ id: 1 }] });
            await b2b.listMembers('acme', { role: 'admin' });
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/acme/members/', {
                method: 'GET',
                params: { role: 'admin' },
            });
        });

        it('addMember should POST /api/v1/auth/organizations/:slug/members/', async () => {
            const data = { user_id: 42, role_code: 'member' };
            vi.mocked(client.request).mockResolvedValueOnce({ id: 1, ...data });
            await b2b.addMember('acme', data);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/acme/members/', {
                method: 'POST',
                body: data,
            });
        });

        it('updateMemberRole should PATCH /api/v1/auth/organizations/:slug/members/:userId/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ id: 1, role: { code: 'admin' } });
            await b2b.updateMemberRole('acme', 42, 'admin');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/acme/members/42/', {
                method: 'PATCH',
                body: { role_code: 'admin' },
            });
        });

        it('removeMember should DELETE /api/v1/auth/organizations/:slug/members/:userId/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ message: 'Removed' });
            await b2b.removeMember('acme', 42);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/acme/members/42/', {
                method: 'DELETE',
                body: undefined,
            });
        });
    });

    // ─── Invitations ───

    describe('Invitations', () => {
        it('inviteMember should POST /api/v1/auth/organizations/:slug/invitations/', async () => {
            const data = { email: 'new@acme.com', role_code: 'member' };
            vi.mocked(client.request).mockResolvedValueOnce({ id: 1, email: 'new@acme.com' });
            await b2b.inviteMember('acme', data);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/acme/invitations/', {
                method: 'POST',
                body: data,
            });
        });

        it('listOrgRoles should GET /api/v1/auth/organizations/roles/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce([{ code: 'owner' }]);
            const roles = await b2b.listOrgRoles();
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/organizations/roles/', { method: 'GET' });
            expect(roles).toHaveLength(1);
        });
    });
});
