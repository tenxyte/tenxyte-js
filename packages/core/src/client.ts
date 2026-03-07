import { TenxyteHttpClient, HttpClientOptions } from './http/client';
import { AuthModule } from './modules/auth';
import { SecurityModule } from './modules/security';
import { RbacModule } from './modules/rbac';
import { UserModule } from './modules/user';
import { B2bModule } from './modules/b2b';
import { AiModule } from './modules/ai';

/**
 * The primary entry point for the Tenxyte SDK.
 * Groups together logic for authentication, security, organization switching, and AI control.
 */
export class TenxyteClient {
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
    constructor(options: HttpClientOptions) {
        this.http = new TenxyteHttpClient(options);
        this.auth = new AuthModule(this.http);
        this.security = new SecurityModule(this.http);
        this.rbac = new RbacModule(this.http);
        this.user = new UserModule(this.http);
        this.b2b = new B2bModule(this.http);
        this.ai = new AiModule(this.http);
    }
}
