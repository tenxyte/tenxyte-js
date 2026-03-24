import { TenxyteHttpClient } from '../http/client';
import { decodeJwt, DecodedTenxyteToken } from '../utils/jwt';

export interface Role {
    id: string;
    name: string;
    description?: string;
    is_default?: boolean;
    permissions?: string[];
}

export interface Permission {
    id: string;
    code: string;
    name: string;
    description?: string;
}

export class RbacModule {
    private cachedToken: string | null = null;

    constructor(private client: TenxyteHttpClient) { }

    /**
     * Cache a decoded JWT payload locally to perform parameter-less synchronous permission checks.
     * Usually invoked automatically by the system upon login or token refresh.
     * @param token - The raw JWT access token encoded string.
     */
    setToken(token: string | null) {
        this.cachedToken = token;
    }

    private getDecodedToken(token?: string): DecodedTenxyteToken | null {
        const t = token || this.cachedToken;
        if (!t) return null;
        return decodeJwt(t);
    }

    // --- Synchronous Checks --- //

    /**
     * Synchronously deeply inspects the cached (or provided) JWT to determine if the user has a specific Role.
     * @param role - The exact code name of the Role.
     * @param token - (Optional) Provide a specific token overriding the cached one.
     */
    hasRole(role: string, token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.roles) return false;
        return decoded.roles.includes(role);
    }

    /**
     * Evaluates if the active session holds AT LEAST ONE of the listed Roles.
     * @param roles - An array of Role codes.
     */
    hasAnyRole(roles: string[], token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.roles) return false;
        return roles.some(r => decoded.roles!.includes(r));
    }

    /**
     * Evaluates if the active session holds ALL of the listed Roles concurrently.
     * @param roles - An array of Role codes.
     */
    hasAllRoles(roles: string[], token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.roles) return false;
        return roles.every(r => decoded.roles!.includes(r));
    }

    /**
     * Synchronously deeply inspects the cached (or provided) JWT to determine if the user has a specific granular Permission.
     * @param permission - The exact code name of the Permission (e.g., 'invoices.read').
     */
    hasPermission(permission: string, token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.permissions) return false;
        return decoded.permissions.includes(permission);
    }

    /**
     * Evaluates if the active session holds AT LEAST ONE of the listed Permissions.
     */
    hasAnyPermission(permissions: string[], token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.permissions) return false;
        return permissions.some(p => decoded.permissions!.includes(p));
    }

    /**
     * Evaluates if the active session holds ALL of the listed Permissions concurrently.
     */
    hasAllPermissions(permissions: string[], token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.permissions) return false;
        return permissions.every(p => decoded.permissions!.includes(p));
    }

    // --- Roles CRUD --- //

    /** Fetch all application global Roles structure */
    async listRoles(): Promise<Role[]> {
        return this.client.get<Role[]>('/api/v1/auth/roles/');
    }

    /** Create a new architectural Role inside Tenxyte */
    async createRole(data: { name: string; description?: string; permission_codes?: string[]; is_default?: boolean }): Promise<Role> {
        return this.client.post<Role>('/api/v1/auth/roles/', data);
    }

    /** Get detailed metadata defining a single bounded Role */
    async getRole(roleId: string): Promise<Role> {
        return this.client.get<Role>(`/api/v1/auth/roles/${roleId}/`);
    }

    /** Modify properties bounding a Role */
    async updateRole(roleId: string, data: { name?: string; description?: string; permission_codes?: string[]; is_default?: boolean }): Promise<Role> {
        return this.client.put<Role>(`/api/v1/auth/roles/${roleId}/`, data);
    }

    /** Unbind and destruct a Role from the global Tenant. (Dangerous, implies cascading permission unbindings) */
    async deleteRole(roleId: string): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/roles/${roleId}/`);
    }

    // --- Role Permissions Management --- //

    async getRolePermissions(roleId: string): Promise<Permission[]> {
        return this.client.get<Permission[]>(`/api/v1/auth/roles/${roleId}/permissions/`);
    }

    async addPermissionsToRole(roleId: string, permission_codes: string[]): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/roles/${roleId}/permissions/`, { permission_codes });
    }

    async removePermissionsFromRole(roleId: string, permission_codes: string[]): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/roles/${roleId}/permissions/`, {
            // Note: DELETE request with body is supported via our fetch wrapper if enabled,
            // or we might need to rely on query strings. The schema specifies body or query.
            // Let's pass it in body via a custom config or URL params.
            body: { permission_codes }
        } as any);
    }

    // --- Permissions CRUD --- //

    /** Enumerates all available fine-grained Permissions inside this Tenant scope. */
    async listPermissions(): Promise<Permission[]> {
        return this.client.get<Permission[]>('/api/v1/auth/permissions/');
    }

    /** Bootstraps a new granular Permission flag (e.g. `billing.refund`). */
    async createPermission(data: { code: string; name: string; description?: string; parent_code?: string }): Promise<Permission> {
        return this.client.post<Permission>('/api/v1/auth/permissions/', data);
    }

    /** Retrieves an existing atomic Permission construct. */
    async getPermission(permissionId: string): Promise<Permission> {
        return this.client.get<Permission>(`/api/v1/auth/permissions/${permissionId}/`);
    }

    /** Edits the human readable description or structural dependencies of a Permission. */
    async updatePermission(permissionId: string, data: { name?: string; description?: string }): Promise<Permission> {
        return this.client.put<Permission>(`/api/v1/auth/permissions/${permissionId}/`, data);
    }

    /** Destroys an atomic Permission permanently. Any Roles referencing it will be stripped of this grant automatically. */
    async deletePermission(permissionId: string): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/permissions/${permissionId}/`);
    }

    // --- Direct Assignment (Users) --- //

    /**
     * Retrieve all roles assigned to a specific user.
     * @param userId - The target user ID.
     */
    async getUserRoles(userId: string): Promise<Record<string, unknown>> {
        return this.client.get<Record<string, unknown>>(`/api/v1/auth/users/${userId}/roles/`);
    }

    /**
     * Retrieve all permissions directly assigned to a specific user (excluding role-based permissions).
     * @param userId - The target user ID.
     */
    async getUserPermissions(userId: string): Promise<Record<string, unknown>> {
        return this.client.get<Record<string, unknown>>(`/api/v1/auth/users/${userId}/permissions/`);
    }

    /**
     * Attach a given Role globally to a user entity.
     * Use sparingly if B2B multi-tenancy contexts are preferred.
     */
    async assignRoleToUser(userId: string, roleCode: string): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/users/${userId}/roles/`, { role_code: roleCode });
    }

    /**
     * Unbind a global Role from a user entity.
     */
    async removeRoleFromUser(userId: string, roleCode: string): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/users/${userId}/roles/`, {
            params: { role_code: roleCode }
        });
    }

    /**
     * Ad-Hoc directly attach specific granular Permissions to a single User, bypassing Role boundaries.
     */
    async assignPermissionsToUser(userId: string, permissionCodes: string[]): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/users/${userId}/permissions/`, { permission_codes: permissionCodes });
    }

    /**
     * Ad-Hoc strip direct granular Permissions bindings from a specific User.
     */
    async removePermissionsFromUser(userId: string, permissionCodes: string[]): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/users/${userId}/permissions/`, {
            body: { permission_codes: permissionCodes }
        } as any);
    }
}
