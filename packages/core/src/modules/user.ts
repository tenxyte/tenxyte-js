import { TenxyteHttpClient } from '../http/client';

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

    async getProfile(): Promise<any> {
        return this.client.get('/api/v1/auth/me/');
    }

    async updateProfile(data: UpdateProfileParams): Promise<any> {
        return this.client.patch('/api/v1/auth/me/', data);
    }

    /**
     * Upload an avatar using FormData.
     * Ensure the environment supports FormData (browser or Node.js v18+).
     * @param formData The FormData object containing the 'avatar' field.
     */
    async uploadAvatar(formData: FormData): Promise<any> {
        return this.client.patch('/api/v1/auth/me/', formData);
    }

    async deleteAccount(password: string, otpCode?: string): Promise<void> {
        return this.client.post<void>('/api/v1/auth/request-account-deletion/', {
            password,
            otp_code: otpCode
        });
    }

    // --- Admin Actions Mapping --- //

    async listUsers(params?: Record<string, any>): Promise<any[]> {
        return this.client.get<any[]>('/api/v1/auth/admin/users/', { params });
    }

    async getUser(userId: string): Promise<any> {
        return this.client.get(`/api/v1/auth/admin/users/${userId}/`);
    }

    async adminUpdateUser(userId: string, data: AdminUpdateUserParams): Promise<any> {
        return this.client.patch(`/api/v1/auth/admin/users/${userId}/`, data);
    }

    async adminDeleteUser(userId: string): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/admin/users/${userId}/`);
    }

    async banUser(userId: string, reason: string = ''): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/admin/users/${userId}/ban/`, { reason });
    }

    async unbanUser(userId: string): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/admin/users/${userId}/unban/`);
    }

    async lockUser(userId: string, durationMinutes: number = 30, reason: string = ''): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/admin/users/${userId}/lock/`, { duration_minutes: durationMinutes, reason });
    }

    async unlockUser(userId: string): Promise<void> {
        return this.client.post<void>(`/api/v1/auth/admin/users/${userId}/unlock/`);
    }
}
