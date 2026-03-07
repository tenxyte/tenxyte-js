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

    /**
     * Set the active Organization context.
     * Subsequent API requests will automatically include the `X-Org-Slug` header.
     * @param slug - The unique string identifier of the organization.
     */
    switchOrganization(slug: string): void {
        this.currentOrgSlug = slug;
    }

    /**
     * Clear the active Organization context, dropping the `X-Org-Slug` header for standard User operations.
     */
    clearOrganization(): void {
        this.currentOrgSlug = null;
    }

    /** Get the currently active Organization slug context if set. */
    getCurrentOrganizationSlug(): string | null {
        return this.currentOrgSlug;
    }

    // ─── Organizations CRUD ───

    /** Create a new top-level or child Organization in the backend. */
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

    /** List organizations the currently authenticated user belongs to. */
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

    /** Retrieve details about a specific organization by slug. */
    async getOrganization(slug: string): Promise<Organization> {
        return this.client.get(`/api/v1/auth/organizations/${slug}/`);
    }

    /** Update configuration and metadata of an Organization. */
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

    /** Permanently delete an Organization. */
    async deleteOrganization(slug: string): Promise<{ message: string }> {
        return this.client.delete(`/api/v1/auth/organizations/${slug}/`);
    }

    /** Retrieve the topology subtree extending downward from this point. */
    async getOrganizationTree(slug: string): Promise<OrgTreeNode> {
        return this.client.get(`/api/v1/auth/organizations/${slug}/tree/`);
    }

    // ─── Member Management ───

    /** List users bound to a specific Organization. */
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

    /** Add a user directly into an Organization with a designated role. */
    async addMember(slug: string, data: {
        user_id: number;
        role_code: string;
    }): Promise<OrgMembership> {
        return this.client.post(`/api/v1/auth/organizations/${slug}/members/`, data);
    }

    /** Evolve or demote an existing member's role within the Organization. */
    async updateMemberRole(slug: string, userId: number, roleCode: string): Promise<OrgMembership> {
        return this.client.patch(`/api/v1/auth/organizations/${slug}/members/${userId}/`, { role_code: roleCode });
    }

    /** Kick a user out of the Organization. */
    async removeMember(slug: string, userId: number): Promise<{ message: string }> {
        return this.client.delete(`/api/v1/auth/organizations/${slug}/members/${userId}/`);
    }

    // ─── Invitations ───

    /** Send an onboarding email invitation to join an Organization. */
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

    /** Fetch a definition matrix of what Organization-level roles can be assigned. */
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
