import { ref, readonly, onMounted, onUnmounted, computed, type Ref, type DeepReadonly } from 'vue';
import type { TenxyteClient, TenxyteClientState, DecodedTenxyteToken } from '@tenxyte/core';
import { useTenxyteClient } from './plugin';

// ─── useAuth ───

export interface UseAuthReturn {
    /** Whether the user has a valid, non-expired access token. */
    isAuthenticated: DeepReadonly<Ref<boolean>>;
    /** Whether the initial state is still loading from storage. */
    loading: DeepReadonly<Ref<boolean>>;
    /** Raw access token string, or null. */
    accessToken: DeepReadonly<Ref<string | null>>;
    /** Login with email/password. */
    loginWithEmail: (data: { email: string; password: string; device_info?: string; totp_code?: string }) => Promise<void>;
    /** Login with phone/password. */
    loginWithPhone: (data: { phone_country_code: string; phone_number: string; password: string; device_info?: string }) => Promise<void>;
    /** Logout from all sessions. */
    logout: () => Promise<void>;
    /** Register a new account. */
    register: (data: Record<string, unknown>) => Promise<void>;
}

/**
 * Reactive authentication composable.
 * Automatically updates when the auth state changes (login, logout, refresh, expiry).
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useAuth } from '@tenxyte/vue';
 * const { isAuthenticated, loginWithEmail, logout, loading } = useAuth();
 * </script>
 *
 * <template>
 *   <p v-if="loading">Loading...</p>
 *   <button v-else-if="isAuthenticated" @click="logout">Logout</button>
 *   <button v-else @click="loginWithEmail({ email: '...', password: '...' })">Login</button>
 * </template>
 * ```
 */
export function useAuth(): UseAuthReturn {
    const client = useTenxyteClient();
    const isAuthenticated = ref(false);
    const loading = ref(true);
    const accessToken = ref<string | null>(null);

    const refresh = async (): Promise<void> => {
        const state = await client.getState();
        isAuthenticated.value = state.isAuthenticated;
        accessToken.value = state.accessToken;
        loading.value = false;
    };

    const unsubs: Array<() => void> = [];

    onMounted(() => {
        refresh();
        unsubs.push(
            client.on('token:stored', () => { refresh(); }),
            client.on('token:refreshed', () => { refresh(); }),
            client.on('session:expired', () => { refresh(); }),
        );
    });

    onUnmounted(() => {
        unsubs.forEach((fn) => fn());
    });

    const loginWithEmail = async (data: { email: string; password: string; device_info?: string; totp_code?: string }): Promise<void> => {
        await client.auth.loginWithEmail({ ...data, device_info: data.device_info ?? '' });
    };

    const loginWithPhone = async (data: { phone_country_code: string; phone_number: string; password: string; device_info?: string }): Promise<void> => {
        await client.auth.loginWithPhone({ ...data, device_info: data.device_info ?? '' });
    };

    const logout = async (): Promise<void> => {
        await client.auth.logoutAll();
    };

    const register = async (data: Record<string, unknown>): Promise<void> => {
        await client.auth.register(data as any);
    };

    return {
        isAuthenticated: readonly(isAuthenticated),
        loading: readonly(loading),
        accessToken: readonly(accessToken),
        loginWithEmail,
        loginWithPhone,
        logout,
        register,
    };
}

// ─── useUser ───

export interface UseUserReturn {
    /** Decoded JWT payload of the current access token, or null. */
    user: DeepReadonly<Ref<DecodedTenxyteToken | null>>;
    /** Whether the initial state is still loading. */
    loading: DeepReadonly<Ref<boolean>>;
    /** Fetch the full user profile from the backend. */
    getProfile: () => ReturnType<TenxyteClient['user']['getProfile']>;
    /** Update the current user's profile. */
    updateProfile: (data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Reactive user composable.
 * Returns the decoded JWT user and convenience methods for profile management.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useUser } from '@tenxyte/vue';
 * const { user, loading } = useUser();
 * </script>
 *
 * <template>
 *   <span v-if="!loading && user">{{ user.email }}</span>
 * </template>
 * ```
 */
export function useUser(): UseUserReturn {
    const client = useTenxyteClient();
    const user = ref<DecodedTenxyteToken | null>(null);
    const loading = ref(true);

    const refresh = async (): Promise<void> => {
        const state = await client.getState();
        user.value = state.user;
        loading.value = false;
    };

    const unsubs: Array<() => void> = [];

    onMounted(() => {
        refresh();
        unsubs.push(
            client.on('token:stored', () => { refresh(); }),
            client.on('token:refreshed', () => { refresh(); }),
            client.on('session:expired', () => { refresh(); }),
        );
    });

    onUnmounted(() => {
        unsubs.forEach((fn) => fn());
    });

    const getProfile = () => client.user.getProfile();
    const updateProfile = (data: Record<string, unknown>) => client.user.updateProfile(data);

    return {
        user: readonly(user) as DeepReadonly<Ref<DecodedTenxyteToken | null>>,
        loading: readonly(loading),
        getProfile,
        updateProfile,
    };
}

// ─── useOrganization ───

export interface UseOrganizationReturn {
    /** Currently active organization slug, or null. */
    activeOrg: DeepReadonly<Ref<string | null>>;
    /** Switch the SDK to operate within an organization context. */
    switchOrganization: (slug: string) => void;
    /** Clear the organization context. */
    clearOrganization: () => void;
}

/**
 * Reactive organization context composable.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useOrganization } from '@tenxyte/vue';
 * const { activeOrg, switchOrganization, clearOrganization } = useOrganization();
 * </script>
 * ```
 */
export function useOrganization(): UseOrganizationReturn {
    const client = useTenxyteClient();
    const activeOrg = ref<string | null>(null);

    const refresh = async (): Promise<void> => {
        const state = await client.getState();
        activeOrg.value = state.activeOrg;
    };

    onMounted(() => { refresh(); });

    const switchOrganization = (slug: string): void => {
        client.b2b.switchOrganization(slug);
        activeOrg.value = slug;
    };

    const clearOrganization = (): void => {
        client.b2b.clearOrganization();
        activeOrg.value = null;
    };

    return {
        activeOrg: readonly(activeOrg),
        switchOrganization,
        clearOrganization,
    };
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
 * Reactive RBAC composable.
 * Provides synchronous role/permission checks based on the current JWT.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useRbac } from '@tenxyte/vue';
 * const { hasRole } = useRbac();
 * </script>
 *
 * <template>
 *   <AdminPanel v-if="hasRole('admin')" />
 *   <p v-else>Access denied</p>
 * </template>
 * ```
 */
export function useRbac(): UseRbacReturn {
    const client = useTenxyteClient();
    const token = ref<string | null>(null);

    const refresh = async (): Promise<void> => {
        token.value = await client.getAccessToken();
    };

    const unsubs: Array<() => void> = [];

    onMounted(() => {
        refresh();
        unsubs.push(
            client.on('token:stored', () => { refresh(); }),
            client.on('token:refreshed', () => { refresh(); }),
            client.on('session:expired', () => { refresh(); }),
        );
    });

    onUnmounted(() => {
        unsubs.forEach((fn) => fn());
    });

    const hasRole = (role: string): boolean =>
        client.rbac.hasRole(role, token.value ?? undefined);

    const hasPermission = (permission: string): boolean =>
        client.rbac.hasPermission(permission, token.value ?? undefined);

    const hasAnyRole = (roles: string[]): boolean =>
        client.rbac.hasAnyRole(roles, token.value ?? undefined);

    const hasAllRoles = (roles: string[]): boolean =>
        client.rbac.hasAllRoles(roles, token.value ?? undefined);

    return { hasRole, hasPermission, hasAnyRole, hasAllRoles };
}
