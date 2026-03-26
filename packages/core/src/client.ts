import { TenxyteHttpClient } from './http/client';
import { createAuthInterceptor, createRefreshInterceptor, createDeviceInfoInterceptor, createRetryInterceptor } from './http/interceptors';
import type { TenxyteContext } from './http/interceptors';
import type { TenxyteClientConfig, ResolvedTenxyteConfig } from './config';
import type { TenxyteStorage } from './storage';
import { resolveConfig } from './config';
import { AuthModule } from './modules/auth';
import { SecurityModule } from './modules/security';
import { RbacModule } from './modules/rbac';
import { UserModule } from './modules/user';
import { B2bModule } from './modules/b2b';
import { AiModule } from './modules/ai';
import { ApplicationsModule } from './modules/applications';
import { AdminModule } from './modules/admin';
import { GdprModule } from './modules/gdpr';
import { DashboardModule } from './modules/dashboard';
import { EventEmitter } from './utils/events';
import { decodeJwt } from './utils/jwt';
import type { DecodedTenxyteToken } from './utils/jwt';

/**
 * Map of all SDK events and their associated payload types.
 */
export interface TenxyteEventMap {
    /** Fired when the active session can no longer be recovered (refresh token expired/revoked). */
    'session:expired': void;
    /** Fired after a successful silent token refresh. Payload is the new access token. */
    'token:refreshed': { accessToken: string };
    /** Fired after tokens are persisted to storage (login, register, refresh). */
    'token:stored': { accessToken: string; refreshToken?: string };
    /** Fired when an AI agent action requires human-in-the-loop approval (HTTP 202). */
    'agent:awaiting_approval': { action: unknown };
    /** Fired on unrecoverable SDK errors that are not tied to a specific call. */
    'error': { error: unknown };
}

/**
 * The primary entry point for the Tenxyte SDK.
 * Groups together logic for authentication, security, organization switching, and AI control.
 */
export class TenxyteClient {
    /** Fully resolved configuration (all defaults applied). */
    public readonly config: ResolvedTenxyteConfig;
    /** Persistent token storage back-end (defaults to MemoryStorage). */
    public readonly storage: TenxyteStorage;
    /** Shared mutable context used by interceptors (org slug, agent trace ID). */
    public readonly context: TenxyteContext;
    /** The core HTTP wrapper handling network interception and parsing */
    public http: TenxyteHttpClient;
    /** Authentication module (Login, Signup, Magic link, session handling) */
    public auth: AuthModule;
    /** Security module (2FA, WebAuthn, Passwords, OTPs) */
    public security: SecurityModule;
    /** Role-Based Access Control and permission checking module */
    public rbac: RbacModule;
    /** Connected user's profile and management module */
    public user: UserModule;
    /** Business-to-Business organizations module (multi-tenant environments) */
    public b2b: B2bModule;
    /** AIRS - AI Responsibility & Security module (Agent tokens, Circuit breakers, HITL) */
    public ai: AiModule;
    /** Applications module (API client CRUD, credential management) */
    public applications: ApplicationsModule;
    /** Admin module (audit logs, login attempts, blacklisted tokens, refresh tokens) */
    public admin: AdminModule;
    /** GDPR module (account deletion, data export, deletion request management) */
    public gdpr: GdprModule;
    /** Dashboard module (global, auth, security, GDPR, organization statistics) */
    public dashboard: DashboardModule;

    /** Internal event emitter used via composition. */
    private emitter: EventEmitter<TenxyteEventMap>;

    /**
     * Initializes the SDK with connection details for your Tenxyte-powered API.
     *
     * Accepts the full TenxyteClientConfig. Minimal usage with just { baseUrl }
     * is still supported for backward compatibility.
     *
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
    constructor(options: TenxyteClientConfig) {
        this.config = resolveConfig(options);
        this.storage = this.config.storage;

        this.emitter = new EventEmitter<TenxyteEventMap>();

        this.context = { activeOrgSlug: null, agentTraceId: null };

        this.http = new TenxyteHttpClient({
            baseUrl: this.config.baseUrl,
            headers: this.config.headers,
            timeoutMs: this.config.timeoutMs,
        });

        // Auto-inject Authorization header + contextual headers on every request
        this.http.addRequestInterceptor(createAuthInterceptor(this.storage, this.context));

        // Auto-inject device_info into authentication request bodies
        if (this.config.autoDeviceInfo) {
            this.http.addRequestInterceptor(createDeviceInfoInterceptor(this.config.deviceInfoOverride));
        }

        // Auto-retry: configurable retry middleware with exponential backoff
        if (this.config.retryConfig) {
            this.http.addResponseInterceptor(
                createRetryInterceptor(this.config.retryConfig, this.config.logger),
            );
        }

        // Auto-refresh: silently retry on 401 by refreshing the access token
        if (this.config.autoRefresh) {
            this.http.addResponseInterceptor(
                createRefreshInterceptor(
                    this.http,
                    this.storage,
                    () => {
                        this.emit('session:expired', undefined as void);
                        this.config.onSessionExpired?.();
                    },
                    (accessToken, refreshToken) => {
                        this.rbac.setToken(accessToken);
                        this.emit('token:refreshed', { accessToken });
                        this.emit('token:stored', { accessToken, refreshToken });
                    },
                    this.config.cookieMode,
                ),
            );
        }

        this.rbac = new RbacModule(this.http);
        this.auth = new AuthModule(
            this.http,
            this.storage,
            (accessToken, refreshToken) => {
                this.rbac.setToken(accessToken);
                this.emit('token:stored', { accessToken, refreshToken });
            },
            () => {
                this.rbac.setToken(null);
                this.emit('session:expired', undefined as void);
            },
        );
        this.security = new SecurityModule(this.http);
        this.user = new UserModule(this.http);
        this.b2b = new B2bModule(this.http);
        this.ai = new AiModule(this.http, this.config.logger);
        this.applications = new ApplicationsModule(this.http);
        this.admin = new AdminModule(this.http);
        this.gdpr = new GdprModule(this.http);
        this.dashboard = new DashboardModule(this.http);
    }

    // ─── Event delegation ───

    /** Subscribe to an SDK event. Returns an unsubscribe function. */
    on<K extends keyof TenxyteEventMap>(event: K, callback: (payload: TenxyteEventMap[K]) => void): () => void {
        return this.emitter.on(event, callback);
    }

    /** Subscribe to an SDK event exactly once. Returns an unsubscribe function. */
    once<K extends keyof TenxyteEventMap>(event: K, callback: (payload: TenxyteEventMap[K]) => void): () => void {
        return this.emitter.once(event, callback);
    }

    /** Unsubscribe a previously registered callback from an SDK event. */
    off<K extends keyof TenxyteEventMap>(event: K, callback: (payload: TenxyteEventMap[K]) => void): void {
        this.emitter.off(event, callback);
    }

    /** Emit an SDK event (internal use). */
    emit<K extends keyof TenxyteEventMap>(event: K, payload: TenxyteEventMap[K]): void {
        this.emitter.emit(event, payload);
    }

    // ─── High-level helpers ───

    /**
     * Check whether a valid (non-expired) access token exists in storage.
     * Performs a synchronous JWT expiry check — no network call.
     */
    async isAuthenticated(): Promise<boolean> {
        const token = await this.storage.getItem('tx_access');
        if (!token) return false;
        return !this.isTokenExpiredSync(token);
    }

    /**
     * Return the current access token from storage, or `null` if absent.
     */
    async getAccessToken(): Promise<string | null> {
        return this.storage.getItem('tx_access');
    }

    /**
     * Decode the current access token and return the JWT payload.
     * Returns `null` if no token is stored or if decoding fails.
     * No network call is made — this reads from the cached JWT.
     */
    async getCurrentUser(): Promise<DecodedTenxyteToken | null> {
        const token = await this.storage.getItem('tx_access');
        if (!token) return null;
        return decodeJwt(token);
    }

    /**
     * Check whether the stored access token is expired without making a network call.
     * Returns `true` if expired or if no token is present.
     */
    async isTokenExpired(): Promise<boolean> {
        const token = await this.storage.getItem('tx_access');
        if (!token) return true;
        return this.isTokenExpiredSync(token);
    }

    /** Synchronous helper: checks JWT `exp` claim against current time. */
    private isTokenExpiredSync(token: string): boolean {
        const decoded = decodeJwt(token);
        if (!decoded?.exp) return true;
        // Allow 30s clock skew
        return decoded.exp * 1000 < Date.now() - 30_000;
    }

    // ─── Framework wrapper interface ───

    /**
     * Returns a synchronous snapshot of the SDK state.
     * Designed for consumption by framework wrappers (React, Vue, etc.).
     * Note: This is async because storage access may be async.
     */
    async getState(): Promise<TenxyteClientState> {
        const token = await this.storage.getItem('tx_access');
        const isAuthenticated = token ? !this.isTokenExpiredSync(token) : false;
        const user = token ? decodeJwt(token) : null;

        return {
            isAuthenticated,
            user,
            accessToken: token,
            activeOrg: this.context.activeOrgSlug,
            isAgentMode: this.ai.isAgentMode(),
        };
    }
}

/**
 * Snapshot of the SDK state, intended for framework wrappers.
 *
 * **Event contract for reactive bindings:**
 * - `token:stored`     → re-read state (login, register, refresh succeeded)
 * - `token:refreshed`  → access token was silently rotated
 * - `session:expired`  → clear authenticated state
 * - `agent:awaiting_approval` → an AI action needs human confirmation
 * - `error`            → unrecoverable SDK error
 */
export interface TenxyteClientState {
    /** Whether the user has a valid, non-expired access token. */
    isAuthenticated: boolean;
    /** Decoded JWT payload of the current access token, or `null`. */
    user: DecodedTenxyteToken | null;
    /** Raw access token string, or `null`. */
    accessToken: string | null;
    /** Currently active organization slug, or `null`. */
    activeOrg: string | null;
    /** Whether the SDK is operating in AI Agent mode. */
    isAgentMode: boolean;
}
