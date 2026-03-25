# Changelog

All notable changes to `@tenxyte/core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2025-03-25

### Added

- **AuthModule** — `loginWithEmail`, `loginWithPhone`, `register`, `logout`, `logoutAll`, `refreshToken`, `requestMagicLink`, `verifyMagicLink`, `socialLogin`.
- **SecurityModule** — `enableTotp`, `verifyTotp`, `disableTotp`, `checkPasswordBreach`, `registerWebAuthn`, `authenticateWebAuthn`, `listWebAuthnCredentials`, `deleteWebAuthnCredential`.
- **RbacModule** — Synchronous `hasRole`, `hasPermission`, `hasAnyRole`, `hasAllRoles` from JWT; CRUD `getUserRoles`, `getUserPermissions`, `assignRoleToUser`, `removeRoleFromUser`, `assignPermissionsToUser`, `removePermissionsFromUser`.
- **UserModule** — `getProfile`, `updateProfile`, `changePassword`, `getMyRoles`, `getUser`, `adminUpdateUser`, `adminDeleteUser`.
- **B2bModule** — `listOrganizations`, `createOrganization`, `getOrganization`, `updateOrganization`, `deleteOrganization`, `listMembers`, `addMember`, `removeMember`, `switchOrganization`, `clearOrganization`.
- **AiModule** — `invokeAgent` with 202 polling support, `getAgentResult`, `approveAgentAction`, streaming-ready response interceptor.
- **ApplicationsModule** — `list`, `create`, `get`, `update`, `patch`, `delete`, `regenerateCredentials`.
- **AdminModule** — `listAuditLogs`, `getAuditLog`, `listLoginAttempts`, `listBlacklistedTokens`, `listRefreshTokens`.
- **GdprModule** — `requestDataExport`, `getDataExport`, `requestDataDeletion`, `getConsentStatus`, `updateConsent`.
- **DashboardModule** — `getStats`, `getActiveUsers`, `getSignupTrend`, `getRevenueSummary`.
- **TenxyteHttpClient** — Fetch-based HTTP client with request/response interceptor pipeline.
- **Auto-refresh interceptor** — Silently refreshes expired access tokens on 401 and retries the original request.
- **Retry interceptor** — Configurable exponential backoff for 429/5xx responses.
- **Device info interceptor** — Auto-injects browser/OS fingerprint into authentication requests.
- **Request timeout** — Configurable `timeoutMs` with `AbortController`.
- **TenxyteStorage** — Pluggable storage interface with `LocalStorageAdapter` (browser) and `MemoryStorage` (Node.js/SSR).
- **EventEmitter** — Typed events: `session:expired`, `token:refreshed`, `token:stored`, `agent:awaiting_approval`, `error`.
- **High-level helpers** — `isAuthenticated()`, `getAccessToken()`, `getCurrentUser()`, `isTokenExpired()`, `getState()`.
- **Pluggable logger** — `TenxyteLogger` interface with configurable `logLevel` (`debug`, `info`, `warn`, `error`, `none`).
- **JWT utilities** — `decodeJwt`, `isJwtExpired` for client-side token inspection.
- **Full TypeScript types** — Generated from OpenAPI schema via `openapi-typescript`.

### Changed

- **`loginWithEmail`** now requires `device_info` field (can be empty string).
- **`requestMagicLink`** now requires `validation_url` field.
- **`isAuthenticated()`** is now async (reads from storage).

### Breaking Changes

- Import path changed: `import { TenxyteClient } from '@tenxyte/core'` (previously default export).
- Configuration uses `TenxyteClientConfig` interface (new fields: `autoRefresh`, `autoDeviceInfo`, `timeoutMs`, `retryConfig`, `logger`, `logLevel`, `deviceInfoOverride`).
- `register()` return type changed to `RegisterResponse`.
- Tokens are automatically stored and `Authorization` header is automatically injected.

## [0.9.0] — 2025-02-01

### Added

- Initial pre-release with auth, user, security, rbac, b2b modules.
- Basic HTTP client with interceptor support.
- LocalStorage-based token persistence.
