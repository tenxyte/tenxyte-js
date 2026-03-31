# @tenxyte/core

The official core JavaScript/TypeScript SDK for the **Tenxyte** API — a unified platform for authentication, multi-tenant organizations, RBAC, GDPR compliance, and AI agent security.

## Features

- **Authentication** — Email/password, phone, magic link, social OAuth2, registration
- **Security** — 2FA/TOTP, OTP verification, WebAuthn/Passkeys (FIDO2), password management
- **RBAC** — Role & permission management, synchronous JWT checks, user role assignment
- **User Management** — Profile CRUD, avatar upload, admin user operations
- **B2B Multi-Tenancy** — Organization CRUD, member management, invitations, context switching
- **AI Agent Security (AIRS)** — Agent tokens, circuit breakers, Human-in-the-Loop, usage reporting
- **Applications** — API client management, credential regeneration
- **Admin** — Audit logs, login attempts, blacklisted/refresh token management
- **GDPR** — Account deletion flows, data export, admin deletion request processing
- **Dashboard** — Global, auth, security, GDPR, and per-org statistics

## Installation

```bash
npm install @tenxyte/core
# or
yarn add @tenxyte/core
# or
pnpm add @tenxyte/core
```

## Quick Start

```typescript
import { TenxyteClient } from '@tenxyte/core';

const tx = new TenxyteClient({
    baseUrl: 'https://api.my-backend.com',
    headers: { 'X-Access-Key': 'your-public-app-key' },
});

// Login
const tokens = await tx.auth.loginWithEmail({
    email: 'user@example.com',
    password: 'secure_password!',
    device_info: '',
});

// Check authentication state
const isLoggedIn = await tx.isAuthenticated();
const user = await tx.getCurrentUser();
```

> **Important**: Never expose `X-Access-Secret` in frontend bundles. Use it exclusively server-side.

---

## Configuration

The `TenxyteClient` accepts a single configuration object. Only `baseUrl` is required.

```typescript
const tx = new TenxyteClient({
    // Required
    baseUrl: 'https://api.my-service.com',

    // Optional — extra headers for every request
    headers: { 'X-Access-Key': 'pkg_abc123' },

    // Optional — token storage backend (default: MemoryStorage)
    // Use LocalStorageAdapter for browser persistence
    storage: new LocalStorageAdapter(),

    // Optional — auto-refresh 401s silently (default: true)
    autoRefresh: true,

    // Optional — auto-inject device fingerprint into auth requests (default: true)
    autoDeviceInfo: true,

    // Optional — global request timeout in ms (default: undefined)
    timeoutMs: 10_000,

    // Optional — retry config for 429/5xx with exponential backoff
    retryConfig: { maxRetries: 3, baseDelayMs: 500 },

    // Optional — callback when session cannot be recovered
    onSessionExpired: () => router.push('/login'),

    // Optional — pluggable logger (default: silent no-op)
    logger: console,
    logLevel: 'debug', // 'silent' | 'error' | 'warn' | 'debug'

    // Optional — override auto-detected device info
    deviceInfoOverride: { app_name: 'MyApp', app_version: '2.0.0' },

    // Optional — cookie-based refresh token transport (default: false)
    // Enable when backend has TENXYTE_REFRESH_TOKEN_COOKIE_ENABLED=True
    cookieMode: false,
});
```

---

## Modules

### Authentication (`tx.auth`)

```typescript
// Email/password login
const tokens = await tx.auth.loginWithEmail({
    email: 'user@example.com',
    password: 'password123',
    device_info: '',
    totp_code: '123456', // optional, for 2FA
});

// Phone login
const tokens = await tx.auth.loginWithPhone({
    phone_country_code: '+1',
    phone_number: '5551234567',
    password: 'password123',
    device_info: '',
});

// Registration
const result = await tx.auth.register({
    email: 'new@example.com',
    password: 'StrongP@ss1',
    first_name: 'Jane',
    last_name: 'Doe',
});

// Magic Link (passwordless)
await tx.auth.requestMagicLink({ email: 'user@example.com', validation_url: 'https://myapp.com/verify' });
const tokens = await tx.auth.verifyMagicLink(urlToken);

// Social OAuth2
const tokens = await tx.auth.loginWithSocial('google', { id_token: 'jwt...' });

// Social OAuth2 with PKCE (RFC 7636)
const tokens = await tx.auth.loginWithSocial('google', {
    code: 'auth_code',
    redirect_uri: 'https://myapp.com/cb',
    code_verifier: 'pkce_verifier_string',
});
const tokens = await tx.auth.handleSocialCallback('github', 'auth_code', 'https://myapp.com/cb', 'pkce_verifier');

// Session management (refreshToken param is optional in cookie mode)
await tx.auth.logout('refresh_token_value');
await tx.auth.logoutAll();
await tx.auth.refreshToken('refresh_token_value');
```

### Security (`tx.security`)

```typescript
// 2FA (TOTP)
const status = await tx.security.get2FAStatus();
const { secret, qr_code_url, backup_codes } = await tx.security.setup2FA();
await tx.security.confirm2FA('123456');
await tx.security.disable2FA('123456');

// OTP
await tx.security.requestOtp({ delivery_method: 'email', purpose: 'login' });
const result = await tx.security.verifyOtp({ otp: '123456', purpose: 'login' });

// Password management
await tx.security.resetPasswordRequest({ email: 'user@example.com' });
await tx.security.resetPasswordConfirm({ token: '...', new_password: 'NewP@ss1' });
await tx.security.changePassword({ old_password: 'old', new_password: 'new' });

// WebAuthn / Passkeys
await tx.security.registerWebAuthn('My Laptop');
const session = await tx.security.authenticateWebAuthn('user@example.com');
const creds = await tx.security.listWebAuthnCredentials();
await tx.security.deleteWebAuthnCredential(credentialId);
```

### RBAC (`tx.rbac`)

```typescript
// Synchronous JWT checks (no network call)
tx.rbac.setToken(accessToken);
const isAdmin = tx.rbac.hasRole('admin');
const canEdit = tx.rbac.hasPermission('users.edit');
const hasAny = tx.rbac.hasAnyRole(['admin', 'manager']);
const hasAll = tx.rbac.hasAllRoles(['admin', 'superadmin']);

// CRUD operations (network calls)
const roles = await tx.rbac.listRoles();
await tx.rbac.createRole({ code: 'editor', name: 'Editor' });
await tx.rbac.assignRoleToUser('user-id', 'editor');
await tx.rbac.removeRoleFromUser('user-id', 'editor');

const permissions = await tx.rbac.listPermissions();
await tx.rbac.assignPermissionsToUser('user-id', ['posts.create', 'posts.edit']);
await tx.rbac.removePermissionsFromUser('user-id', ['posts.create']);

// Fetch user's roles/permissions from backend
const userRoles = await tx.rbac.getUserRoles('user-id');
const userPerms = await tx.rbac.getUserPermissions('user-id');
```

### User Management (`tx.user`)

```typescript
const profile = await tx.user.getProfile();
await tx.user.updateProfile({ first_name: 'Updated' });
await tx.user.uploadAvatar(fileFormData);
await tx.user.deleteAccount('my-password');
const myRoles = await tx.user.getMyRoles();

// Admin operations
const users = await tx.user.listUsers({ page: 1, page_size: 20 });
const user = await tx.user.getUser('user-id');
await tx.user.adminUpdateUser('user-id', { is_active: false });
await tx.user.adminDeleteUser('user-id');
await tx.user.banUser('user-id', 'spam');
```

### B2B Organizations (`tx.b2b`)

```typescript
// Context switching — auto-injects X-Org-Slug header
tx.b2b.switchOrganization('acme-corp');
const slug = tx.b2b.getCurrentOrganizationSlug(); // 'acme-corp'
tx.b2b.clearOrganization();

// Organization CRUD
const orgs = await tx.b2b.listOrganizations();
const org = await tx.b2b.createOrganization({ name: 'Acme Corp', slug: 'acme-corp' });
await tx.b2b.updateOrganization('acme-corp', { name: 'Acme Corp Inc.' });
await tx.b2b.deleteOrganization('acme-corp');

// Members
const members = await tx.b2b.listMembers('acme-corp');
await tx.b2b.addMember('acme-corp', { user_id: 'uid', role_code: 'member' });
await tx.b2b.updateMember('acme-corp', 'uid', { role_code: 'admin' });
await tx.b2b.removeMember('acme-corp', 'uid');

// Invitations
await tx.b2b.inviteMember('acme-corp', { email: 'dev@example.com', role_code: 'admin' });
const roles = await tx.b2b.listOrgRoles('acme-corp');
```

### AI Agent Security (`tx.ai`)

```typescript
// Agent token lifecycle
const agentData = await tx.ai.createAgentToken({
    agent_id: 'Invoice-Parser-Bot',
    permissions: ['invoices.read', 'invoices.create'],
    budget_limit_usd: 5.00,
    circuit_breaker: { max_requests: 100, window_seconds: 60 },
});

tx.ai.setAgentToken(agentData.token); // SDK switches to AgentBearer auth
tx.ai.isAgentMode(); // true
tx.ai.clearAgentToken(); // back to standard Bearer

// Token management
const tokens = await tx.ai.listAgentTokens();
const token = await tx.ai.getAgentToken('token-id');
await tx.ai.revokeAgentToken('token-id');
await tx.ai.suspendAgentToken('token-id');
await tx.ai.revokeAllAgentTokens();

// Human-in-the-Loop
const pending = await tx.ai.listPendingActions();
await tx.ai.confirmPendingAction('confirmation-token');
await tx.ai.denyPendingAction('confirmation-token');

// Monitoring
await tx.ai.sendHeartbeat('token-id');
await tx.ai.reportUsage('token-id', {
    cost_usd: 0.015,
    prompt_tokens: 1540,
    completion_tokens: 420,
});

// Traceability
tx.ai.setTraceId('trace-1234'); // adds X-Prompt-Trace-ID header
tx.ai.clearTraceId();
```

### Applications (`tx.applications`)

```typescript
const apps = await tx.applications.listApplications();
const app = await tx.applications.createApplication({
    name: 'My API Client',
    description: 'Backend service',
});
const detail = await tx.applications.getApplication('app-id');
await tx.applications.updateApplication('app-id', { name: 'Renamed' });
await tx.applications.patchApplication('app-id', { description: 'Updated desc' });
await tx.applications.deleteApplication('app-id');
const newCreds = await tx.applications.regenerateCredentials('app-id');
```

### Admin (`tx.admin`)

```typescript
// Audit logs
const logs = await tx.admin.listAuditLogs({ page: 1 });
const log = await tx.admin.getAuditLog('log-id');

// Login attempts
const attempts = await tx.admin.listLoginAttempts({ user_id: 'uid' });

// Blacklisted tokens
const blacklisted = await tx.admin.listBlacklistedTokens();
await tx.admin.cleanupBlacklistedTokens();

// Refresh tokens
const refreshTokens = await tx.admin.listRefreshTokens({ user_id: 'uid' });
await tx.admin.revokeRefreshToken('token-id');
```

### GDPR (`tx.gdpr`)

```typescript
// User-facing
await tx.gdpr.requestAccountDeletion({ reason: 'No longer needed' });
await tx.gdpr.confirmAccountDeletion('confirmation-code');
await tx.gdpr.cancelAccountDeletion();
const status = await tx.gdpr.getDeletionStatus();
const data = await tx.gdpr.exportUserData();

// Admin-facing
const requests = await tx.gdpr.listDeletionRequests({ status: 'pending' });
const request = await tx.gdpr.getDeletionRequest('request-id');
await tx.gdpr.processDeletionRequest('request-id', { action: 'approve' });
await tx.gdpr.processExpiredDeletions();
```

### Dashboard (`tx.dashboard`)

```typescript
const global = await tx.dashboard.getStats({ period: '30d', compare: true });
const auth = await tx.dashboard.getAuthStats();
const security = await tx.dashboard.getSecurityStats();
const gdpr = await tx.dashboard.getGdprStats();
const orgStats = await tx.dashboard.getOrganizationStats();
```

---

## SDK Events

The SDK emits events via a built-in `EventEmitter`. Use `tx.on()`, `tx.once()`, and `tx.off()` to subscribe.

| Event | Payload | When |
|---|---|---|
| `session:expired` | `void` | Refresh token expired/revoked, session unrecoverable |
| `token:refreshed` | `{ accessToken: string }` | Access token silently rotated via auto-refresh |
| `token:stored` | `{ accessToken: string; refreshToken?: string }` | Tokens persisted after login, register, or refresh |
| `agent:awaiting_approval` | `{ action: unknown }` | AI agent action requires human confirmation (HTTP 202) |
| `error` | `{ error: unknown }` | Unrecoverable SDK error not tied to a specific call |

```typescript
// React to session expiry
tx.on('session:expired', () => {
    router.push('/login');
});

// Track token refreshes
tx.on('token:refreshed', ({ accessToken }) => {
    console.log('Token refreshed silently');
});

// HITL notification
tx.on('agent:awaiting_approval', ({ action }) => {
    showApprovalDialog(action);
});
```

---

## High-Level Helpers

```typescript
// Check if user is authenticated (synchronous JWT expiry check)
const isLoggedIn = await tx.isAuthenticated();

// Get the raw access token
const token = await tx.getAccessToken();

// Get decoded JWT payload (no network call)
const user = await tx.getCurrentUser();

// Check token expiry
const expired = await tx.isTokenExpired();

// Get full SDK state snapshot (for framework wrappers)
const state = await tx.getState();
// { isAuthenticated, user, accessToken, activeOrg, isAgentMode }
```

---

## Migration Guide: v0.9 → v0.10

### New Features in v0.10

- **Cookie-based refresh tokens** — New `cookieMode` config option. When enabled, the SDK uses `credentials: 'include'` for refresh/logout requests and does not require a stored refresh token for silent refresh.
- **PKCE support** — `code_verifier` parameter added to `SocialLoginRequest` and `handleSocialCallback()` for RFC 7636 compliance.
- **Expanded error codes** — `TenxyteErrorCode` now includes all backend error codes: `MISSING_REFRESH_TOKEN`, `INVALID_REDIRECT_URI`, `PASSWORD_BREACHED`, `PASSWORD_REUSED`, `WEBAUTHN_*`, `LINK_EXPIRED`, `2FA_ALREADY_ENABLED`, and more.
- **Optional refresh token in responses** — `TokenPair.refresh_token` is now optional (absent when cookie mode is enabled on the backend).

### Breaking Changes

1. **`TokenPair.refresh_token` is now optional** — If you access `tokens.refresh_token` without a null check, add one:
   ```typescript
   if (tokens.refresh_token) {
       // Store or use the refresh token
   }
   ```

2. **`logout()` and `refreshToken()` parameters are now optional** — In cookie mode, you can call them without arguments:
   ```typescript
   // Cookie mode (refresh token is in HttpOnly cookie)
   await tx.auth.logout();
   await tx.auth.refreshToken();

   // Classic mode (still works)
   await tx.auth.logout('refresh_token_value');
   await tx.auth.refreshToken('refresh_token_value');
   ```

3. **`handleSocialCallback()` now accepts an optional 4th parameter** (`codeVerifier`).

---

## Migration Guide: v0.8 → v0.9

### Breaking Changes

1. **Constructor signature changed** — The client now accepts a `TenxyteClientConfig` object:
   ```typescript
   // Before (v0.8)
   const tx = new TenxyteClient({ baseUrl: '...', headers: { ... } });

   // After (v0.9) — same, but new options available
   const tx = new TenxyteClient({
       baseUrl: '...',
       headers: { ... },
       autoRefresh: true,    // NEW
       autoDeviceInfo: true, // NEW
       retryConfig: { ... }, // NEW
   });
   ```

2. **`loginWithEmail` now requires `device_info`**:
   ```typescript
   // Before (v0.8)
   await tx.auth.loginWithEmail({ email, password });

   // After (v0.9)
   await tx.auth.loginWithEmail({ email, password, device_info: '' });
   ```

3. **`requestMagicLink` now requires `validation_url`**:
   ```typescript
   // Before
   await tx.auth.requestMagicLink({ email });

   // After
   await tx.auth.requestMagicLink({ email, validation_url: 'https://...' });
   ```

4. **Auto-session management** — Tokens are now automatically stored and the `Authorization` header is automatically injected. You no longer need to manage this manually.

5. **New modules added** — `tx.applications`, `tx.admin`, `tx.gdpr`, `tx.dashboard` are now available.

6. **`register()` return type changed** — Now returns `RegisterResponse` (may include tokens if auto-login is enabled).

### New Features in v0.9

- Auto-refresh interceptor (silent 401 → refresh → retry)
- Configurable retry with exponential backoff (429/5xx)
- Device info auto-injection
- Pluggable logger with log levels
- High-level helpers (`isAuthenticated`, `getCurrentUser`, `isTokenExpired`)
- `getState()` for framework wrapper integration
- EventEmitter for reactive state (`session:expired`, `token:refreshed`, etc.)
- WebAuthn / Passkeys (FIDO2) support

---

## License

MIT
