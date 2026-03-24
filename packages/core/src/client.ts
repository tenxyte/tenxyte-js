import { TenxyteHttpClient } from './http/client';
import { createAuthInterceptor, createRefreshInterceptor } from './http/interceptors';
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
import { EventEmitter } from './utils/events';

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
                ),
            );
        }

        this.rbac = new RbacModule(this.http);
        this.auth = new AuthModule(this.http, this.storage, (accessToken, refreshToken) => {
            this.rbac.setToken(accessToken);
            this.emit('token:stored', { accessToken, refreshToken });
        });
        this.security = new SecurityModule(this.http);
        this.user = new UserModule(this.http);
        this.b2b = new B2bModule(this.http);
        this.ai = new AiModule(this.http);
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
}
