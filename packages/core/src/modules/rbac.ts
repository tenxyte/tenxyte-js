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
     * Cache a token to use for parameter-less synchronous checks.
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

    hasRole(role: string, token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.roles) return false;
        return decoded.roles.includes(role);
    }

    hasAnyRole(roles: string[], token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.roles) return false;
        return roles.some(r => decoded.roles!.includes(r));
    }

    hasAllRoles(roles: string[], token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.roles) return false;
        return roles.every(r => decoded.roles!.includes(r));
    }

    hasPermission(permission: string, token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.permissions) return false;
        // Check exact match or wildcard, assuming backend handles wildcard expansion in JWT
        return decoded.permissions.includes(permission);
    }

    hasAnyPermission(permissions: string[], token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.permissions) return false;
        return permissions.some(p => decoded.permissions!.includes(p));
    }

    hasAllPermissions(permissions: string[], token?: string): boolean {
        const decoded = this.getDecodedToken(token);
        if (!decoded?.permissions) return false;
        return permissions.every(p => decoded.permissions!.includes(p));
    }

    // --- Roles CRUD --- //

    async listRoles(): Promise<Role[]> {
        return this.client.get<Role[]>('/api/v1/auth/roles/');
    }

    async createRole(data: { name: string; description?: string; permission_codes?: string[]; is_default?: boolean }): Promise<Role> {
        return this.client.post<Role>('/api/v1/auth/roles/', data);
    }

    async getRole(roleId: string): Promise<Role> {
        return this.client.get<Role>(`/api/v1/auth/roles/${roleId}/`);
    }

    async updateRole(roleId: string, data: { name?: string; description?: string; permission_codes?: string[]; is_default?: boolean }): Promise<Role> {
        return this.client.put<Role>(`/api/v1/auth/roles/${roleId}/`, data);
    }

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

    async listPermissions(): Promise<Permission[]> {
        return this.client.get<Permission[]>('/api/v1/auth/permissions/');
    }

    async createPermission(data: { code: string; name: string; description?: string; parent_code?: string }): Promise<Permission> {
        return this.client.post<Permission>('/api/v1/auth/permissions/', data);
    }

    async getPermission(permissionId: string): Promise<Permission> {
        return this.client.get<Permission>(`/api/v1/auth/permissions/${permissionId}/`);
    }

    async updatePermission(permissionId: string, data: { name?: string; description?: string }): Promise<Permission> {
        return this.client.put<Permission>(`/api/v1/auth/permissions/${permissionId}/`, data);
    }

    async deletePermission(permissionId: string): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/permissions/${permissionId}/`);
    }

    // --- Direct Assignment (Users) --- //

    async assignRoleToUser(userId: string, roleCode: string): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/users/${userId}/roles/`, { role_code: roleCode });
    }

    async removeRoleFromUser(userId: string, roleCode: string): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/users/${userId}/roles/`, {
            params: { role_code: roleCode }
        });
    }

    async assignPermissionsToUser(userId: string, permissionCodes: string[]): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/users/${userId}/permissions/`, { permission_codes: permissionCodes });
    }

    async removePermissionsFromUser(userId: string, permissionCodes: string[]): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/users/${userId}/permissions/`, {
            body: { permission_codes: permissionCodes }
        } as any);
    }
}
