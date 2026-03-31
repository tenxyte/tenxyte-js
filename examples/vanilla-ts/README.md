# Tenxyte JS — Vanilla TypeScript Example

A complete reference implementation of `@tenxyte/core` using Vanilla TypeScript + Vite. Covers every SDK module with a functional single-page application.

---

## Getting Started

```bash
# 1. Copy and fill in your credentials
cp .env.example .env

# 2. Install dependencies
pnpm install

# 3. Start the dev server
pnpm dev
```

> The dev server starts at `http://localhost:5173`. Set `VITE_TENXYTE_BASE_URL` to match your backend (default: `http://localhost:8000`). Credentials are found in your Tenxyte dashboard → **Settings → API Keys**.

---

## Client Initialization

```typescript
import { TenxyteClient } from '@tenxyte/core'

export const tx = new TenxyteClient({
    baseUrl: import.meta.env.VITE_TENXYTE_BASE_URL,
    headers: {
        'X-Access-Key':    import.meta.env.VITE_TENXYTE_ACCESS_KEY,
        'X-Access-Secret': import.meta.env.VITE_TENXYTE_ACCESS_SECRET,
    },
    autoRefresh:    true,  // auto-renew access tokens
    autoDeviceInfo: true,  // injects device fingerprint automatically — do NOT set device_info manually
})
```

---

## Authentication (`tx.auth`)

```typescript
// Register
await tx.auth.register({ email, password, first_name, last_name, login: true })

// Email login
await tx.auth.loginWithEmail({ email, password })

// Email login with 2FA
await tx.auth.loginWithEmail({ email, password, totp_code: '123456' })

// Magic link
await tx.auth.requestMagicLink({ email })
await tx.auth.verifyMagicLink({ token })

// Google OAuth2 (PKCE)
const { url, code_verifier } = await tx.auth.getGoogleOAuthUrl({ redirect_uri })
// — redirect user to `url`, then on callback:
await tx.auth.exchangeGoogleCode({ code, code_verifier, redirect_uri })

// Logout
await tx.auth.logout()
await tx.auth.logoutAll()  // revokes all sessions
```

---

## Security (`tx.security`)

```typescript
// 2FA (TOTP)
const status = await tx.security.get2FAStatus()    // { is_enabled, backup_codes_remaining }
const { secret, qr_code_url } = await tx.security.setup2FA()
await tx.security.confirm2FA('123456')
await tx.security.disable2FA('123456')

// Password management
await tx.security.changePassword(currentPassword, newPassword)  // positional args
await tx.security.resetPasswordRequest({ email })
await tx.security.resetPasswordConfirm({ token, new_password })

// Password strength check
const { score, is_valid, errors } = await tx.security.checkPasswordStrength(password)
// score: 0–4  (0 = very weak, 4 = very strong)

// OTP
await tx.security.requestOtp({ delivery_method: 'email', purpose: 'login' })
await tx.security.verifyOtp({ otp: '123456', purpose: 'login' })

// Passkeys (WebAuthn)
await tx.security.registerWebAuthn()
const session = await tx.security.authenticateWebAuthn(email)
const creds = await tx.security.listWebAuthnCredentials()
await tx.security.deleteWebAuthnCredential(credentialId)
```

---

## Organizations & RBAC (`tx.b2b` · `tx.rbac`)

```typescript
// Organizations
const { results } = await tx.b2b.listMyOrganizations()
await tx.b2b.createOrganization({ name: 'Acme', slug: 'acme' })
await tx.b2b.switchOrganization('acme')  // sets X-Org-Slug header

// Members
const { results } = await tx.b2b.listMembers('acme')
await tx.b2b.inviteMember('acme', { email, role_code: 'member' })
await tx.b2b.updateMemberRole('acme', userId, 'admin')
await tx.b2b.removeMember('acme', userId)

// Roles & permissions (synchronous — reads from cached JWT)
const isAdmin = tx.rbac.hasRole('admin')
const canRead = tx.rbac.hasPermission('admin:read')

// Full role/permission management
const roles = await tx.rbac.listRoles()
await tx.rbac.assignRoleToUser(userId, 'admin')
await tx.rbac.removeRoleFromUser(userId, 'admin')
const perms = await tx.rbac.getUserPermissions(userId)
```

---

## AIRS — AI Agent (`tx.ai`)

> **Note**: `tx.ai.sendMessage()` does not exist in the SDK. The AI module manages **AgentToken lifecycle** and **Human-in-the-Loop (HITL)** flows only. Chat UI must be built separately.

```typescript
// Agent token lifecycle
const { token } = await tx.ai.createAgentToken()
tx.ai.setAgentToken(token)   // operate as agent
tx.ai.clearAgentToken()      // revert to user session

// Human-in-the-Loop (HITL) — triggered by HTTP 202 responses
const pending = await tx.ai.listPendingActions()
await tx.ai.confirmPendingAction(action.confirmation_token)
await tx.ai.denyPendingAction(action.confirmation_token)

// Listen for intercepted agent actions
tx.on('agent:awaiting_approval', ({ action }) => {
    // action: { id, permission, endpoint, payload, confirmation_token }
    showApprovalModal(action)
})
```

---

## Admin & Audit (`tx.admin` · `tx.dashboard` · `tx.applications`)

```typescript
// Dashboard stats
const stats    = await tx.dashboard.getStats({ compare: true })
const secStats = await tx.dashboard.getSecurityStats()
const gdprInfo = await tx.dashboard.getGdprStats()

// Audit logs (requires admin:read)
const logs = await tx.admin.listAuditLogs({ action: 'login_failed', page: 1, page_size: 20 })

// Token management (requires tokens.view / tokens.revoke)
const tokens = await tx.admin.listRefreshTokens({ user_id: 'uid' })
await tx.admin.revokeRefreshToken(tokenId)

// OAuth2 Applications
const apps = await tx.applications.listApplications()
const { client_id, client_secret } = await tx.applications.createApplication({ name, description })
// ⚠️ client_secret is shown only once — store it securely
await tx.applications.patchApplication(appId, { is_active: false })  // revoke
```

---

## GDPR (`tx.gdpr`)

```typescript
// Data export — password required; returns data synchronously (not email-based)
const data = await tx.gdpr.exportUserData(password)

// Account deletion — initiates 30-day grace period; password required
await tx.gdpr.requestAccountDeletion({ password, reason: 'User request' })
await tx.gdpr.cancelAccountDeletion(password)     // cancel within grace period
const status = await tx.gdpr.getAccountDeletionStatus()
```

> **SDK discrepancy**: integration docs show `requestAccountDeletion({ reason })` and `exportUserData()` without `password`. The actual SDK requires `password` in both calls.

---

## SDK Events

| Event | Payload | Description |
|---|---|---|
| `session:expired` | — | Access + refresh tokens are expired |
| `token:refreshed` | `{ accessToken }` | Access token was auto-renewed |
| `token:stored` | `{ accessToken, refreshToken }` | Tokens saved after login |
| `agent:awaiting_approval` | `{ action }` | Agent action intercepted (HTTP 202) |
| `error` | `{ error }` | Unhandled SDK error |

```typescript
tx.on('session:expired', () => navigate('/login'))
tx.on('token:refreshed', ({ accessToken }) => console.log('Refreshed'))
tx.on('agent:awaiting_approval', ({ action }) => showModal(action))
tx.on('error', ({ error }) => console.error(error))
```

---

## Project Structure

```
src/
├── client.ts          # TenxyteClient singleton
├── main.ts            # Entry point — layout, logger, router
├── router.ts          # Hash-based SPA router
├── layout.ts          # App shell (sidebar, header, event log)
├── pages/
│   ├── login.ts       # Email login, magic link, Google PKCE, 2FA
│   ├── register.ts    # Registration with password strength check
│   ├── dashboard.ts   # Post-login landing
│   ├── settings.ts    # 2FA, passkeys, password change, sessions, GDPR
│   ├── organizations.ts # Org list, member management, role assignment
│   ├── admin.ts       # Stats dashboard, audit logs, role management
│   ├── applications.ts # OAuth2 app CRUD with secret reveal
│   ├── ai-assistant.ts # HITL chat interface with approval modal
│   └── oauth-callback.ts # Google PKCE callback handler
└── utils/
    ├── logger.ts      # Event log panel + handleApiError()
    └── toast.ts       # Toast notification system
```

---

## Changelog

See [CHANGELOG.md](../../CHANGELOG.md).
