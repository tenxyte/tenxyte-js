import type { components, paths } from './api-schema';

export type GeneratedSchema = components['schemas'];

/**
 * Core User Interface exposed by the SDK.
 * Represents the authenticated entity bound to the active session.
 */
export interface TenxyteUser {
    id: string; // UUID
    email: string | null;
    phone_country_code: string | null;
    phone_number: string | null;
    first_name: string;
    last_name: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
    is_2fa_enabled: boolean;
    roles: string[]; // Role codes e.g., ['admin', 'viewer']
    permissions: string[]; // Permission codes (direct + inherited)
    created_at: string; // ISO 8601
    last_login: string | null;
}

/**
 * Standard SDK Token Pair (internal structure normalized by interceptors).
 * These are managed automatically if auto-refresh is enabled.
 */
export interface TokenPair {
    access_token: string; // JWT Bearer
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number; // Current access_token lifetime in seconds
    device_summary: string | null; // e.g., "desktop — windows 11 — chrome 122" (null if device_info absent)
}

/**
 * Standardized API Error Response wrapper thrown by network interceptors.
 */
export interface TenxyteError {
    error: string; // Human message
    code: TenxyteErrorCode; // Machine identifier
    details?: Record<string, string[]> | string; // Per-field errors or free message
    retry_after?: number; // Present on HTTP 429 and 423
}

export type TenxyteErrorCode =
    // Auth
    | 'LOGIN_FAILED'
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_BANNED'
    | '2FA_REQUIRED'
    | 'ADMIN_2FA_SETUP_REQUIRED'
    | 'TOKEN_EXPIRED'
    | 'TOKEN_BLACKLISTED'
    | 'REFRESH_FAILED'
    | 'PERMISSION_DENIED'
    | 'SESSION_LIMIT_EXCEEDED'
    | 'DEVICE_LIMIT_EXCEEDED'
    | 'RATE_LIMITED'
    | 'INVALID_OTP'
    | 'OTP_EXPIRED'
    | 'INVALID_PROVIDER'
    | 'SOCIAL_AUTH_FAILED'
    | 'VALIDATION_URL_REQUIRED'
    | 'INVALID_TOKEN'
    // User / Account
    | 'CONFIRMATION_REQUIRED'
    | 'PASSWORD_REQUIRED'
    | 'INVALID_PASSWORD'
    | 'INVALID_DEVICE_INFO'
    // B2B / Organizations
    | 'ORG_NOT_FOUND'
    | 'NOT_ORG_MEMBER'
    | 'NOT_OWNER'
    | 'ALREADY_MEMBER'
    | 'MEMBER_LIMIT_EXCEEDED'
    | 'HAS_CHILDREN'
    | 'CIRCULAR_HIERARCHY'
    | 'LAST_OWNER_REQUIRED'
    | 'INVITATION_EXISTS'
    | 'INVALID_ROLE'
    // AIRS — Agent errors
    | 'AGENT_NOT_FOUND'
    | 'AGENT_SUSPENDED'
    | 'AGENT_REVOKED'
    | 'AGENT_EXPIRED'
    | 'BUDGET_EXCEEDED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'HEARTBEAT_MISSING'
    | 'AIRS_DISABLED';

/**
 * Organization Structure defining a B2B tenant or hierarchical unit.
 */
export interface Organization {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    metadata: Record<string, unknown> | null;
    is_active: boolean;
    max_members: number; // 0 = unlimited
    member_count: number;
    created_at: string;
    updated_at: string;
    parent: { id: number; name: string; slug: string } | null;
    children: Array<{ id: number; name: string; slug: string }>;
    user_role: string | null; // Current user's contextual role inside this exact org
    user_permissions: string[]; // Effective permissions resolving downward in this org
}

/**
 * Base Pagination Response wrapper
 */
export interface PaginatedResponse<T> {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

/**
 * AIRS Agent Token metadata
 */
export interface AgentTokenSummary {
    id: number;
    agent_id: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
    expires_at: string;
    created_at: string;
    organization: string | null; // Org slug, or null
    current_request_count: number;
}

/**
 * Request awaiting Human-In-The-Loop approval
 */
export interface AgentPendingAction {
    id: number;
    agent_id: string;
    permission: string; // e.g., "users.delete"
    endpoint: string;
    payload: unknown;
    confirmation_token: string;
    expires_at: string;
    created_at: string;
}
