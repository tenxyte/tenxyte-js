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
 * Standard SDK Token Pair (internal structure normalized by interceptors)
 */
interface TokenPair {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    device_summary: string | null;
}
/**
 * Standardized API Error Response wrapper
 */
interface TenxyteError {
    error: string;
    code: TenxyteErrorCode;
    details?: Record<string, string[]> | string;
    retry_after?: number;
}
type TenxyteErrorCode = 'LOGIN_FAILED' | 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_BANNED' | '2FA_REQUIRED' | 'ADMIN_2FA_SETUP_REQUIRED' | 'TOKEN_EXPIRED' | 'TOKEN_BLACKLISTED' | 'REFRESH_FAILED' | 'PERMISSION_DENIED' | 'SESSION_LIMIT_EXCEEDED' | 'DEVICE_LIMIT_EXCEEDED' | 'RATE_LIMITED' | 'INVALID_OTP' | 'OTP_EXPIRED' | 'INVALID_PROVIDER' | 'SOCIAL_AUTH_FAILED' | 'VALIDATION_URL_REQUIRED' | 'INVALID_TOKEN' | 'CONFIRMATION_REQUIRED' | 'PASSWORD_REQUIRED' | 'INVALID_PASSWORD' | 'INVALID_DEVICE_INFO' | 'ORG_NOT_FOUND' | 'NOT_ORG_MEMBER' | 'NOT_OWNER' | 'ALREADY_MEMBER' | 'MEMBER_LIMIT_EXCEEDED' | 'HAS_CHILDREN' | 'CIRCULAR_HIERARCHY' | 'LAST_OWNER_REQUIRED' | 'INVITATION_EXISTS' | 'INVALID_ROLE' | 'AGENT_NOT_FOUND' | 'AGENT_SUSPENDED' | 'AGENT_REVOKED' | 'AGENT_EXPIRED' | 'BUDGET_EXCEEDED' | 'RATE_LIMIT_EXCEEDED' | 'HEARTBEAT_MISSING' | 'AIRS_DISABLED';
/**
 * Organization Structure
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
     * Authenticate user with email and password
     */
    loginWithEmail(data: GeneratedSchema['LoginEmail']): Promise<TokenPair>;
    /**
     * Authenticate user with international phone number and password
     */
    loginWithPhone(data: GeneratedSchema['LoginPhone']): Promise<TokenPair>;
    /**
     * Register a new user
     */
    register(data: RegisterRequest): Promise<any>;
    /**
     * Logout from the current session
     */
    logout(refreshToken: string): Promise<void>;
    /**
     * Logout from all sessions (revokes all refresh tokens)
     */
    logoutAll(): Promise<void>;
    /**
     * Request a magic link for sign-in
     */
    requestMagicLink(data: MagicLinkRequest): Promise<void>;
    /**
     * Verify a magic link token
     */
    verifyMagicLink(token: string): Promise<TokenPair>;
    /**
     * Perform OAuth2 Social Authentication (e.g. Google, GitHub)
     */
    loginWithSocial(provider: 'google' | 'github' | 'microsoft' | 'facebook', data: SocialLoginRequest): Promise<TokenPair>;
    /**
     * Handle Social Auth Callback (authorization code flow)
     */
    handleSocialCallback(provider: 'google' | 'github' | 'microsoft' | 'facebook', code: string, redirectUri: string): Promise<TokenPair>;
}

interface OtpRequestParams {
    email?: string;
    phone_country_code?: string;
    phone_number?: string;
    type: 'email_verification' | 'phone_verification' | 'password_reset';
}
interface VerifyOtpEmailParams {
    email: string;
    code: string;
}
interface VerifyOtpPhoneParams {
    phone_country_code: string;
    phone_number: string;
    code: string;
}
interface Setup2FAResponse {
    qr_code_url: string;
    secret: string;
    backup_codes: string[];
}
interface WebAuthnRegisterBeginResponse {
    publicKey: any;
}
interface WebAuthnAuthenticateBeginResponse {
    publicKey: any;
}
declare class SecurityModule {
    private client;
    constructor(client: TenxyteHttpClient);
    requestOtp(data: OtpRequestParams): Promise<void>;
    verifyOtpEmail(data: VerifyOtpEmailParams): Promise<void>;
    verifyOtpPhone(data: VerifyOtpPhoneParams): Promise<void>;
    get2FAStatus(): Promise<{
        is_enabled: boolean;
        backup_codes_remaining: number;
    }>;
    setup2FA(): Promise<Setup2FAResponse>;
    confirm2FA(totp_code: string): Promise<void>;
    disable2FA(totp_code: string, password?: string): Promise<void>;
    regenerateBackupCodes(totp_code: string): Promise<{
        backup_codes: string[];
    }>;
    resetPasswordRequest(data: {
        email?: string;
        phone_country_code?: string;
        phone_number?: string;
    }): Promise<void>;
    resetPasswordConfirm(data: {
        otp_code: string;
        new_password: string;
        email?: string;
        phone_country_code?: string;
        phone_number?: string;
    }): Promise<void>;
    changePassword(data: {
        current_password: string;
        new_password: string;
    }): Promise<void>;
    checkPasswordStrength(data: {
        password: string;
        email?: string;
    }): Promise<{
        score: number;
        feedback: string[];
    }>;
    getPasswordRequirements(): Promise<any>;
    registerWebAuthnBegin(): Promise<WebAuthnRegisterBeginResponse>;
    registerWebAuthnComplete(data: any): Promise<void>;
    authenticateWebAuthnBegin(data?: {
        email?: string;
    }): Promise<WebAuthnAuthenticateBeginResponse>;
    authenticateWebAuthnComplete(data: any): Promise<TokenPair>;
    listWebAuthnCredentials(): Promise<any[]>;
    deleteWebAuthnCredential(credentialId: string): Promise<void>;
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
     * Cache a token to use for parameter-less synchronous checks.
     */
    setToken(token: string | null): void;
    private getDecodedToken;
    hasRole(role: string, token?: string): boolean;
    hasAnyRole(roles: string[], token?: string): boolean;
    hasAllRoles(roles: string[], token?: string): boolean;
    hasPermission(permission: string, token?: string): boolean;
    hasAnyPermission(permissions: string[], token?: string): boolean;
    hasAllPermissions(permissions: string[], token?: string): boolean;
    listRoles(): Promise<Role[]>;
    createRole(data: {
        name: string;
        description?: string;
        permission_codes?: string[];
        is_default?: boolean;
    }): Promise<Role>;
    getRole(roleId: string): Promise<Role>;
    updateRole(roleId: string, data: {
        name?: string;
        description?: string;
        permission_codes?: string[];
        is_default?: boolean;
    }): Promise<Role>;
    deleteRole(roleId: string): Promise<void>;
    getRolePermissions(roleId: string): Promise<Permission[]>;
    addPermissionsToRole(roleId: string, permission_codes: string[]): Promise<void>;
    removePermissionsFromRole(roleId: string, permission_codes: string[]): Promise<void>;
    listPermissions(): Promise<Permission[]>;
    createPermission(data: {
        code: string;
        name: string;
        description?: string;
        parent_code?: string;
    }): Promise<Permission>;
    getPermission(permissionId: string): Promise<Permission>;
    updatePermission(permissionId: string, data: {
        name?: string;
        description?: string;
    }): Promise<Permission>;
    deletePermission(permissionId: string): Promise<void>;
    assignRoleToUser(userId: string, roleCode: string): Promise<void>;
    removeRoleFromUser(userId: string, roleCode: string): Promise<void>;
    assignPermissionsToUser(userId: string, permissionCodes: string[]): Promise<void>;
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
    getProfile(): Promise<any>;
    updateProfile(data: UpdateProfileParams): Promise<any>;
    /**
     * Upload an avatar using FormData.
     * Ensure the environment supports FormData (browser or Node.js v18+).
     * @param formData The FormData object containing the 'avatar' field.
     */
    uploadAvatar(formData: FormData): Promise<any>;
    deleteAccount(password: string, otpCode?: string): Promise<void>;
    listUsers(params?: Record<string, any>): Promise<any[]>;
    getUser(userId: string): Promise<any>;
    adminUpdateUser(userId: string, data: AdminUpdateUserParams): Promise<any>;
    adminDeleteUser(userId: string): Promise<void>;
    banUser(userId: string, reason?: string): Promise<void>;
    unbanUser(userId: string): Promise<void>;
    lockUser(userId: string, durationMinutes?: number, reason?: string): Promise<void>;
    unlockUser(userId: string): Promise<void>;
}

declare class TenxyteClient {
    http: TenxyteHttpClient;
    auth: AuthModule;
    security: SecurityModule;
    rbac: RbacModule;
    user: UserModule;
    constructor(options: HttpClientOptions);
}

export { type AdminUpdateUserParams, type AgentPendingAction, type AgentTokenSummary, AuthModule, type GeneratedSchema, type HttpClientOptions, type LoginEmailOptions, type LoginPhoneOptions, type MagicLinkRequest, type Organization, type OtpRequestParams, type PaginatedResponse, type Permission, RbacModule, type RegisterRequest, type RequestConfig, type Role, SecurityModule, type Setup2FAResponse, type SocialLoginRequest, TenxyteClient, type TenxyteError, type TenxyteErrorCode, TenxyteHttpClient, type TenxyteUser, type TokenPair, type UpdateProfileParams, UserModule, type VerifyOtpEmailParams, type VerifyOtpPhoneParams, type WebAuthnAuthenticateBeginResponse, type WebAuthnRegisterBeginResponse };
