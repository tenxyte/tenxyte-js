![# TENXYTE • AI-Ready Backend Framework](https://tenxyte-graphics.s3.us-east-1.amazonaws.com/tenxyte-graphics/baniere_github.jpg)

# Tenxyte JS SDK

> Official JavaScript/TypeScript SDK for Tenxyte — Authentication, RBAC, 2FA, Magic Links, Passkeys, Social Login, Organizations (B2B), AI Agent Security, GDPR, and more.

[![npm @tenxyte/core](https://img.shields.io/npm/v/@tenxyte/core.svg?label=@tenxyte/core)](https://www.npmjs.com/package/@tenxyte/core)
[![npm @tenxyte/react](https://img.shields.io/npm/v/@tenxyte/react.svg?label=@tenxyte/react)](https://www.npmjs.com/package/@tenxyte/react)
[![npm @tenxyte/vue](https://img.shields.io/npm/v/@tenxyte/vue.svg?label=@tenxyte/vue)](https://www.npmjs.com/package/@tenxyte/vue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/tenxyte/tenxyte-js/actions/workflows/ci.yml/badge.svg)](https://github.com/tenxyte/tenxyte-js/actions/workflows/ci.yml)

---

## Quickstart — 2 minutes to your first API call

### 1. Install

```bash
npm install @tenxyte/core
```

> **Requirements:** Node.js 18+ or any modern browser. TypeScript types are included.

### 2. Initialize

```typescript
import { TenxyteClient } from '@tenxyte/core';

const tx = new TenxyteClient({
    baseUrl: 'https://api.my-backend.com',
    headers: { 'X-Access-Key': '<your-access-key>' },
});
```

### 3. First API call

```typescript
// Register
const result = await tx.auth.register({
    email: 'user@example.com',
    password: 'SecureP@ss1!',
    first_name: 'John',
    last_name: 'Doe',
});

// Login
const tokens = await tx.auth.loginWithEmail({
    email: 'user@example.com',
    password: 'SecureP@ss1!',
    device_info: '',
});

// Authenticated request — Authorization header is injected automatically
const profile = await tx.user.getProfile();
```

> **Important:** Never expose `X-Access-Secret` in frontend bundles. Use it exclusively server-side.

That's it — tokens are stored automatically, 401s trigger silent refresh, and `Authorization` is injected on every request.

---

## Packages

This monorepo contains three packages, published independently to npm:

| Package | Version | Description |
|---|---|---|
| [`@tenxyte/core`](./packages/core) | ![npm](https://img.shields.io/npm/v/@tenxyte/core.svg) | Framework-agnostic core SDK — works in Node.js, browsers, and any JS runtime |
| [`@tenxyte/react`](./packages/react) | ![npm](https://img.shields.io/npm/v/@tenxyte/react.svg) | React hooks (`useAuth`, `useUser`, `useOrganization`, `useRbac`) with automatic re-renders |
| [`@tenxyte/vue`](./packages/vue) | ![npm](https://img.shields.io/npm/v/@tenxyte/vue.svg) | Vue 3 composables (`useAuth`, `useUser`, `useOrganization`, `useRbac`) with reactive refs |

### Framework Bindings

**React** — Wrap your app once, use hooks everywhere:

```tsx
import { TenxyteProvider, useAuth } from '@tenxyte/react';

// In your root
<TenxyteProvider client={tx}>
    <App />
</TenxyteProvider>

// In any component
const { isAuthenticated, loginWithEmail, logout } = useAuth();
```

**Vue** — Install the plugin, use composables:

```vue
<!-- main.ts -->
app.use(tenxytePlugin, tx);

<!-- Any component -->
<script setup>
const { isAuthenticated, loginWithEmail, logout } = useAuth();
</script>
```

---

## Key Features

✨ **Core Authentication**
- JWT with access + refresh tokens, auto-rotation, blacklisting
- Login via email / phone, Magic Links (passwordless), Passkeys (WebAuthn/FIDO2)
- Social Login — Google, GitHub, Microsoft, Facebook (with PKCE support)
- Cookie-based refresh tokens (HttpOnly `Set-Cookie` transport)
- Multi-application support (`X-Access-Key` / `X-Access-Secret`)

🔐 **Security**
- 2FA (TOTP) — Google Authenticator, Authy
- OTP via email and SMS, password breach check (HaveIBeenPwned, k-anonymity)
- WebAuthn/Passkeys registration and authentication
- Auto-refresh interceptor — silent 401 → refresh → retry

👥 **RBAC**
- Synchronous JWT role/permission checks (zero network calls)
- CRUD operations for roles, permissions, user assignments

🏢 **Organizations (B2B)**
- Multi-tenant with hierarchical tree, per-org roles & memberships
- Context switching via `X-Org-Slug` header (automatic)

🤖 **AI Agent Security (AIRS)**
- Agent token lifecycle (create, revoke, suspend)
- Human-in-the-Loop approval flows
- Usage reporting, heartbeat, circuit breakers
- Prompt traceability (`X-Prompt-Trace-ID`)

🛡️ **GDPR Compliance**
- Account deletion flows with 30-day grace period
- Data export (right to portability)
- Admin deletion request management

📊 **Dashboard**
- Global, auth, security, GDPR, and per-org statistics

⚙️ **Developer Experience**
- Full TypeScript types (generated from OpenAPI)
- Pluggable storage (`LocalStorageAdapter`, `MemoryStorage`, or custom)
- Configurable retry with exponential backoff (429/5xx)
- Typed EventEmitter (`session:expired`, `token:refreshed`, `token:stored`)
- Pluggable logger with log levels

---

## Installation Options

```bash
# Core SDK (Node.js, browsers, any JS runtime)
npm install @tenxyte/core

# React bindings (requires React 18+ or 19+)
npm install @tenxyte/core @tenxyte/react

# Vue bindings (requires Vue 3.3+)
npm install @tenxyte/core @tenxyte/vue
```

---

## SDK Modules

The `TenxyteClient` exposes 10 domain modules:

| Module | Access | Description |
|---|---|---|
| **Auth** | `tx.auth` | Login, register, logout, refresh, magic link, social OAuth2 |
| **Security** | `tx.security` | 2FA/TOTP, OTP, password management, WebAuthn/Passkeys |
| **RBAC** | `tx.rbac` | Synchronous JWT checks + CRUD for roles & permissions |
| **User** | `tx.user` | Profile CRUD, avatar upload, admin user operations |
| **B2B** | `tx.b2b` | Organization CRUD, members, invitations, context switching |
| **AI** | `tx.ai` | Agent tokens, HITL, heartbeat, usage reporting, traceability |
| **Applications** | `tx.applications` | API client management, credential regeneration |
| **Admin** | `tx.admin` | Audit logs, login attempts, blacklisted/refresh tokens |
| **GDPR** | `tx.gdpr` | Account deletion flows, data export, admin processing |
| **Dashboard** | `tx.dashboard` | Global, auth, security, GDPR, org statistics |

See the full [`@tenxyte/core` README](./packages/core/README.md) for detailed code examples of every module.

---

## Configuration

```typescript
const tx = new TenxyteClient({
    // Required
    baseUrl: 'https://api.my-service.com',

    // Optional — extra headers for every request
    headers: { 'X-Access-Key': 'pkg_abc123' },

    // Optional — token storage (default: MemoryStorage)
    storage: new LocalStorageAdapter(),    // browser persistence
    // storage: new MemoryStorage(),       // Node.js / SSR

    // Optional — auto-refresh 401s silently (default: true)
    autoRefresh: true,

    // Optional — auto-inject device fingerprint (default: true)
    autoDeviceInfo: true,

    // Optional — request timeout in ms
    timeoutMs: 10_000,

    // Optional — retry config for 429/5xx
    retryConfig: { maxRetries: 3, baseDelayMs: 500 },

    // Optional — callback when session is unrecoverable
    onSessionExpired: () => router.push('/login'),

    // Optional — pluggable logger
    logger: console,
    logLevel: 'debug', // 'silent' | 'error' | 'warn' | 'debug'

    // Optional — cookie-based refresh token transport (default: false)
    // Enable when backend has TENXYTE_REFRESH_TOKEN_COOKIE_ENABLED=True
    cookieMode: false,
});
```

---

## SDK Events

| Event | Payload | When |
|---|---|---|
| `session:expired` | `void` | Refresh token expired, session unrecoverable |
| `token:refreshed` | `{ accessToken: string }` | Access token silently rotated |
| `token:stored` | `{ accessToken: string; refreshToken?: string }` | Tokens persisted after login/register/refresh |
| `agent:awaiting_approval` | `{ action: unknown }` | AI agent action requires human confirmation |
| `error` | `{ error: unknown }` | Unrecoverable SDK error |

```typescript
tx.on('session:expired', () => router.push('/login'));
tx.on('token:refreshed', ({ accessToken }) => console.log('Token refreshed'));
```

---

## Examples

The [`examples/`](./examples) directory contains ready-to-run demo apps:

| Example | Stack | Description |
|---|---|---|
| [`node-express`](./examples/node-express) | Node.js + Express | Server-side SDK usage with session management |
| [`react`](./examples/react) | React 19 + Vite | SPA with `TenxyteProvider` and all 4 hooks |
| [`vue`](./examples/vue) | Vue 3 + Vite | SPA with `tenxytePlugin` and all 4 composables |
| [`vanilla-ts`](./examples/vanilla-ts) | TypeScript + Vite | Minimal browser example, no framework |

To run an example:

```bash
cd examples/react
npm install
npm run dev
```

---

## Project Structure

```
tenxyte-js/
├── packages/
│   ├── core/          # @tenxyte/core — framework-agnostic SDK
│   │   ├── src/
│   │   │   ├── client.ts          # TenxyteClient entry point
│   │   │   ├── http/              # HTTP client, interceptors
│   │   │   ├── modules/           # auth, security, rbac, user, b2b, ai, ...
│   │   │   ├── storage/           # LocalStorageAdapter, MemoryStorage
│   │   │   └── types/             # OpenAPI-generated types
│   │   └── tests/
│   ├── react/         # @tenxyte/react — React hooks + TenxyteProvider
│   │   └── src/
│   │       ├── context.tsx        # React context
│   │       ├── provider.tsx       # TenxyteProvider + state sync
│   │       └── hooks.ts           # useAuth, useUser, useOrganization, useRbac
│   └── vue/           # @tenxyte/vue — Vue composables + plugin
│       └── src/
│           ├── plugin.ts          # tenxytePlugin + injection key
│           └── composables.ts     # useAuth, useUser, useOrganization, useRbac
├── examples/
│   ├── node-express/  # Express server example
│   ├── react/         # React SPA example
│   ├── vue/           # Vue SPA example
│   └── vanilla-ts/    # Vanilla TypeScript example
└── .github/workflows/
    ├── ci.yml         # Lint, test, build on every push/PR
    └── publish.yml    # Publish to npm on tag push
```

---

## Development

```bash
git clone https://github.com/tenxyte/tenxyte-js.git
cd tenxyte-js

# Core
cd packages/core
npm install
npm run test           # Vitest — unit + integration tests
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run build          # tsup → dist/

# React
cd packages/react
npm install
npm run typecheck
npm run build

# Vue
cd packages/vue
npm install
npm run typecheck
npm run build
```

### CI Pipeline

Every push to `main` and every PR triggers the [CI workflow](./.github/workflows/ci.yml):

1. **Core** — lint → typecheck → test → build
2. **React** — typecheck → build (depends on Core)
3. **Vue** — typecheck → build (depends on Core)

### Publishing

Packages are published independently to npm via tag-based [publish workflow](./.github/workflows/publish.yml):

```bash
git tag v-tenxyte-core-0.9.2 && git push --tags     # publishes @tenxyte/core
git tag v-tenxyte-react-0.5.1 && git push --tags     # publishes @tenxyte/react
git tag v-tenxyte-vue-0.5.1 && git push --tags       # publishes @tenxyte/vue
```

---

## Compatibility

| Runtime | Support |
|---|---|
| **Node.js** | 18+ (LTS recommended) |
| **Browsers** | All modern browsers (Chrome, Firefox, Safari, Edge) |
| **React** | 18.x, 19.x |
| **Vue** | 3.3+ |
| **TypeScript** | 5.0+ (types included, no `@types` needed) |

---

## Contributing

Contributions are welcome! A few simple rules:

1. Open an issue before a major feature request.
2. Fork → branch `feature/xxx` → PR with tests.
3. Ensure `npm run check` passes in `packages/core` before submitting.

---

## License

MIT — see [LICENSE](./LICENSE).

## Support

- 📖 [Core SDK Documentation](./packages/core/README.md)
- ⚛️ [React Bindings Documentation](./packages/react/README.md)
- 💚 [Vue Bindings Documentation](./packages/vue/README.md)
- 🐛 [Issue Tracker](https://github.com/tenxyte/tenxyte-js/issues)
- 💬 [Discussions](https://github.com/tenxyte/tenxyte-js/discussions)

## Changelog

### v0.10.0

- **Cookie mode** — `cookieMode` config option for HttpOnly refresh token transport
- **PKCE** — `code_verifier` parameter for social OAuth2 (RFC 7636)
- **Expanded error codes** — 30+ new `TenxyteErrorCode` entries (`MISSING_REFRESH_TOKEN`, `INVALID_REDIRECT_URI`, `PASSWORD_BREACHED`, etc.)
- **Optional `refresh_token`** — `TokenPair.refresh_token` is now optional (absent in cookie mode)
- **Optional params** — `logout()` and `refreshToken()` no longer require a refresh token argument in cookie mode

See [`@tenxyte/core` CHANGELOG](./packages/core/CHANGELOG.md) for full details.
