import { useCallback } from 'react';
import type { DecodedTenxyteToken } from '@tenxyte/core';
import { useTenxyteClient } from './context';
import { useTenxyteState } from './provider';

// ─── useAuth ───

export interface UseAuthReturn {
    /** Whether the user has a valid, non-expired access token. */
    isAuthenticated: boolean;
    /** Whether the initial state is still loading from storage. */
    loading: boolean;
    /** Raw access token string, or null. */
    accessToken: string | null;
    /** Login with email/password. Triggers re-render on success. */
    loginWithEmail: (data: { email: string; password: string; device_info?: string; totp_code?: string }) => Promise<void>;
    /** Login with phone/password. */
    loginWithPhone: (data: { phone_country_code: string; phone_number: string; password: string; device_info?: string }) => Promise<void>;
    /** Logout from all sessions. */
    logout: () => Promise<void>;
    /** Register a new account. */
    register: (data: Record<string, unknown>) => Promise<void>;
}

/**
 * Reactive authentication hook.
 * Automatically re-renders when the auth state changes (login, logout, refresh, expiry).
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *     const { isAuthenticated, loginWithEmail, logout, loading } = useAuth();
 *
 *     if (loading) return <p>Loading...</p>;
 *     if (isAuthenticated) return <button onClick={logout}>Logout</button>;
 *
 *     return <button onClick={() => loginWithEmail({ email: '...', password: '...' })}>Login</button>;
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
    const client = useTenxyteClient();
    const { isAuthenticated, loading, accessToken } = useTenxyteState();

    const loginWithEmail = useCallback(
        async (data: { email: string; password: string; device_info?: string; totp_code?: string }) => {
            await client.auth.loginWithEmail({ ...data, device_info: data.device_info ?? '' });
        },
        [client],
    );

    const loginWithPhone = useCallback(
        async (data: { phone_country_code: string; phone_number: string; password: string; device_info?: string }) => {
            await client.auth.loginWithPhone({ ...data, device_info: data.device_info ?? '' });
        },
        [client],
    );

    const logout = useCallback(async () => {
        await client.auth.logoutAll();
    }, [client]);

    const register = useCallback(
        async (data: Record<string, unknown>) => {
            await client.auth.register(data as any);
        },
        [client],
    );

    return { isAuthenticated, loading, accessToken, loginWithEmail, loginWithPhone, logout, register };
}

// ─── useUser ───

export interface UseUserReturn {
    /** Decoded JWT payload of the current access token, or null. */
    user: DecodedTenxyteToken | null;
    /** Whether the initial state is still loading. */
    loading: boolean;
    /** Fetch the full user profile from the backend. */
    getProfile: () => ReturnType<typeof import('@tenxyte/core').TenxyteClient.prototype.user.getProfile>;
    /** Update the current user's profile. */
    updateProfile: (data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Reactive user hook.
 * Returns the decoded JWT user and convenience methods for profile management.
 *
 * @example
 * ```tsx
 * function UserBadge() {
 *     const { user, loading } = useUser();
 *     if (loading || !user) return null;
 *     return <span>{user.email}</span>;
 * }
 * ```
 */
export function useUser(): UseUserReturn {
    const client = useTenxyteClient();
    const { user, loading } = useTenxyteState();

    const getProfile = useCallback(() => client.user.getProfile(), [client]);

    const updateProfile = useCallback(
        (data: Record<string, unknown>) => client.user.updateProfile(data),
        [client],
    );

    return { user, loading, getProfile, updateProfile };
}

// ─── useOrganization ───

export interface UseOrganizationReturn {
    /** Currently active organization slug, or null. */
    activeOrg: string | null;
    /** Switch the SDK to operate within an organization context. */
    switchOrganization: (slug: string) => void;
    /** Clear the organization context. */
    clearOrganization: () => void;
}

/**
 * Reactive organization context hook.
 * Returns the current org slug and methods to switch/clear context.
 *
 * @example
 * ```tsx
 * function OrgSwitcher({ orgs }) {
 *     const { activeOrg, switchOrganization, clearOrganization } = useOrganization();
 *     return (
 *         <select value={activeOrg ?? ''} onChange={(e) =>
 *             e.target.value ? switchOrganization(e.target.value) : clearOrganization()
 *         }>
 *             <option value="">No org</option>
 *             {orgs.map(o => <option key={o.slug} value={o.slug}>{o.name}</option>)}
 *         </select>
 *     );
 * }
 * ```
 */
export function useOrganization(): UseOrganizationReturn {
    const client = useTenxyteClient();
    const { activeOrg } = useTenxyteState();

    const switchOrganization = useCallback(
        (slug: string) => { client.b2b.switchOrganization(slug); },
        [client],
    );

    const clearOrganization = useCallback(
        () => { client.b2b.clearOrganization(); },
        [client],
    );

    return { activeOrg, switchOrganization, clearOrganization };
}

// ─── useRbac ───

export interface UseRbacReturn {
    /** Check if the current user has a specific role (synchronous JWT check). */
    hasRole: (role: string) => boolean;
    /** Check if the current user has a specific permission (synchronous JWT check). */
    hasPermission: (permission: string) => boolean;
    /** Check if the current user has any of the given roles. */
    hasAnyRole: (roles: string[]) => boolean;
    /** Check if the current user has all of the given roles. */
    hasAllRoles: (roles: string[]) => boolean;
}

/**
 * Reactive RBAC hook.
 * Provides synchronous role/permission checks based on the current JWT.
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *     const { hasRole } = useRbac();
 *     if (!hasRole('admin')) return <p>Access denied</p>;
 *     return <AdminDashboard />;
 * }
 * ```
 */
export function useRbac(): UseRbacReturn {
    const client = useTenxyteClient();
    const { accessToken } = useTenxyteState();

    const hasRole = useCallback(
        (role: string) => client.rbac.hasRole(role, accessToken ?? undefined),
        [client, accessToken],
    );

    const hasPermission = useCallback(
        (permission: string) => client.rbac.hasPermission(permission, accessToken ?? undefined),
        [client, accessToken],
    );

    const hasAnyRole = useCallback(
        (roles: string[]) => client.rbac.hasAnyRole(roles, accessToken ?? undefined),
        [client, accessToken],
    );

    const hasAllRoles = useCallback(
        (roles: string[]) => client.rbac.hasAllRoles(roles, accessToken ?? undefined),
        [client, accessToken],
    );

    return { hasRole, hasPermission, hasAnyRole, hasAllRoles };
}
