import { TenxyteHttpClient } from '../http/client';
import { Organization, PaginatedResponse } from '../types';

export interface OrgMembership {
    id: number;
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: { code: string; name: string };
    joined_at: string;
}

export interface OrgTreeNode {
    id: number;
    name: string;
    slug: string;
    children: OrgTreeNode[];
}

export class B2bModule {
    private currentOrgSlug: string | null = null;

    constructor(private client: TenxyteHttpClient) {
        // Register an interceptor to auto-inject the X-Org-Slug header
        this.client.addRequestInterceptor((config) => {
            if (this.currentOrgSlug) {
                config.headers = {
                    ...config.headers,
                    'X-Org-Slug': this.currentOrgSlug,
                };
            }
            return config;
        });
    }

    // ─── Context Management ───

    switchOrganization(slug: string): void {
        this.currentOrgSlug = slug;
    }

    clearOrganization(): void {
        this.currentOrgSlug = null;
    }

    getCurrentOrganizationSlug(): string | null {
        return this.currentOrgSlug;
    }

    // ─── Organizations CRUD ───

    async createOrganization(data: {
        name: string;
        slug?: string;
        description?: string;
        parent_id?: number;
        metadata?: Record<string, unknown>;
        max_members?: number;
    }): Promise<Organization> {
        return this.client.post('/api/v1/auth/organizations/', data);
    }

    async listMyOrganizations(params?: {
        search?: string;
        is_active?: boolean;
        parent?: string;
        ordering?: string;
        page?: number;
        page_size?: number;
    }): Promise<PaginatedResponse<Organization>> {
        return this.client.get('/api/v1/auth/organizations/', { params });
    }

    async getOrganization(slug: string): Promise<Organization> {
        return this.client.get(`/api/v1/auth/organizations/${slug}/`);
    }

    async updateOrganization(slug: string, data: Partial<{
        name: string;
        slug: string;
        description: string;
        parent_id: number | null;
        metadata: Record<string, unknown>;
        max_members: number;
        is_active: boolean;
    }>): Promise<Organization> {
        return this.client.patch(`/api/v1/auth/organizations/${slug}/`, data);
    }

    async deleteOrganization(slug: string): Promise<{ message: string }> {
        return this.client.delete(`/api/v1/auth/organizations/${slug}/`);
    }

    async getOrganizationTree(slug: string): Promise<OrgTreeNode> {
        return this.client.get(`/api/v1/auth/organizations/${slug}/tree/`);
    }

    // ─── Member Management ───

    async listMembers(slug: string, params?: {
        search?: string;
        role?: 'owner' | 'admin' | 'member';
        status?: 'active' | 'inactive' | 'pending';
        ordering?: string;
        page?: number;
        page_size?: number;
    }): Promise<PaginatedResponse<OrgMembership>> {
        return this.client.get(`/api/v1/auth/organizations/${slug}/members/`, { params });
    }

    async addMember(slug: string, data: {
        user_id: number;
        role_code: string;
    }): Promise<OrgMembership> {
        return this.client.post(`/api/v1/auth/organizations/${slug}/members/`, data);
    }

    async updateMemberRole(slug: string, userId: number, roleCode: string): Promise<OrgMembership> {
        return this.client.patch(`/api/v1/auth/organizations/${slug}/members/${userId}/`, { role_code: roleCode });
    }

    async removeMember(slug: string, userId: number): Promise<{ message: string }> {
        return this.client.delete(`/api/v1/auth/organizations/${slug}/members/${userId}/`);
    }

    // ─── Invitations ───

    async inviteMember(slug: string, data: {
        email: string;
        role_code: string;
        expires_in_days?: number;
    }): Promise<{
        id: number;
        email: string;
        role: string;
        token: string;
        expires_at: string;
        invited_by: { id: number; email: string };
        organization: { id: number; name: string; slug: string };
    }> {
        return this.client.post(`/api/v1/auth/organizations/${slug}/invitations/`, data);
    }

    async listOrgRoles(): Promise<Array<{
        code: string;
        name: string;
        description: string;
        weight: number;
        permissions: Array<{ code: string; name: string; description: string }>;
        is_system_role: boolean;
        created_at: string;
    }>> {
        return this.client.get('/api/v1/auth/organizations/roles/');
    }
}
