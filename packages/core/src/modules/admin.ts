import { TenxyteHttpClient } from '../http/client';
import type { PaginatedResponse } from '../types';

// ─── Action enum ───

/**
 * All possible audit log action types.
 */
export type AuditAction =
    | 'login'
    | 'login_failed'
    | 'logout'
    | 'logout_all'
    | 'token_refresh'
    | 'password_change'
    | 'password_reset_request'
    | 'password_reset_complete'
    | '2fa_enabled'
    | '2fa_disabled'
    | '2fa_backup_used'
    | 'account_created'
    | 'account_locked'
    | 'account_unlocked'
    | 'email_verified'
    | 'phone_verified'
    | 'role_assigned'
    | 'role_removed'
    | 'permission_changed'
    | 'app_created'
    | 'app_credentials_regenerated'
    | 'account_deleted'
    | 'suspicious_activity'
    | 'session_limit_exceeded'
    | 'device_limit_exceeded'
    | 'new_device_detected'
    | 'agent_action';

// ─── Entity types ───

/** An audit log entry. */
export interface AuditLog {
    id: string;
    user?: number | null;
    user_email: string;
    action: AuditAction;
    ip_address?: string | null;
    user_agent?: string;
    application?: number | null;
    application_name: string;
    details?: unknown;
    created_at: string;
}

/** A login attempt record. */
export interface LoginAttempt {
    id: string;
    identifier: string;
    ip_address: string;
    application?: number | null;
    success?: boolean;
    failure_reason?: string;
    created_at: string;
}

/** A blacklisted (revoked) JWT token. */
export interface BlacklistedToken {
    id: string;
    token_jti: string;
    user?: number | null;
    user_email: string;
    blacklisted_at: string;
    expires_at: string;
    reason?: string;
    is_expired: string;
}

/** A refresh token as seen from the admin view (token value hidden). */
export interface RefreshTokenInfo {
    id: string;
    user: number;
    user_email: string;
    application: number;
    application_name: string;
    device_info?: string;
    ip_address?: string | null;
    is_revoked?: boolean;
    is_expired: string;
    expires_at: string;
    created_at: string;
    last_used_at: string;
}

// ─── Query param types ───

/** Parameters accepted by `listAuditLogs()`. */
export interface AuditLogListParams {
    /** Filter by user ID. */
    user_id?: string;
    /** Filter by action (login, login_failed, password_change, etc.). */
    action?: string;
    /** Filter by IP address. */
    ip_address?: string;
    /** Filter by application ID. */
    application_id?: string;
    /** After date (YYYY-MM-DD). */
    date_from?: string;
    /** Before date (YYYY-MM-DD). */
    date_to?: string;
    /** Sort field: `created_at`, `action`, `user`. */
    ordering?: string;
    /** Page number (1-indexed). */
    page?: number;
    /** Items per page (max 100). */
    page_size?: number;
}

/** Parameters accepted by `listLoginAttempts()`. */
export interface LoginAttemptListParams {
    /** Filter by identifier (email/phone). */
    identifier?: string;
    /** Filter by IP address. */
    ip_address?: string;
    /** Filter by success/failure. */
    success?: boolean;
    /** After date (YYYY-MM-DD). */
    date_from?: string;
    /** Before date (YYYY-MM-DD). */
    date_to?: string;
    /** Sort field: `created_at`, `identifier`, `ip_address`. */
    ordering?: string;
    /** Page number (1-indexed). */
    page?: number;
    /** Items per page (max 100). */
    page_size?: number;
}

/** Parameters accepted by `listBlacklistedTokens()`. */
export interface BlacklistedTokenListParams {
    /** Filter by user ID. */
    user_id?: string;
    /** Filter by reason (`logout`, `password_change`, `security`). */
    reason?: string;
    /** Filter by expired (true/false). */
    expired?: boolean;
    /** Sort field: `blacklisted_at`, `expires_at`. */
    ordering?: string;
    /** Page number (1-indexed). */
    page?: number;
    /** Items per page (max 100). */
    page_size?: number;
}

/** Parameters accepted by `listRefreshTokens()`. */
export interface RefreshTokenListParams {
    /** Filter by user ID. */
    user_id?: string;
    /** Filter by application ID. */
    application_id?: string;
    /** Filter by revoked status. */
    is_revoked?: boolean;
    /** Filter by expired status. */
    expired?: boolean;
    /** Sort field: `created_at`, `expires_at`, `last_used_at`. */
    ordering?: string;
    /** Page number (1-indexed). */
    page?: number;
    /** Items per page (max 100). */
    page_size?: number;
}

// ─── Module ───

export class AdminModule {
    constructor(private client: TenxyteHttpClient) {}

    // ─── Audit Logs ───

    /**
     * List audit log entries (paginated).
     * @param params - Optional filters and pagination.
     */
    async listAuditLogs(params?: AuditLogListParams): Promise<PaginatedResponse<AuditLog>> {
        return this.client.get<PaginatedResponse<AuditLog>>('/api/v1/auth/admin/audit-logs/', {
            params: params as Record<string, string | number | boolean> | undefined,
        });
    }

    /**
     * Get a single audit log entry by ID.
     * @param logId - The audit log entry ID.
     */
    async getAuditLog(logId: string): Promise<AuditLog> {
        return this.client.get<AuditLog>(`/api/v1/auth/admin/audit-logs/${logId}/`);
    }

    // ─── Login Attempts ───

    /**
     * List login attempt records (paginated).
     * @param params - Optional filters and pagination.
     */
    async listLoginAttempts(params?: LoginAttemptListParams): Promise<PaginatedResponse<LoginAttempt>> {
        return this.client.get<PaginatedResponse<LoginAttempt>>('/api/v1/auth/admin/login-attempts/', {
            params: params as Record<string, string | number | boolean> | undefined,
        });
    }

    // ─── Blacklisted Tokens ───

    /**
     * List blacklisted (revoked) JWT tokens (paginated).
     * @param params - Optional filters and pagination.
     */
    async listBlacklistedTokens(params?: BlacklistedTokenListParams): Promise<PaginatedResponse<BlacklistedToken>> {
        return this.client.get<PaginatedResponse<BlacklistedToken>>('/api/v1/auth/admin/blacklisted-tokens/', {
            params: params as Record<string, string | number | boolean> | undefined,
        });
    }

    /**
     * Remove expired blacklisted tokens.
     * @returns A summary object with cleanup results.
     */
    async cleanupBlacklistedTokens(): Promise<Record<string, unknown>> {
        return this.client.post<Record<string, unknown>>('/api/v1/auth/admin/blacklisted-tokens/cleanup/');
    }

    // ─── Refresh Tokens ───

    /**
     * List refresh tokens (admin view — token values are hidden).
     * @param params - Optional filters and pagination.
     */
    async listRefreshTokens(params?: RefreshTokenListParams): Promise<PaginatedResponse<RefreshTokenInfo>> {
        return this.client.get<PaginatedResponse<RefreshTokenInfo>>('/api/v1/auth/admin/refresh-tokens/', {
            params: params as Record<string, string | number | boolean> | undefined,
        });
    }

    /**
     * Revoke a specific refresh token.
     * @param tokenId - The refresh token ID.
     * @returns The updated refresh token record.
     */
    async revokeRefreshToken(tokenId: string): Promise<RefreshTokenInfo> {
        return this.client.post<RefreshTokenInfo>(`/api/v1/auth/admin/refresh-tokens/${tokenId}/revoke/`);
    }
}
