import { TenxyteHttpClient } from '../http/client';
import type { TenxyteUser, PaginatedResponse } from '../types';

export interface UpdateProfileParams {
    first_name?: string;
    last_name?: string;
    [key: string]: any; // Allow custom metadata updates
}

export interface AdminUpdateUserParams {
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
    is_locked?: boolean;
    max_sessions?: number;
    max_devices?: number;
}

export class UserModule {
    constructor(private client: TenxyteHttpClient) { }

    // --- Standard Profile Actions --- //

    /** Retrieve your current comprehensive Profile metadata matching the active network bearer token. */
    async getProfile(): Promise<TenxyteUser> {
        return this.client.get('/api/v1/auth/me/');
    }

    /** Modify your active profile core details or injected application metadata. */
    async updateProfile(data: UpdateProfileParams): Promise<TenxyteUser> {
        return this.client.patch('/api/v1/auth/me/', data);
    }

    /**
     * Upload an avatar using FormData.
     * Ensure the environment supports FormData (browser or Node.js v18+).
     * @param formData The FormData object containing the 'avatar' field.
     */
    async uploadAvatar(formData: FormData): Promise<TenxyteUser> {
        return this.client.patch('/api/v1/auth/me/', formData);
    }

    /**
     * @deprecated Use `gdpr.requestAccountDeletion()` instead. This proxy will be removed in a future release.
     * Trigger self-deletion of an entire account data boundary.
     * @param password - Requires the active system password as destructive proof of intent.
     * @param otpCode - (Optional) If an OTP was queried prior to attempting account deletion.
     */
    async deleteAccount(password: string, otpCode?: string): Promise<void> {
        return this.client.post<void>('/api/v1/auth/request-account-deletion/', {
            password,
            otp_code: otpCode
        });
    }

    /**
     * Retrieve the roles and permissions of the currently authenticated user.
     * @returns An object containing `roles[]` and `permissions[]`.
     */
    async getMyRoles(): Promise<{ roles: any[]; permissions: any[]; [key: string]: unknown }> {
        return this.client.get('/api/v1/auth/me/roles/');
    }

    // --- Admin Actions Mapping --- //

    /** (Admin only) Lists users paginated matching criteria. */
    async listUsers(params?: Record<string, any>): Promise<PaginatedResponse<TenxyteUser>> {
        return this.client.get<PaginatedResponse<TenxyteUser>>('/api/v1/auth/admin/users/', { params });
    }

    /** (Admin only) Gets deterministic data related to a remote unassociated user. */
    async getUser(userId: string): Promise<TenxyteUser> {
        return this.client.get(`/api/v1/auth/admin/users/${userId}/`);
    }

    /** (Admin only) Modifies configuration/details or capacity bounds related to a remote unassociated user. */
    async adminUpdateUser(userId: string, data: AdminUpdateUserParams): Promise<TenxyteUser> {
        return this.client.patch(`/api/v1/auth/admin/users/${userId}/`, data);
    }

    /** (Admin only) Force obliterate a User boundary. Can affect relational database stability if not bound carefully. */
    async adminDeleteUser(userId: string): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/admin/users/${userId}/`);
    }

    /** (Admin only) Apply a permanent suspension / ban state globally on a user token footprint. */
    async banUser(userId: string, reason: string = ''): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/admin/users/${userId}/ban/`, { reason });
    }

    /** (Admin only) Recover a user footprint from a global ban state. */
    async unbanUser(userId: string): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/admin/users/${userId}/unban/`);
    }

    /** (Admin only) Apply a temporary lock bounding block on a user interaction footprint. */
    async lockUser(userId: string, durationMinutes: number = 30, reason: string = ''): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/admin/users/${userId}/lock/`, { duration_minutes: durationMinutes, reason });
    }

    /** (Admin only) Releases an arbitrary temporary system lock placed on a user bounds. */
    async unlockUser(userId: string): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/admin/users/${userId}/unlock/`);
    }
}
