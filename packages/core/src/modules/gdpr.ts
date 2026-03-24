import { TenxyteHttpClient } from '../http/client';

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
}
