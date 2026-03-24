import { TenxyteHttpClient } from '../http/client';
import type { PaginatedResponse } from '../types';

// ─── Request body types ───

/** Body accepted by `requestAccountDeletion()`. */
export interface AccountDeletionRequestData {
    /** Current password (required for confirmation). */
    password: string;
    /** 6-digit OTP code (required if 2FA is enabled). */
    otp_code?: string;
    /** Optional reason for the deletion request. */
    reason?: string;
}

// ─── Response types ───

/** Response returned by `requestAccountDeletion()`. */
export interface AccountDeletionRequestResponse {
    message?: string;
    deletion_request_id?: number;
    scheduled_deletion_date?: string;
    grace_period_days?: number;
    cancellation_token?: string;
    data_retention_policy?: {
        anonymization_after?: string;
        final_deletion_after?: string;
    };
}

/** Response returned by `confirmAccountDeletion()`. */
export interface AccountDeletionConfirmResponse {
    message?: string;
    deletion_confirmed?: boolean;
    grace_period_ends?: string;
    cancellation_instructions?: string;
}

/** Response returned by `cancelAccountDeletion()`. */
export interface AccountDeletionCancelResponse {
    message?: string;
    deletion_cancelled?: boolean;
    account_reactivated?: boolean;
    cancellation_time?: string;
    security_note?: string;
}

/**
 * Deletion status for the current user.
 * The shape is not strictly defined by the API schema — it returns a generic object.
 */
export type DeletionStatus = Record<string, unknown>;

/** Response returned by `exportUserData()`. */
export interface UserDataExport {
    user_info?: Record<string, unknown>;
    roles?: unknown[];
    permissions?: unknown[];
    applications?: unknown[];
    audit_logs?: unknown[];
    export_metadata?: Record<string, unknown>;
}

// ─── Admin entity types ───

/** Possible statuses for a deletion request. */
export type DeletionRequestStatus = 'pending' | 'confirmation_sent' | 'confirmed' | 'completed' | 'cancelled';

/** A GDPR account deletion request (admin view). */
export interface DeletionRequest {
    id: string;
    user: number;
    user_email: string;
    status?: DeletionRequestStatus;
    requested_at: string;
    confirmed_at?: string | null;
    grace_period_ends_at?: string | null;
    completed_at?: string | null;
    ip_address?: string | null;
    reason?: string;
    admin_notes?: string;
    processed_by?: number | null;
    processed_by_email: string;
    is_grace_period_expired: string;
}

/** Parameters accepted by `listDeletionRequests()`. */
export interface DeletionRequestListParams {
    /** Filter by user ID. */
    user_id?: number;
    /** Filter by request status. */
    status?: DeletionRequestStatus;
    /** After date (YYYY-MM-DD). */
    date_from?: string;
    /** Before date (YYYY-MM-DD). */
    date_to?: string;
    /** Filter requests whose grace period expires within 7 days. */
    grace_period_expiring?: boolean;
    /** Sort field: `requested_at`, `confirmed_at`, `grace_period_ends_at`, `user__email`. */
    ordering?: string;
    /** Page number (1-indexed). */
    page?: number;
    /** Items per page (max 100). */
    page_size?: number;
}

/** Body accepted by `processDeletionRequest()`. */
export interface ProcessDeletionRequestData {
    /** Must be `"PERMANENTLY DELETE"` to confirm the irreversible action. */
    confirmation: string;
    /** Optional admin notes. */
    admin_notes?: string;
}

/** Response returned by `processDeletionRequest()`. */
export interface ProcessDeletionResponse {
    message?: string;
    deletion_completed?: boolean;
    processed_at?: string;
    data_anonymized?: boolean;
    audit_log_id?: number;
    user_notified?: boolean;
}

/** Response returned by `processExpiredDeletions()`. */
export interface ProcessExpiredDeletionsResponse {
    message?: string;
    processed_count?: number;
    failed_count?: number;
    skipped_count?: number;
    processing_time?: number;
    details?: {
        request_id?: number;
        user_email?: string;
        status?: string;
        grace_period_expired?: string;
    }[];
}

// ─── Module ───

export class GdprModule {
    constructor(private client: TenxyteHttpClient) {}

    // ─── User-facing ───

    /**
     * Request account deletion (GDPR-compliant).
     * Initiates a 30-day grace period during which the user can cancel.
     * @param data - Password (+ optional OTP code and reason).
     */
    async requestAccountDeletion(data: AccountDeletionRequestData): Promise<AccountDeletionRequestResponse> {
        return this.client.post<AccountDeletionRequestResponse>('/api/v1/auth/request-account-deletion/', data);
    }

    /**
     * Confirm the account deletion using the token received by email.
     * The token is valid for 24 hours. After confirmation the account enters the 30-day grace period.
     * @param token - The confirmation token from the email.
     */
    async confirmAccountDeletion(token: string): Promise<AccountDeletionConfirmResponse> {
        return this.client.post<AccountDeletionConfirmResponse>('/api/v1/auth/confirm-account-deletion/', { token });
    }

    /**
     * Cancel a pending account deletion during the grace period.
     * The account is immediately reactivated.
     * @param password - The current password for security.
     */
    async cancelAccountDeletion(password: string): Promise<AccountDeletionCancelResponse> {
        return this.client.post<AccountDeletionCancelResponse>('/api/v1/auth/cancel-account-deletion/', { password });
    }

    /**
     * Get the deletion status for the current user.
     * Includes pending, confirmed, or cancelled requests.
     */
    async getAccountDeletionStatus(): Promise<DeletionStatus> {
        return this.client.get<DeletionStatus>('/api/v1/auth/account-deletion-status/');
    }

    /**
     * Export all personal data (GDPR right to data portability).
     * @param password - The current password for security.
     */
    async exportUserData(password: string): Promise<UserDataExport> {
        return this.client.post<UserDataExport>('/api/v1/auth/export-user-data/', { password });
    }

    // ─── Admin-facing ───

    /**
     * List deletion requests (admin, paginated).
     * @param params - Optional filters and pagination.
     */
    async listDeletionRequests(params?: DeletionRequestListParams): Promise<PaginatedResponse<DeletionRequest>> {
        return this.client.get<PaginatedResponse<DeletionRequest>>('/api/v1/auth/admin/deletion-requests/', {
            params: params as Record<string, string | number | boolean> | undefined,
        });
    }

    /**
     * Get a single deletion request by ID.
     * @param requestId - The deletion request ID.
     */
    async getDeletionRequest(requestId: string): Promise<DeletionRequest> {
        return this.client.get<DeletionRequest>(`/api/v1/auth/admin/deletion-requests/${requestId}/`);
    }

    /**
     * Process (execute) a confirmed deletion request.
     * **WARNING:** This is irreversible and permanently destroys all user data.
     * @param requestId - The deletion request ID.
     * @param data - Must include `{ confirmation: "PERMANENTLY DELETE" }`.
     */
    async processDeletionRequest(requestId: string | number, data: ProcessDeletionRequestData): Promise<ProcessDeletionResponse> {
        return this.client.post<ProcessDeletionResponse>(`/api/v1/auth/admin/deletion-requests/${requestId}/process/`, data);
    }

    /**
     * Batch-process all confirmed deletion requests whose 30-day grace period has expired.
     * Typically run by a daily cron job.
     */
    async processExpiredDeletions(): Promise<ProcessExpiredDeletionsResponse> {
        return this.client.post<ProcessExpiredDeletionsResponse>('/api/v1/auth/admin/deletion-requests/process-expired/');
    }
}
