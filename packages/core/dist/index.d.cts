interface HttpClientOptions {
    baseUrl: string;
    timeoutMs?: number;
    headers?: Record<string, string>;
}
type RequestConfig = Omit<RequestInit, 'body' | 'headers'> & {
    body?: unknown;
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
};
/**
 * Core HTTP Client underlying the SDK.
 * Handles JSON parsing, standard headers, simple request processing,
 * and normalizing errors into TenxyteError format.
 */
declare class TenxyteHttpClient {
    private baseUrl;
    private defaultHeaders;
    private requestInterceptors;
    private responseInterceptors;
    constructor(options: HttpClientOptions);
    addRequestInterceptor(interceptor: typeof this.requestInterceptors[0]): void;
    addResponseInterceptor(interceptor: typeof this.responseInterceptors[0]): void;
    /**
     * Main request method wrapping fetch
     */
    request<T>(endpoint: string, config?: RequestConfig): Promise<T>;
    private normalizeError;
    get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T>;
    post<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T>;
    put<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T>;
    patch<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T>;
    delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T>;
}

interface components {
    schemas: {
        /**
         * @description * `login` - Login
         *     * `login_failed` - Login Failed
         *     * `logout` - Logout
         *     * `logout_all` - Logout All Devices
         *     * `token_refresh` - Token Refresh
         *     * `password_change` - Password Changed
         *     * `password_reset_request` - Password Reset Requested
         *     * `password_reset_complete` - Password Reset Completed
         *     * `2fa_enabled` - 2FA Enabled
         *     * `2fa_disabled` - 2FA Disabled
         *     * `2fa_backup_used` - 2FA Backup Code Used
         *     * `account_created` - Account Created
         *     * `account_locked` - Account Locked
         *     * `account_unlocked` - Account Unlocked
         *     * `email_verified` - Email Verified
         *     * `phone_verified` - Phone Verified
         *     * `role_assigned` - Role Assigned
         *     * `role_removed` - Role Removed
         *     * `permission_changed` - Permission Changed
         *     * `app_created` - Application Created
         *     * `app_credentials_regenerated` - Application Credentials Regenerated
         *     * `account_deleted` - Account Deleted
         *     * `suspicious_activity` - Suspicious Activity Detected
         *     * `session_limit_exceeded` - Session Limit Exceeded
         *     * `device_limit_exceeded` - Device Limit Exceeded
         *     * `new_device_detected` - New Device Detected
         *     * `agent_action` - Agent Action Executed
         * @enum {string}
         */
        ActionEnum: "login" | "login_failed" | "logout" | "logout_all" | "token_refresh" | "password_change" | "password_reset_request" | "password_reset_complete" | "2fa_enabled" | "2fa_disabled" | "2fa_backup_used" | "account_created" | "account_locked" | "account_unlocked" | "email_verified" | "phone_verified" | "role_assigned" | "role_removed" | "permission_changed" | "app_created" | "app_credentials_regenerated" | "account_deleted" | "suspicious_activity" | "session_limit_exceeded" | "device_limit_exceeded" | "new_device_detected" | "agent_action";
        /** @description Full serializer for admin user detail view. */
        AdminUserDetail: {
            readonly id: string;
            /** Format: email */
            email?: string | null;
            phone_country_code?: string | null;
            phone_number?: string | null;
            first_name?: string;
            last_name?: string;
            is_active?: boolean;
            is_locked?: boolean;
            /** Format: date-time */
            locked_until?: string | null;
            /** @description Permanent ban (manual admin action). Cannot be auto-lifted. */
            is_banned?: boolean;
            is_deleted?: boolean;
            /** Format: date-time */
            deleted_at?: string | null;
            is_email_verified?: boolean;
            is_phone_verified?: boolean;
            is_2fa_enabled?: boolean;
            is_staff?: boolean;
            is_superuser?: boolean;
            /**
             * Format: int64
             * @description Maximum concurrent sessions allowed (0 = unlimited)
             */
            max_sessions?: number;
            /**
             * Format: int64
             * @description Maximum unique devices allowed (0 = unlimited)
             */
            max_devices?: number;
            readonly roles: string[];
            readonly permissions: string[];
            /** Format: date-time */
            readonly created_at: string;
            /** Format: date-time */
            readonly updated_at: string;
            /** Format: date-time */
            last_login?: string | null;
        };
        /** @description Lightweight serializer for admin user listing. */
        AdminUserList: {
            readonly id: string;
            /** Format: email */
            email?: string | null;
            first_name?: string;
            last_name?: string;
            is_active?: boolean;
            is_locked?: boolean;
            /** @description Permanent ban (manual admin action). Cannot be auto-lifted. */
            is_banned?: boolean;
            is_deleted?: boolean;
            is_email_verified?: boolean;
            is_phone_verified?: boolean;
            is_2fa_enabled?: boolean;
            readonly roles: string[];
            /** Format: date-time */
            readonly created_at: string;
            /** Format: date-time */
            last_login?: string | null;
        };
        AgentConfirmRequest: {
            /** @description Confirmation token de l'action */
            token: string;
        };
        AgentErrorResponse: {
            error: string;
            code?: string;
        };
        AgentPendingActionList: {
            id: number;
            agent_id: string;
            permission: string;
            endpoint: string;
            payload: {
                [key: string]: unknown;
            } | null;
            confirmation_token: string;
            /** Format: date-time */
            expires_at: string;
            /** Format: date-time */
            created_at: string;
        };
        AgentReportUsageBudget: {
            error: string;
            status: string;
        };
        AgentReportUsageRequest: {
            /**
             * Format: double
             * @description Coût en USD de la session
             */
            cost_usd: number;
            /** @description Tokens prompt consommés */
            prompt_tokens: number;
            /** @description Tokens completion consommés */
            completion_tokens: number;
        };
        AgentRevokeAllOk: {
            status: string;
            /** @description Nombre de tokens révoqués */
            count: number;
        };
        AgentSuccessResponse: {
            status: string;
        };
        AgentTokenCreateRequest: {
            /** @description Identifiant de l'agent (ex: 'my-bot-v1') */
            agent_id: string;
            /** @description Durée de validité en secondes */
            expires_in?: number;
            /** @description Liste des permissions demandées */
            permissions?: string[];
            /** @description Slug organisation (alternatif à X-Org-Slug header) */
            organization?: string;
            /**
             * Format: double
             * @description Budget max en USD
             */
            budget_limit_usd?: number;
            circuit_breaker?: {
                [key: string]: unknown;
            };
            dead_mans_switch?: {
                [key: string]: unknown;
            };
        };
        AgentTokenCreated: {
            id: number;
            /** @description Token brut AgentBearer (secret, à stocker) */
            token: string;
            agent_id: string;
            status: string;
            /** Format: date-time */
            expires_at: string;
        };
        AgentTokenDetail: {
            id: number;
            agent_id: string;
            status: string;
            /** Format: date-time */
            expires_at: string;
            /** Format: date-time */
            created_at: string;
            organization: string | null;
            current_request_count: number;
        };
        AgentTokenList: {
            id: number;
            agent_id: string;
            status: string;
            /** Format: date-time */
            expires_at: string;
            /** Format: date-time */
            created_at: string;
            organization: string | null;
            current_request_count: number;
        };
        /** @description Serializer pour afficher les applications (sans le secret) */
        Application: {
            readonly id: string;
            name: string;
            description?: string;
            readonly access_key: string;
            is_active?: boolean;
            /** Format: date-time */
            readonly created_at: string;
            /** Format: date-time */
            readonly updated_at: string;
        };
        /** @description Serializer pour créer une application */
        ApplicationCreate: {
            name: string;
            /** @default  */
            description: string;
        };
        /** @description Serializer pour mettre à jour une application */
        ApplicationUpdate: {
            name?: string;
            description?: string;
            is_active?: boolean;
        };
        AssignRole: {
            role_code: string;
        };
        /** @description Serializer for audit log entries. */
        AuditLog: {
            readonly id: string;
            user?: number | null;
            readonly user_email: string;
            action: components["schemas"]["ActionEnum"];
            ip_address?: string | null;
            user_agent?: string;
            application?: number | null;
            readonly application_name: string;
            details?: unknown;
            /** Format: date-time */
            readonly created_at: string;
        };
        /** @description Serializer for banning a user. */
        BanUser: {
            /**
             * @description Reason for the ban (stored in audit log)
             * @default
             */
            reason: string;
        };
        /** @description Serializer for blacklisted JWT tokens. */
        BlacklistedToken: {
            readonly id: string;
            token_jti: string;
            user?: number | null;
            readonly user_email: string;
            /** Format: date-time */
            readonly blacklisted_at: string;
            /** Format: date-time */
            expires_at: string;
            reason?: string;
            readonly is_expired: string;
        };
        CancelAccountDeletion: {
            /** @description Mot de passe actuel requis pour annulation */
            password: string;
        };
        ChangePassword: {
            current_password: string;
            new_password: string;
        };
        /** @description Serializer for admin deletion request listing/detail. */
        DeletionRequest: {
            readonly id: string;
            user: number;
            readonly user_email: string;
            status?: components["schemas"]["StatusEnum"];
            /** Format: date-time */
            readonly requested_at: string;
            /** Format: date-time */
            confirmed_at?: string | null;
            /** Format: date-time */
            grace_period_ends_at?: string | null;
            /** Format: date-time */
            completed_at?: string | null;
            ip_address?: string | null;
            /** @description Optional reason for deletion request */
            reason?: string;
            admin_notes?: string;
            processed_by?: number | null;
            readonly processed_by_email: string;
            readonly is_grace_period_expired: string;
        };
        ExportUserData: {
            /** @description Mot de passe actuel requis pour exporter les données */
            password: string;
        };
        /** @description Serializer for locking a user account. */
        LockUser: {
            /**
             * @description Lock duration in minutes (default: 30, max: 30 days)
             * @default 30
             */
            duration_minutes: number;
            /**
             * @description Reason for the lock (stored in audit log)
             * @default
             */
            reason: string;
        };
        /** @description Serializer for login attempt records. */
        LoginAttempt: {
            readonly id: string;
            identifier: string;
            ip_address: string;
            application?: number | null;
            success?: boolean;
            failure_reason?: string;
            /** Format: date-time */
            readonly created_at: string;
        };
        LoginEmail: {
            /** Format: email */
            email: string;
            password: string;
            /** @description Code 2FA (requis si 2FA activé) */
            totp_code?: string;
            /**
             * @description Device info au format v1 (ex: v=1|os=windows;osv=11|device=desktop)
             * @default
             */
            device_info: string;
        };
        LoginPhone: {
            phone_country_code: string;
            phone_number: string;
            password: string;
            /** @description Code 2FA (requis si 2FA activé) */
            totp_code?: string;
            /**
             * @description Device info au format v1 (ex: v=1|os=windows;osv=11|device=desktop)
             * @default
             */
            device_info: string;
        };
        MagicLinkRequest: {
            /**
             * Format: email
             * @description Adresse email pour recevoir le magic link
             */
            email: string;
            /**
             * Format: uri
             * @description URL pour construire le lien de vérification (obligatoire)
             */
            validation_url: string;
        };
        ManageRolePermissions: {
            /** @description Liste des codes de permissions à ajouter ou retirer */
            permission_codes: string[];
        };
        /**
         * @description * `email` - email
         *     * `phone` - phone
         * @enum {string}
         */
        OtpTypeEnum: "email" | "phone";
        PaginatedAdminUserListList: {
            /**
             * @description Total number of items
             * @example 150
             */
            count: number;
            /**
             * @description Current page number
             * @example 1
             */
            page?: number;
            /**
             * @description Items per page
             * @example 20
             */
            page_size?: number;
            /**
             * @description Total number of pages
             * @example 8
             */
            total_pages?: number;
            /**
             * Format: uri
             * @description URL to the next page
             */
            next?: string | null;
            /**
             * Format: uri
             * @description URL to the previous page
             */
            previous?: string | null;
            results: components["schemas"]["AdminUserList"][];
        };
        PaginatedApplicationList: {
            /**
             * @description Total number of items
             * @example 150
             */
            count: number;
            /**
             * @description Current page number
             * @example 1
             */
            page?: number;
            /**
             * @description Items per page
             * @example 20
             */
            page_size?: number;
            /**
             * @description Total number of pages
             * @example 8
             */
            total_pages?: number;
            /**
             * Format: uri
             * @description URL to the next page
             */
            next?: string | null;
            /**
             * Format: uri
             * @description URL to the previous page
             */
            previous?: string | null;
            results: components["schemas"]["Application"][];
        };
        PaginatedAuditLogList: {
            /**
             * @description Total number of items
             * @example 150
             */
            count: number;
            /**
             * @description Current page number
             * @example 1
             */
            page?: number;
            /**
             * @description Items per page
             * @example 20
             */
            page_size?: number;
            /**
             * @description Total number of pages
             * @example 8
             */
            total_pages?: number;
            /**
             * Format: uri
             * @description URL to the next page
             */
            next?: string | null;
            /**
             * Format: uri
             * @description URL to the previous page
             */
            previous?: string | null;
            results: components["schemas"]["AuditLog"][];
        };
        PaginatedBlacklistedTokenList: {
            /**
             * @description Total number of items
             * @example 150
             */
            count: number;
            /**
             * @description Current page number
             * @example 1
             */
            page?: number;
            /**
             * @description Items per page
             * @example 20
             */
            page_size?: number;
            /**
             * @description Total number of pages
             * @example 8
             */
            total_pages?: number;
            /**
             * Format: uri
             * @description URL to the next page
             */
            next?: string | null;
            /**
             * Format: uri
             * @description URL to the previous page
             */
            previous?: string | null;
            results: components["schemas"]["BlacklistedToken"][];
        };
        PaginatedLoginAttemptList: {
            /**
             * @description Total number of items
             * @example 150
             */
            count: number;
            /**
             * @description Current page number
             * @example 1
             */
            page?: number;
            /**
             * @description Items per page
             * @example 20
             */
            page_size?: number;
            /**
             * @description Total number of pages
             * @example 8
             */
            total_pages?: number;
            /**
             * Format: uri
             * @description URL to the next page
             */
            next?: string | null;
            /**
             * Format: uri
             * @description URL to the previous page
             */
            previous?: string | null;
            results: components["schemas"]["LoginAttempt"][];
        };
        PaginatedPermissionList: {
            /**
             * @description Total number of items
             * @example 150
             */
            count: number;
            /**
             * @description Current page number
             * @example 1
             */
            page?: number;
            /**
             * @description Items per page
             * @example 20
             */
            page_size?: number;
            /**
             * @description Total number of pages
             * @example 8
             */
            total_pages?: number;
            /**
             * Format: uri
             * @description URL to the next page
             */
            next?: string | null;
            /**
             * Format: uri
             * @description URL to the previous page
             */
            previous?: string | null;
            results: components["schemas"]["Permission"][];
        };
        PaginatedRefreshTokenAdminList: {
            /**
             * @description Total number of items
             * @example 150
             */
            count: number;
            /**
             * @description Current page number
             * @example 1
             */
            page?: number;
            /**
             * @description Items per page
             * @example 20
             */
            page_size?: number;
            /**
             * @description Total number of pages
             * @example 8
             */
            total_pages?: number;
            /**
             * Format: uri
             * @description URL to the next page
             */
            next?: string | null;
            /**
             * Format: uri
             * @description URL to the previous page
             */
            previous?: string | null;
            results: components["schemas"]["RefreshTokenAdmin"][];
        };
        PaginatedRoleListList: {
            /**
             * @description Total number of items
             * @example 150
             */
            count: number;
            /**
             * @description Current page number
             * @example 1
             */
            page?: number;
            /**
             * @description Items per page
             * @example 20
             */
            page_size?: number;
            /**
             * @description Total number of pages
             * @example 8
             */
            total_pages?: number;
            /**
             * Format: uri
             * @description URL to the next page
             */
            next?: string | null;
            /**
             * Format: uri
             * @description URL to the previous page
             */
            previous?: string | null;
            results: components["schemas"]["RoleList"][];
        };
        PasswordResetConfirm: {
            code: string;
            new_password: string;
        };
        PasswordResetRequest: {
            /** Format: email */
            email?: string;
            phone_country_code?: string;
            phone_number?: string;
        };
        PasswordStrengthRequest: {
            password: string;
            /** Format: email */
            email?: string;
        };
        /** @description Serializer for admin user updates (partial). */
        PatchedAdminUserUpdate: {
            first_name?: string;
            last_name?: string;
            is_active?: boolean;
            is_staff?: boolean;
            is_superuser?: boolean;
            max_sessions?: number;
            max_devices?: number;
        };
        PatchedToggleApplicationStatus: {
            /** @description Nouveau statut actif de l'application */
            is_active?: boolean;
        };
        PatchedUpdateProfileRequest: {
            /** @description Prénom (max 30 caractères) */
            first_name?: string;
            /** @description Nom (max 30 caractères) */
            last_name?: string;
            /** @description Nom d'utilisateur unique (alphanumérique + underscores) */
            username?: string;
            /** @description Numéro de téléphone au format international (+33612345678) */
            phone?: string;
            /** @description Biographie (max 500 caractères) */
            bio?: string;
            /** @description Fuseau horaire (ex: Europe/Paris, America/New_York) */
            timezone?: string;
            /** @description Langue préférée */
            language?: string;
            /** @description Champs personnalisés (selon configuration organisation) */
            custom_fields?: {
                [key: string]: unknown;
            };
        };
        Permission: {
            readonly id: string;
            code: string;
            name: string;
            description?: string;
            readonly parent: {
                [key: string]: unknown;
            } | null;
            /** @description Code de la permission parente (hiérarchie) */
            parent_code?: string | null;
            readonly children: {
                [key: string]: unknown;
            }[];
            /** Format: date-time */
            readonly created_at: string;
        };
        ProcessDeletionRequest: {
            /** @description Texte de confirmation "PERMANENTLY DELETE" */
            confirmation: string;
            /** @description Notes administratives optionnelles */
            admin_notes?: string;
        };
        RefreshToken: {
            refresh_token: string;
        };
        /** @description Serializer for refresh tokens (admin view, token value hidden). */
        RefreshTokenAdmin: {
            readonly id: string;
            user: number;
            readonly user_email: string;
            application: number;
            readonly application_name: string;
            device_info?: string;
            ip_address?: string | null;
            is_revoked?: boolean;
            readonly is_expired: string;
            /** Format: date-time */
            expires_at: string;
            /** Format: date-time */
            readonly created_at: string;
            /** Format: date-time */
            readonly last_used_at: string;
        };
        RegenerateApplicationCredentials: {
            /** @description Texte de confirmation "REGENERATE" */
            confirmation: string;
        };
        Register: {
            /** Format: email */
            email?: string | null;
            phone_country_code?: string | null;
            phone_number?: string | null;
            password: string;
            /** @default  */
            first_name: string;
            /** @default  */
            last_name: string;
            /**
             * @description Si True, l'utilisateur est connecté immédiatement après l'inscription (tokens JWT retournés)
             * @default false
             */
            login: boolean;
            /**
             * @description Device info au format v1 (ex: v=1|os=windows;osv=11|device=desktop)
             * @default
             */
            device_info: string;
        };
        RequestAccountDeletion: {
            /** @description Mot de passe actuel requis pour confirmation */
            password: string;
            /** @description Code OTP à 6 chiffres (requis si 2FA activé) */
            otp_code?: string;
            /** @description Raison optionnelle de la suppression */
            reason?: string;
        };
        RequestOTP: {
            otp_type: components["schemas"]["OtpTypeEnum"];
        };
        Role: {
            readonly id: string;
            code: string;
            name: string;
            description?: string;
            readonly permissions: components["schemas"]["Permission"][];
            permission_codes?: string[];
            is_default?: boolean;
            /** Format: date-time */
            readonly created_at: string;
            /** Format: date-time */
            readonly updated_at: string;
        };
        /** @description Version allégée pour les listes */
        RoleList: {
            readonly id: string;
            code: string;
            name: string;
            is_default?: boolean;
        };
        SocialAuthRequest: {
            /** @description OAuth2 access token du provider */
            access_token?: string;
            /** @description Authorization code flow */
            code?: string;
            /** @description URI de redirection (requis avec code) */
            redirect_uri?: string;
            /** @description Google ID token uniquement */
            id_token?: string;
            /** @description Informations device (optionnel) */
            device_info?: string;
        };
        SocialCallbackError: {
            error: string;
            code: string;
        };
        SocialCallbackRedirect: {
            /** @description URL de redirection avec tokens en paramètres query */
            location: string;
        };
        SocialCallbackResponse: {
            access: string;
            refresh: string;
            provider: string;
            is_new_user: boolean;
        };
        SocialCallbackUnauthorized: {
            error: string;
            code: string;
        };
        /**
         * @description * `pending` - Pending
         *     * `confirmation_sent` - Confirmation Sent
         *     * `confirmed` - Confirmed
         *     * `completed` - Completed
         *     * `cancelled` - Cancelled
         * @enum {string}
         */
        StatusEnum: "pending" | "confirmation_sent" | "confirmed" | "completed" | "cancelled";
        TokenRequest: {
            /** @description Confirmation token de l'action */
            token: string;
        };
        TwoFactorBackupCodesRequest: {
            /** @description Code TOTP à 6 chiffres pour validation */
            code: string;
        };
        TwoFactorConfirmRequest: {
            /** @description Code TOTP à 6 chiffres */
            code: string;
        };
        TwoFactorDisableRequest: {
            /** @description Code TOTP ou code de secours à 8 chiffres */
            code: string;
            /** @description Mot de passe de l'utilisateur pour confirmation */
            password: string;
        };
        VerifyOTP: {
            code: string;
        };
        WebAuthnAuthenticateBeginRequest: {
            /**
             * Format: email
             * @description Optionnel — pour credentials utilisateur spécifiques
             */
            email?: string;
        };
        WebAuthnAuthenticateCompleteRequest: {
            /** @description ID du challenge généré */
            challenge_id: number;
            /** @description Assertion WebAuthn du navigateur */
            credential: {
                [key: string]: unknown;
            };
            /** @description Informations sur le device (optionnel) */
            device_info?: string;
        };
        WebAuthnRegisterCompleteRequest: {
            /** @description ID du challenge généré */
            challenge_id: number;
            /** @description Credential WebAuthn du navigateur */
            credential: {
                [key: string]: unknown;
            };
            /** @description Nom optionnel du device */
            device_name?: string;
        };
        User: {
            /** Format: uuid */
            id?: string;
            email?: string;
            phone_country_code?: string | null;
            phone_number?: string | null;
            first_name?: string;
            last_name?: string;
            is_email_verified?: boolean;
            is_phone_verified?: boolean;
            is_2fa_enabled?: boolean;
            roles?: string[];
            permissions?: string[];
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            last_login?: string | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}

type GeneratedSchema = components['schemas'];
/**
 * Core User Interface exposed by the SDK.
 * Represents the authenticated entity bound to the active session.
 */
interface TenxyteUser {
    id: string;
    email: string | null;
    phone_country_code: string | null;
    phone_number: string | null;
    first_name: string;
    last_name: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
    is_2fa_enabled: boolean;
    roles: string[];
    permissions: string[];
    created_at: string;
    last_login: string | null;
}
/**
 * Standard SDK Token Pair (internal structure normalized by interceptors).
 * These are managed automatically if auto-refresh is enabled.
 */
interface TokenPair {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    device_summary: string | null;
}
/**
 * Standardized API Error Response wrapper thrown by network interceptors.
 */
interface TenxyteError {
    error: string;
    code: TenxyteErrorCode;
    details?: Record<string, string[]> | string;
    retry_after?: number;
}
type TenxyteErrorCode = 'LOGIN_FAILED' | 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_BANNED' | '2FA_REQUIRED' | 'ADMIN_2FA_SETUP_REQUIRED' | 'TOKEN_EXPIRED' | 'TOKEN_BLACKLISTED' | 'REFRESH_FAILED' | 'PERMISSION_DENIED' | 'SESSION_LIMIT_EXCEEDED' | 'DEVICE_LIMIT_EXCEEDED' | 'RATE_LIMITED' | 'INVALID_OTP' | 'OTP_EXPIRED' | 'INVALID_PROVIDER' | 'SOCIAL_AUTH_FAILED' | 'VALIDATION_URL_REQUIRED' | 'INVALID_TOKEN' | 'CONFIRMATION_REQUIRED' | 'PASSWORD_REQUIRED' | 'INVALID_PASSWORD' | 'INVALID_DEVICE_INFO' | 'ORG_NOT_FOUND' | 'NOT_ORG_MEMBER' | 'NOT_OWNER' | 'ALREADY_MEMBER' | 'MEMBER_LIMIT_EXCEEDED' | 'HAS_CHILDREN' | 'CIRCULAR_HIERARCHY' | 'LAST_OWNER_REQUIRED' | 'INVITATION_EXISTS' | 'INVALID_ROLE' | 'AGENT_NOT_FOUND' | 'AGENT_SUSPENDED' | 'AGENT_REVOKED' | 'AGENT_EXPIRED' | 'BUDGET_EXCEEDED' | 'RATE_LIMIT_EXCEEDED' | 'HEARTBEAT_MISSING' | 'AIRS_DISABLED';
/**
 * Organization Structure defining a B2B tenant or hierarchical unit.
 */
interface Organization {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    metadata: Record<string, unknown> | null;
    is_active: boolean;
    max_members: number;
    member_count: number;
    created_at: string;
    updated_at: string;
    parent: {
        id: number;
        name: string;
        slug: string;
    } | null;
    children: Array<{
        id: number;
        name: string;
        slug: string;
    }>;
    user_role: string | null;
    user_permissions: string[];
}
/**
 * Base Pagination Response wrapper
 */
interface PaginatedResponse<T> {
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
interface AgentTokenSummary {
    id: number;
    agent_id: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
    expires_at: string;
    created_at: string;
    organization: string | null;
    current_request_count: number;
}
/**
 * Request awaiting Human-In-The-Loop approval
 */
interface AgentPendingAction {
    id: number;
    agent_id: string;
    permission: string;
    endpoint: string;
    payload: unknown;
    confirmation_token: string;
    expires_at: string;
    created_at: string;
}

interface LoginEmailOptions {
    totp_code?: string;
}
interface LoginPhoneOptions {
    totp_code?: string;
}
type RegisterRequest = any;
interface MagicLinkRequest {
    email: string;
}
interface SocialLoginRequest {
    access_token?: string;
    authorization_code?: string;
    id_token?: string;
}
declare class AuthModule {
    private client;
    constructor(client: TenxyteHttpClient);
    /**
     * Authenticate a user with their email and password.
     * @param data - The login credentials and optional TOTP code if 2FA is required.
     * @returns A pair of Access and Refresh tokens upon successful authentication.
     * @throws {TenxyteError} If credentials are invalid, or if `2FA_REQUIRED` without a valid `totp_code`.
     */
    loginWithEmail(data: GeneratedSchema['LoginEmail']): Promise<TokenPair>;
    /**
     * Authenticate a user with an international phone number and password.
     * @param data - The login credentials and optional TOTP code if 2FA is required.
     * @returns A pair of Access and Refresh tokens.
     */
    loginWithPhone(data: GeneratedSchema['LoginPhone']): Promise<TokenPair>;
    /**
     * Registers a new user account.
     * @param data - The registration details (email, password, etc.).
     * @returns The registered user data or a confirmation message.
     */
    register(data: RegisterRequest): Promise<any>;
    /**
     * Logout from the current session.
     * Informs the backend to immediately revoke the specified refresh token.
     * @param refreshToken - The refresh token to revoke.
     */
    logout(refreshToken: string): Promise<void>;
    /**
     * Logout from all sessions across all devices.
     * Revokes all refresh tokens currently assigned to the user.
     */
    logoutAll(): Promise<void>;
    /**
     * Request a Magic Link for passwordless sign-in.
     * @param data - The email to send the logic link to.
     */
    requestMagicLink(data: MagicLinkRequest): Promise<void>;
    /**
     * Verifies a magic link token extracted from the URL.
     * @param token - The cryptographic token received via email.
     * @returns A session token pair if the token is valid and unexpired.
     */
    verifyMagicLink(token: string): Promise<TokenPair>;
    /**
     * Submits OAuth2 Social Authentication payloads to the backend.
     * Can be used with native mobile SDK tokens (like Apple Sign-In JWTs).
     * @param provider - The OAuth provider ('google', 'github', etc.)
     * @param data - The OAuth tokens (access_token, id_token, etc.)
     * @returns An active session token pair.
     */
    loginWithSocial(provider: 'google' | 'github' | 'microsoft' | 'facebook', data: SocialLoginRequest): Promise<TokenPair>;
    /**
     * Handle Social Auth Callbacks (Authorization Code flow).
     * @param provider - The OAuth provider ('google', 'github', etc.)
     * @param code - The authorization code retrieved from the query string parameters.
     * @param redirectUri - The original redirect URI that was requested.
     * @returns An active session token pair after successful code exchange.
     */
    handleSocialCallback(provider: 'google' | 'github' | 'microsoft' | 'facebook', code: string, redirectUri: string): Promise<TokenPair>;
}

declare class SecurityModule {
    private client;
    constructor(client: TenxyteHttpClient);
    /**
     * Get the current 2FA status for the authenticated user.
     * @returns Information about whether 2FA is enabled and how many backup codes remain.
     */
    get2FAStatus(): Promise<{
        is_enabled: boolean;
        backup_codes_remaining: number;
    }>;
    /**
     * Start the 2FA enrollment process.
     * @returns The secret key and QR code URL to be scanned by an Authenticator app.
     */
    setup2FA(): Promise<{
        message: string;
        secret: string;
        manual_entry_key: string;
        qr_code: string;
        provisioning_uri: string;
        backup_codes: string[];
        warning: string;
    }>;
    /**
     * Confirm the 2FA setup by providing the first TOTP code generated by the Authenticator app.
     * @param totpCode - The 6-digit code.
     */
    confirm2FA(totpCode: string): Promise<{
        message: string;
        is_enabled: boolean;
        enabled_at: string;
    }>;
    /**
     * Disable 2FA for the current user.
     * Usually requires re-authentication or providing the active password/totp code.
     * @param totpCode - The current 6-digit code to verify intent.
     * @param password - (Optional) The user's password if required by backend policy.
     */
    disable2FA(totpCode: string, password?: string): Promise<{
        message: string;
        is_enabled: boolean;
        disabled_at: string;
        backup_codes_invalidated: boolean;
    }>;
    /**
     * Invalidate old backup codes and explicitly generate a new batch.
     * @param totpCode - An active TOTP code to verify intent.
     */
    regenerateBackupCodes(totpCode: string): Promise<{
        message: string;
        backup_codes: string[];
        codes_count: number;
        generated_at?: string;
        warning: string;
    }>;
    /**
     * Request an OTP code to be dispatched to the user's primary contact method.
     * @param type - The channel type ('email' or 'phone').
     */
    requestOtp(type: 'email' | 'phone'): Promise<{
        message: string;
        otp_id: number;
        expires_at: string;
        channel: 'email' | 'phone';
        masked_recipient: string;
    }>;
    /**
     * Verify an email confirmation OTP.
     * @param code - The numeric code received via email.
     */
    verifyOtpEmail(code: string): Promise<{
        message: string;
        email_verified: boolean;
        verified_at: string;
    }>;
    /**
     * Verify a phone confirmation OTP (SMS dispatch).
     * @param code - The numeric code received via SMS.
     */
    verifyOtpPhone(code: string): Promise<{
        message: string;
        phone_verified: boolean;
        verified_at: string;
        phone_number: string;
    }>;
    /**
     * Triggers a password reset flow, dispatching an OTP to the target.
     * @param target - Either an email address or a phone configuration payload.
     */
    resetPasswordRequest(target: {
        email: string;
    } | {
        phone_country_code: string;
        phone_number: string;
    }): Promise<{
        message: string;
    }>;
    /**
     * Confirm a password reset using the OTP dispatched by `resetPasswordRequest`.
     * @param data - The OTP code and the new matching password fields.
     */
    resetPasswordConfirm(data: {
        email?: string;
        phone_country_code?: string;
        phone_number?: string;
        otp_code: string;
        new_password: string;
        confirm_password: string;
    }): Promise<{
        message: string;
    }>;
    /**
     * Change password for an already authenticated user.
     * @param currentPassword - The existing password to verify intent.
     * @param newPassword - The distinct new password.
     */
    changePassword(currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    /**
     * Evaluate the strength of a potential password against backend policies.
     * @param password - The password string to test.
     * @param email - (Optional) The user's email to ensure the password doesn't contain it.
     */
    checkPasswordStrength(password: string, email?: string): Promise<{
        score: number;
        strength: string;
        is_valid: boolean;
        errors: string[];
        requirements: {
            min_length: number;
            require_lowercase: boolean;
            require_uppercase: boolean;
            require_numbers: boolean;
            require_special: boolean;
        };
    }>;
    /**
     * Fetch the password complexity requirements enforced by the Tenxyte backend.
     */
    getPasswordRequirements(): Promise<{
        requirements: Record<string, boolean | number>;
        min_length: number;
        max_length: number;
    }>;
    /**
     * Register a new WebAuthn device (Passkey/Biometrics/Security Key) for the authenticated user.
     * Integrates transparently with the browser `navigator.credentials` API.
     * @param deviceName - Optional human-readable name for the device being registered.
     */
    registerWebAuthn(deviceName?: string): Promise<{
        message: string;
        credential: {
            id: number;
            device_name: string;
            created_at: string;
        };
    }>;
    /**
     * Authenticate via WebAuthn (Passkey) without requiring a password.
     * Integrates transparently with the browser `navigator.credentials` API.
     * @param email - The email address identifying the user account (optional if discoverable credentials are used).
     * @returns A session token pair and the user context upon successful cryptographic challenge verification.
     */
    authenticateWebAuthn(email?: string): Promise<{
        access: string;
        refresh: string;
        user: TenxyteUser;
        message: string;
        credential_used: string;
    }>;
    /**
     * List all registered WebAuthn credentials for the active user.
     */
    listWebAuthnCredentials(): Promise<{
        credentials: Array<{
            id: number;
            device_name: string;
            created_at: string;
            last_used_at: string | null;
            authenticator_type: string;
            is_resident_key: boolean;
        }>;
        count: number;
    }>;
    /**
     * Delete a specific WebAuthn credential, removing its capability to sign in.
     * @param credentialId - The internal ID of the credential to delete.
     */
    deleteWebAuthnCredential(credentialId: number): Promise<void>;
}

interface Role {
    id: string;
    name: string;
    description?: string;
    is_default?: boolean;
    permissions?: string[];
}
interface Permission {
    id: string;
    code: string;
    name: string;
    description?: string;
}
declare class RbacModule {
    private client;
    private cachedToken;
    constructor(client: TenxyteHttpClient);
    /**
     * Cache a decoded JWT payload locally to perform parameter-less synchronous permission checks.
     * Usually invoked automatically by the system upon login or token refresh.
     * @param token - The raw JWT access token encoded string.
     */
    setToken(token: string | null): void;
    private getDecodedToken;
    /**
     * Synchronously deeply inspects the cached (or provided) JWT to determine if the user has a specific Role.
     * @param role - The exact code name of the Role.
     * @param token - (Optional) Provide a specific token overriding the cached one.
     */
    hasRole(role: string, token?: string): boolean;
    /**
     * Evaluates if the active session holds AT LEAST ONE of the listed Roles.
     * @param roles - An array of Role codes.
     */
    hasAnyRole(roles: string[], token?: string): boolean;
    /**
     * Evaluates if the active session holds ALL of the listed Roles concurrently.
     * @param roles - An array of Role codes.
     */
    hasAllRoles(roles: string[], token?: string): boolean;
    /**
     * Synchronously deeply inspects the cached (or provided) JWT to determine if the user has a specific granular Permission.
     * @param permission - The exact code name of the Permission (e.g., 'invoices.read').
     */
    hasPermission(permission: string, token?: string): boolean;
    /**
     * Evaluates if the active session holds AT LEAST ONE of the listed Permissions.
     */
    hasAnyPermission(permissions: string[], token?: string): boolean;
    /**
     * Evaluates if the active session holds ALL of the listed Permissions concurrently.
     */
    hasAllPermissions(permissions: string[], token?: string): boolean;
    /** Fetch all application global Roles structure */
    listRoles(): Promise<Role[]>;
    /** Create a new architectural Role inside Tenxyte */
    createRole(data: {
        name: string;
        description?: string;
        permission_codes?: string[];
        is_default?: boolean;
    }): Promise<Role>;
    /** Get detailed metadata defining a single bounded Role */
    getRole(roleId: string): Promise<Role>;
    /** Modify properties bounding a Role */
    updateRole(roleId: string, data: {
        name?: string;
        description?: string;
        permission_codes?: string[];
        is_default?: boolean;
    }): Promise<Role>;
    /** Unbind and destruct a Role from the global Tenant. (Dangerous, implies cascading permission unbindings) */
    deleteRole(roleId: string): Promise<void>;
    getRolePermissions(roleId: string): Promise<Permission[]>;
    addPermissionsToRole(roleId: string, permission_codes: string[]): Promise<void>;
    removePermissionsFromRole(roleId: string, permission_codes: string[]): Promise<void>;
    /** Enumerates all available fine-grained Permissions inside this Tenant scope. */
    listPermissions(): Promise<Permission[]>;
    /** Bootstraps a new granular Permission flag (e.g. `billing.refund`). */
    createPermission(data: {
        code: string;
        name: string;
        description?: string;
        parent_code?: string;
    }): Promise<Permission>;
    /** Retrieves an existing atomic Permission construct. */
    getPermission(permissionId: string): Promise<Permission>;
    /** Edits the human readable description or structural dependencies of a Permission. */
    updatePermission(permissionId: string, data: {
        name?: string;
        description?: string;
    }): Promise<Permission>;
    /** Destroys an atomic Permission permanently. Any Roles referencing it will be stripped of this grant automatically. */
    deletePermission(permissionId: string): Promise<void>;
    /**
     * Attach a given Role globally to a user entity.
     * Use sparingly if B2B multi-tenancy contexts are preferred.
     */
    assignRoleToUser(userId: string, roleCode: string): Promise<void>;
    /**
     * Unbind a global Role from a user entity.
     */
    removeRoleFromUser(userId: string, roleCode: string): Promise<void>;
    /**
     * Ad-Hoc directly attach specific granular Permissions to a single User, bypassing Role boundaries.
     */
    assignPermissionsToUser(userId: string, permissionCodes: string[]): Promise<void>;
    /**
     * Ad-Hoc strip direct granular Permissions bindings from a specific User.
     */
    removePermissionsFromUser(userId: string, permissionCodes: string[]): Promise<void>;
}

interface UpdateProfileParams {
    first_name?: string;
    last_name?: string;
    [key: string]: any;
}
interface AdminUpdateUserParams {
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
    is_locked?: boolean;
    max_sessions?: number;
    max_devices?: number;
}
declare class UserModule {
    private client;
    constructor(client: TenxyteHttpClient);
    /** Retrieve your current comprehensive Profile metadata matching the active network bearer token. */
    getProfile(): Promise<any>;
    /** Modify your active profile core details or injected application metadata. */
    updateProfile(data: UpdateProfileParams): Promise<any>;
    /**
     * Upload an avatar using FormData.
     * Ensure the environment supports FormData (browser or Node.js v18+).
     * @param formData The FormData object containing the 'avatar' field.
     */
    uploadAvatar(formData: FormData): Promise<any>;
    /**
     * Trigger self-deletion of an entire account data boundary.
     * @param password - Requires the active system password as destructive proof of intent.
     * @param otpCode - (Optional) If an OTP was queried prior to attempting account deletion.
     */
    deleteAccount(password: string, otpCode?: string): Promise<void>;
    /** (Admin only) Lists users paginated matching criteria. */
    listUsers(params?: Record<string, any>): Promise<any[]>;
    /** (Admin only) Gets deterministic data related to a remote unassociated user. */
    getUser(userId: string): Promise<any>;
    /** (Admin only) Modifies configuration/details or capacity bounds related to a remote unassociated user. */
    adminUpdateUser(userId: string, data: AdminUpdateUserParams): Promise<any>;
    /** (Admin only) Force obliterate a User boundary. Can affect relational database stability if not bound carefully. */
    adminDeleteUser(userId: string): Promise<void>;
    /** (Admin only) Apply a permanent suspension / ban state globally on a user token footprint. */
    banUser(userId: string, reason?: string): Promise<void>;
    /** (Admin only) Recover a user footprint from a global ban state. */
    unbanUser(userId: string): Promise<void>;
    /** (Admin only) Apply a temporary lock bounding block on a user interaction footprint. */
    lockUser(userId: string, durationMinutes?: number, reason?: string): Promise<void>;
    /** (Admin only) Releases an arbitrary temporary system lock placed on a user bounds. */
    unlockUser(userId: string): Promise<void>;
}

interface OrgMembership {
    id: number;
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: {
        code: string;
        name: string;
    };
    joined_at: string;
}
interface OrgTreeNode {
    id: number;
    name: string;
    slug: string;
    children: OrgTreeNode[];
}
declare class B2bModule {
    private client;
    private currentOrgSlug;
    constructor(client: TenxyteHttpClient);
    /**
     * Set the active Organization context.
     * Subsequent API requests will automatically include the `X-Org-Slug` header.
     * @param slug - The unique string identifier of the organization.
     */
    switchOrganization(slug: string): void;
    /**
     * Clear the active Organization context, dropping the `X-Org-Slug` header for standard User operations.
     */
    clearOrganization(): void;
    /** Get the currently active Organization slug context if set. */
    getCurrentOrganizationSlug(): string | null;
    /** Create a new top-level or child Organization in the backend. */
    createOrganization(data: {
        name: string;
        slug?: string;
        description?: string;
        parent_id?: number;
        metadata?: Record<string, unknown>;
        max_members?: number;
    }): Promise<Organization>;
    /** List organizations the currently authenticated user belongs to. */
    listMyOrganizations(params?: {
        search?: string;
        is_active?: boolean;
        parent?: string;
        ordering?: string;
        page?: number;
        page_size?: number;
    }): Promise<PaginatedResponse<Organization>>;
    /** Retrieve details about a specific organization by slug. */
    getOrganization(slug: string): Promise<Organization>;
    /** Update configuration and metadata of an Organization. */
    updateOrganization(slug: string, data: Partial<{
        name: string;
        slug: string;
        description: string;
        parent_id: number | null;
        metadata: Record<string, unknown>;
        max_members: number;
        is_active: boolean;
    }>): Promise<Organization>;
    /** Permanently delete an Organization. */
    deleteOrganization(slug: string): Promise<{
        message: string;
    }>;
    /** Retrieve the topology subtree extending downward from this point. */
    getOrganizationTree(slug: string): Promise<OrgTreeNode>;
    /** List users bound to a specific Organization. */
    listMembers(slug: string, params?: {
        search?: string;
        role?: 'owner' | 'admin' | 'member';
        status?: 'active' | 'inactive' | 'pending';
        ordering?: string;
        page?: number;
        page_size?: number;
    }): Promise<PaginatedResponse<OrgMembership>>;
    /** Add a user directly into an Organization with a designated role. */
    addMember(slug: string, data: {
        user_id: number;
        role_code: string;
    }): Promise<OrgMembership>;
    /** Evolve or demote an existing member's role within the Organization. */
    updateMemberRole(slug: string, userId: number, roleCode: string): Promise<OrgMembership>;
    /** Kick a user out of the Organization. */
    removeMember(slug: string, userId: number): Promise<{
        message: string;
    }>;
    /** Send an onboarding email invitation to join an Organization. */
    inviteMember(slug: string, data: {
        email: string;
        role_code: string;
        expires_in_days?: number;
    }): Promise<{
        id: number;
        email: string;
        role: string;
        token: string;
        expires_at: string;
        invited_by: {
            id: number;
            email: string;
        };
        organization: {
            id: number;
            name: string;
            slug: string;
        };
    }>;
    /** Fetch a definition matrix of what Organization-level roles can be assigned. */
    listOrgRoles(): Promise<Array<{
        code: string;
        name: string;
        description: string;
        weight: number;
        permissions: Array<{
            code: string;
            name: string;
            description: string;
        }>;
        is_system_role: boolean;
        created_at: string;
    }>>;
}

declare class AiModule {
    private client;
    private agentToken;
    private traceId;
    constructor(client: TenxyteHttpClient);
    /**
     * Create an AgentToken granting specific deterministic limits to an AI Agent.
     */
    createAgentToken(data: {
        agent_id: string;
        permissions?: string[];
        expires_in?: number;
        organization?: string;
        budget_limit_usd?: number;
        circuit_breaker?: {
            max_requests?: number;
            window_seconds?: number;
        };
        dead_mans_switch?: {
            heartbeat_required_every?: number;
        };
    }): Promise<{
        id: number;
        token: string;
        agent_id: string;
        status: string;
        expires_at: string;
    }>;
    /**
     * Set the SDK to operate on behalf of an Agent using the generated Agent Token payload.
     * Overrides standard `Authorization` headers with `AgentBearer`.
     */
    setAgentToken(token: string): void;
    /** Disables the active Agent override and reverts to standard User session requests. */
    clearAgentToken(): void;
    /** Check if the SDK is currently mocking requests as an AI Agent. */
    isAgentMode(): boolean;
    /** List previously provisioned active Agent tokens. */
    listAgentTokens(): Promise<AgentTokenSummary[]>;
    /** Fetch the status and configuration of a specific AgentToken. */
    getAgentToken(tokenId: number): Promise<AgentTokenSummary>;
    /** Irreversibly revoke a targeted AgentToken from acting upon the Tenant. */
    revokeAgentToken(tokenId: number): Promise<{
        status: 'revoked';
    }>;
    /** Temporarily freeze an AgentToken by forcibly closing its Circuit Breaker. */
    suspendAgentToken(tokenId: number): Promise<{
        status: 'suspended';
    }>;
    /** Emergency kill-switch to wipe all operational Agent Tokens. */
    revokeAllAgentTokens(): Promise<{
        status: 'revoked';
        count: number;
    }>;
    /** Satisfy an Agent's Dead-Man's switch heartbeat requirement to prevent suspension. */
    sendHeartbeat(tokenId: number): Promise<{
        status: 'ok';
    }>;
    /** List intercepted HTTP 202 actions waiting for Human interaction / approval. */
    listPendingActions(): Promise<AgentPendingAction[]>;
    /** Complete a pending HITL authorization to finally flush the Agent action to backend systems. */
    confirmPendingAction(confirmationToken: string): Promise<{
        status: 'confirmed';
    }>;
    /** Block an Agent action permanently. */
    denyPendingAction(confirmationToken: string): Promise<{
        status: 'denied';
    }>;
    /** Start piping the `X-Prompt-Trace-ID` custom header outwards for tracing logs against LLM inputs. */
    setTraceId(traceId: string): void;
    /** Disable trace forwarding context. */
    clearTraceId(): void;
    /**
     * Report consumption costs associated with a backend invocation back to Tenxyte for strict circuit budgeting.
     * @param tokenId - AgentToken evaluating ID.
     * @param usage - Sunk token costs or explicit USD derivations.
     */
    reportUsage(tokenId: number, usage: {
        cost_usd: number;
        prompt_tokens: number;
        completion_tokens: number;
    }): Promise<{
        status: 'ok';
    } | {
        error: 'Budget exceeded';
        status: 'suspended';
    }>;
}

/**
 * The primary entry point for the Tenxyte SDK.
 * Groups together logic for authentication, security, organization switching, and AI control.
 */
declare class TenxyteClient {
    /** The core HTTP wrapper handling network interception and parsing */
    http: TenxyteHttpClient;
    /** Authentication module (Login, Signup, Magic link, session handling) */
    auth: AuthModule;
    /** Security module (2FA, WebAuthn, Passwords, OTPs) */
    security: SecurityModule;
    /** Role-Based Access Control and permission checking module */
    rbac: RbacModule;
    /** Connected user's profile and management module */
    user: UserModule;
    /** Business-to-Business organizations module (multi-tenant environments) */
    b2b: B2bModule;
    /** AIRS - AI Responsibility & Security module (Agent tokens, Circuit breakers, HITL) */
    ai: AiModule;
    /**
     * Initializes the SDK with connection details for your Tenxyte-powered API.
     * @param options Configuration options including `baseUrl` and custom headers like `X-Access-Key`
     *
     * @example
     * ```typescript
     * const tx = new TenxyteClient({
     *     baseUrl: 'https://api.my-service.com',
     *     headers: { 'X-Access-Key': 'pkg_abc123' }
     * });
     * ```
     */
    constructor(options: HttpClientOptions);
}

export { type AdminUpdateUserParams, type AgentPendingAction, type AgentTokenSummary, AuthModule, type GeneratedSchema, type HttpClientOptions, type LoginEmailOptions, type LoginPhoneOptions, type MagicLinkRequest, type Organization, type PaginatedResponse, type Permission, RbacModule, type RegisterRequest, type RequestConfig, type Role, SecurityModule, type SocialLoginRequest, TenxyteClient, type TenxyteError, type TenxyteErrorCode, TenxyteHttpClient, type TenxyteUser, type TokenPair, type UpdateProfileParams, UserModule };
