import { TenxyteHttpClient } from '../http/client';

// ─── Parameter types ───

/** Parameters accepted by `getStats()`. */
export interface DashboardStatsParams {
    /** Analysis period (default: `"7d"`). */
    period?: '7d' | '30d' | '90d';
    /** Include comparison with previous period. */
    compare?: boolean;
}

// ─── Response types ───

/** Global dashboard statistics returned by `getStats()`. */
export interface DashboardStats {
    summary?: {
        total_users?: number;
        active_users?: number;
        total_organizations?: number;
        total_applications?: number;
        active_sessions?: number;
        pending_deletions?: number;
    };
    trends?: {
        user_growth?: number;
        login_success_rate?: number;
        application_usage?: number;
        security_incidents?: number;
    };
    organization_context?: {
        current_org?: Record<string, unknown> | null;
        user_role?: string;
        accessible_orgs?: number;
        org_specific_stats?: Record<string, unknown>;
    };
    quick_actions?: {
        action?: string;
        count?: number;
        priority?: string;
    }[];
    charts?: {
        daily_logins?: unknown[];
        user_registrations?: unknown[];
        security_events?: unknown[];
    };
}

/**
 * Authentication statistics returned by `getAuthStats()`.
 * Login stats, methods, registrations, tokens, top failure reasons, 7-day graphs.
 */
export type AuthStats = Record<string, unknown>;

/**
 * Security statistics returned by `getSecurityStats()`.
 * Audit summary, blacklisted tokens, suspicious activity, 2FA adoption.
 */
export type SecurityStats = Record<string, unknown>;

/**
 * GDPR statistics returned by `getGdprStats()`.
 * Deletion requests by status, data exports.
 */
export type GdprStats = Record<string, unknown>;

// ─── Module ───

export class DashboardModule {
    constructor(private client: TenxyteHttpClient) {}

    /**
     * Get global cross-module dashboard statistics.
     * Data varies based on the organizational context (`X-Org-Slug`) and permissions.
     * Covers users, authentication, applications, security, and GDPR metrics.
     * Charts span the last 7 days with previous-period comparisons.
     * @param params - Optional period and comparison flag.
     */
    async getStats(params?: DashboardStatsParams): Promise<DashboardStats> {
        return this.client.get<DashboardStats>('/api/v1/auth/dashboard/stats/', {
            params: params as Record<string, string | number | boolean> | undefined,
        });
    }

    /**
     * Get authentication-specific statistics.
     * Includes login stats, methods breakdown, registrations, tokens, top failure reasons, and 7-day graphs.
     */
    async getAuthStats(): Promise<AuthStats> {
        return this.client.get<AuthStats>('/api/v1/auth/dashboard/auth/');
    }

    /**
     * Get security-specific statistics.
     * Includes audit summary, blacklisted tokens, suspicious activity, and 2FA adoption.
     */
    async getSecurityStats(): Promise<SecurityStats> {
        return this.client.get<SecurityStats>('/api/v1/auth/dashboard/security/');
    }

    /**
     * Get GDPR-specific statistics.
     * Includes deletion requests by status and data export metrics.
     */
    async getGdprStats(): Promise<GdprStats> {
        return this.client.get<GdprStats>('/api/v1/auth/dashboard/gdpr/');
    }
}
