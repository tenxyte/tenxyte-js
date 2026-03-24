import { TenxyteHttpClient } from '../http/client';
import type { PaginatedResponse } from '../types';

/**
 * Represents an application (API client) registered in the Tenxyte platform.
 * The `access_secret` is never returned after creation — only `access_key` is visible.
 */
export interface Application {
    id: string;
    name: string;
    description?: string;
    access_key: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Parameters accepted by `listApplications()`.
 */
export interface ApplicationListParams {
    /** Search within name and description. */
    search?: string;
    /** Filter by active status. */
    is_active?: boolean;
    /** Sort field: `name`, `is_active`, `created_at`, `updated_at`. */
    ordering?: string;
    /** Page number (1-indexed). */
    page?: number;
    /** Items per page (max 100). */
    page_size?: number;
}

/**
 * Body accepted by `createApplication()`.
 */
export interface ApplicationCreateData {
    name: string;
    description?: string;
}

/**
 * Response returned by `createApplication()`.
 * **`client_secret` is only shown once at creation time.**
 */
export interface ApplicationCreateResponse {
    id: number;
    name: string;
    description?: string;
    client_id: string;
    client_secret: string;
    is_active: boolean;
    created_at: string;
    secret_rotation_warning?: string;
}

/**
 * Body accepted by `updateApplication()` (PUT — full replace).
 */
export interface ApplicationUpdateData {
    name?: string;
    description?: string;
    is_active?: boolean;
}

/**
 * Response returned by `regenerateCredentials()`.
 * **`credentials.access_secret` is only shown once.**
 */
export interface ApplicationRegenerateResponse {
    message?: string;
    application?: Record<string, unknown>;
    credentials?: {
        access_key?: string;
        access_secret?: string;
    };
    warning?: string;
    old_credentials_invalidated?: boolean;
}

export class ApplicationsModule {
    constructor(private client: TenxyteHttpClient) {}

    /**
     * List all registered applications (paginated).
     * @param params - Optional filters: `search`, `is_active`, `ordering`, `page`, `page_size`.
     * @returns A paginated list of applications.
     */
    async listApplications(params?: ApplicationListParams): Promise<PaginatedResponse<Application>> {
        return this.client.get<PaginatedResponse<Application>>('/api/v1/auth/applications/', {
            params: params as Record<string, string | number | boolean> | undefined,
        });
    }

    /**
     * Create a new application.
     * @param data - The application name and optional description.
     * @returns The created application including one-time `client_secret`.
     */
    async createApplication(data: ApplicationCreateData): Promise<ApplicationCreateResponse> {
        return this.client.post<ApplicationCreateResponse>('/api/v1/auth/applications/', data);
    }

    /**
     * Get a single application by its ID.
     * @param appId - The application ID.
     * @returns The application details (secret is never included).
     */
    async getApplication(appId: string): Promise<Application> {
        return this.client.get<Application>(`/api/v1/auth/applications/${appId}/`);
    }

    /**
     * Fully update an application (PUT — all fields replaced).
     * @param appId - The application ID.
     * @param data - The full updated application data.
     * @returns The updated application.
     */
    async updateApplication(appId: string, data: ApplicationUpdateData): Promise<Application> {
        return this.client.put<Application>(`/api/v1/auth/applications/${appId}/`, data);
    }

    /**
     * Partially update an application (PATCH — only provided fields are changed).
     * @param appId - The application ID.
     * @param data - The fields to update.
     * @returns The updated application.
     */
    async patchApplication(appId: string, data: Partial<ApplicationUpdateData>): Promise<Application> {
        return this.client.patch<Application>(`/api/v1/auth/applications/${appId}/`, data);
    }

    /**
     * Delete an application permanently.
     * @param appId - The application ID.
     */
    async deleteApplication(appId: string): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/applications/${appId}/`);
    }

    /**
     * Regenerate credentials for an application.
     * **Warning:** Old credentials are immediately invalidated. The new secret is shown only once.
     * @param appId - The application ID.
     * @param confirmation - Must be the string `"REGENERATE"` to confirm the irreversible action.
     * @returns The new credentials (access_key + access_secret shown once).
     */
    async regenerateCredentials(appId: string, confirmation: string = 'REGENERATE'): Promise<ApplicationRegenerateResponse> {
        return this.client.post<ApplicationRegenerateResponse>(`/api/v1/auth/applications/${appId}/regenerate/`, { confirmation });
    }
}
