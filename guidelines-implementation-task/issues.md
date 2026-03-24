# Tenxyte JS SDK — Issues & Sub-Issues

> Generated from the audit roadmap — March 24, 2026
> Covers all 5 phases of the complete roadmap

---

## Legend

- **Labels**: `priority:critical`, `priority:high`, `priority:medium`, `priority:low`
- **Types**: `type:feature`, `type:refactor`, `type:bug`, `type:test`, `type:docs`, `type:chore`
- **Modules**: `mod:core`, `mod:auth`, `mod:security`, `mod:rbac`, `mod:user`, `mod:b2b`, `mod:ai`, `mod:http`, `mod:storage`, `mod:types`, `mod:applications`, `mod:admin`, `mod:gdpr`, `mod:dashboard`

---

# Phase 1 — Critical Foundations

> 🔴 HIGH | 2-3 days

---

## ISSUE-001 — Implement centralized configuration (`config.ts`)

> `priority:critical` `type:feature` `mod:core`
> **File**: `packages/core/src/config.ts` (previously empty)

- [x] **ISSUE-001-A** — Define `TenxyteClientConfig` interface with all options (`baseUrl`, `headers`, `storage`, `autoRefresh`, `autoDeviceInfo`, `timeoutMs`, `onSessionExpired`, `logger`) and JSDoc
- [x] **ISSUE-001-B** — Implement `resolveConfig()` with default values (`storage` → `MemoryStorage`, `autoRefresh` → `true`, `autoDeviceInfo` → `true`)
- [x] **ISSUE-001-C** — Export `SDK_VERSION` from `config.ts`

---

## ISSUE-002 — Refactor `TenxyteClient` to integrate session management

> `priority:critical` `type:refactor` `mod:core`
> **File**: `packages/core/src/client.ts`

- [x] **ISSUE-002-A** — Accept `TenxyteClientConfig` instead of `HttpClientOptions` (backward-compat `{ baseUrl }`)
- [x] **ISSUE-002-B** — Automatically instantiate `storage` (default: `MemoryStorage`), expose `this.storage` as readonly
- [x] **ISSUE-002-C** — Automatically wire `createAuthInterceptor(storage, context)` in the constructor
- [x] **ISSUE-002-D** — Automatically wire `createRefreshInterceptor` if `config.autoRefresh !== false`
- [x] **ISSUE-002-E** — Integrate `EventEmitter` via composition, expose `.on()`, `.once()`, `.off()`, define event names (`session:expired`, `token:refreshed`, `token:stored`, `agent:awaiting_approval`, `error`)
- [x] **ISSUE-002-F** — Emit events at the right moments (`token:stored` after login, `session:expired` after refresh fail, etc.)

---

## ISSUE-003 — Automatic token management after authentication

> `priority:critical` `type:feature` `mod:core` `mod:auth`

- [x] **ISSUE-003-A** — Store `access_token` and `refresh_token` in storage after every successful login (email, phone, social, magic link)
- [x] **ISSUE-003-B** — Store tokens after `register` if the response contains tokens
- [x] **ISSUE-003-C** — Automatically feed `rbac.setToken(accessToken)` after every token storage
- [x] **ISSUE-003-D** — Clear storage after `logout()` / `logoutAll()`, emit `session:expired`

---

## ISSUE-004 — Implement `timeoutMs` with `AbortController`

> `priority:high` `type:bug` `mod:http`
> **File**: `packages/core/src/http/client.ts`

- [x] **ISSUE-004-A** — Create `AbortController` in `request()` when `timeoutMs` is set, pass `signal` to `fetch()`, clean up in `finally`
- [x] **ISSUE-004-B** — Catch `AbortError` → throw `TenxyteError` with `code: 'TIMEOUT'`, add `TIMEOUT` to `TenxyteErrorCode`

---

## ISSUE-005 — Automatic `device_info` injection

> `priority:high` `type:feature` `mod:core` `mod:auth`

- [ ] **ISSUE-005-A** — Create a `createDeviceInfoInterceptor` that injects `device_info: buildDeviceInfo()` into POST requests to `/login/email/`, `/login/phone/`, `/register/`, `/social/*/`
- [ ] **ISSUE-005-B** — Do not overwrite if `device_info` is already present in the body, accept `deviceInfoOverride` in config

---

## ISSUE-006 — Complete barrel exports (`index.ts`)

> `priority:high` `type:chore` `mod:core`

- [ ] **ISSUE-006-A** — Add to `src/index.ts`: exports for `b2b`, `ai`, `storage`, `utils/events`, `utils/jwt`, `utils/device_info`
- [ ] **ISSUE-006-B** — Export `interceptors.ts` from `src/http/index.ts`
- [ ] **ISSUE-006-C** — Export new modules (applications, admin, gdpr, dashboard) as they are created

---

# Phase 2 — Missing Modules

> 🔴 HIGH | 3-4 days

---

## ISSUE-007 — Create `ApplicationsModule`

> `priority:high` `type:feature` `mod:applications`
> **File**: `packages/core/src/modules/applications.ts` (to create)
> **6 endpoints, 0% covered**

- [ ] **ISSUE-007-A** — `listApplications(params?)` → `GET /api/v1/auth/applications/` — params: `search`, `is_active`, `ordering` — returns: `PaginatedResponse<Application>`
- [ ] **ISSUE-007-B** — `createApplication(data)` → `POST /api/v1/auth/applications/` — body: `{ name, description }` — response includes `credentials.access_secret` (one-time)
- [ ] **ISSUE-007-C** — `getApplication(appId)` → `GET /api/v1/auth/applications/<id>/`
- [ ] **ISSUE-007-D** — `updateApplication(appId, data)` → `PUT /api/v1/auth/applications/<id>/` + `PATCH` support
- [ ] **ISSUE-007-E** — `deleteApplication(appId)` → `DELETE /api/v1/auth/applications/<id>/`
- [ ] **ISSUE-007-F** — `regenerateCredentials(appId, confirmation)` → `POST /api/v1/auth/applications/<id>/regenerate/` — body: `{ confirmation: "REGENERATE" }`
- [ ] **ISSUE-007-G** — Define types `Application`, `ApplicationCreateResponse`, `ApplicationRegenerateResponse`
- [ ] **ISSUE-007-H** — Register `ApplicationsModule` in `TenxyteClient`

---

## ISSUE-008 — Create `AdminModule`

> `priority:high` `type:feature` `mod:admin`
> **File**: `packages/core/src/modules/admin.ts` (to create)
> **7 endpoints, 0% covered**

- [ ] **ISSUE-008-A** — `listAuditLogs(params?)` → `GET /admin/audit-logs/` — params: `user_id`, `action`, `ip_address`, `application_id`, `date_from`, `date_to`, `ordering`, `page`, `page_size`
- [ ] **ISSUE-008-B** — `getAuditLog(logId)` → `GET /admin/audit-logs/<id>/`
- [ ] **ISSUE-008-C** — `listLoginAttempts(params?)` → `GET /admin/login-attempts/` — params: `identifier`, `ip_address`, `success`, `date_from`, `date_to`
- [ ] **ISSUE-008-D** — `listBlacklistedTokens(params?)` → `GET /admin/blacklisted-tokens/` — params: `user_id`, `reason`, `expired`
- [ ] **ISSUE-008-E** — `cleanupBlacklistedTokens()` → `POST /admin/blacklisted-tokens/cleanup/`
- [ ] **ISSUE-008-F** — `listRefreshTokens(params?)` → `GET /admin/refresh-tokens/` — params: `user_id`, `application_id`, `is_revoked`, `expired`
- [ ] **ISSUE-008-G** — `revokeRefreshToken(tokenId)` → `POST /admin/refresh-tokens/<id>/revoke/`
- [ ] **ISSUE-008-H** — Define types `AuditLog`, `LoginAttempt`, `BlacklistedToken`, `RefreshTokenInfo`
- [ ] **ISSUE-008-I** — Register `AdminModule` in `TenxyteClient`

---

## ISSUE-009 — Create `GdprModule`

> `priority:high` `type:feature` `mod:gdpr`
> **File**: `packages/core/src/modules/gdpr.ts` (to create)
> **9 endpoints (5 user + 4 admin), ~20% covered**

### User-facing

- [ ] **ISSUE-009-A** — `requestAccountDeletion(data)` → `POST /request-account-deletion/` — body: `{ password, otp_code?, reason? }` — replaces partial implementation in `user.ts`
- [ ] **ISSUE-009-B** — `confirmAccountDeletion(token)` → `POST /confirm-account-deletion/`
- [ ] **ISSUE-009-C** — `cancelAccountDeletion(password)` → `POST /cancel-account-deletion/`
- [ ] **ISSUE-009-D** — `getAccountDeletionStatus()` → `GET /account-deletion-status/`
- [ ] **ISSUE-009-E** — `exportUserData(password)` → `POST /export-user-data/` — full GDPR export response

### Admin-facing

- [ ] **ISSUE-009-F** — `listDeletionRequests(params?)` → `GET /admin/deletion-requests/`
- [ ] **ISSUE-009-G** — `getDeletionRequest(requestId)` → `GET /admin/deletion-requests/<id>/`
- [ ] **ISSUE-009-H** — `processDeletionRequest(requestId, data)` → `POST /admin/deletion-requests/<id>/process/` — body: `{ confirmation: "PERMANENTLY DELETE", admin_notes? }`
- [ ] **ISSUE-009-I** — `processExpiredDeletions()` → `POST /admin/deletion-requests/process-expired/`

### Types & Integration

- [ ] **ISSUE-009-J** — Define types `DeletionRequest`, `DeletionStatus`, `UserDataExport`
- [ ] **ISSUE-009-K** — Migrate `deleteAccount()` from `user.ts` to `gdpr.ts`, keep a deprecated proxy
- [ ] **ISSUE-009-L** — Register `GdprModule` in `TenxyteClient`

---

## ISSUE-010 — Create `DashboardModule`

> `priority:high` `type:feature` `mod:dashboard`
> **File**: `packages/core/src/modules/dashboard.ts` (to create)
> **5 endpoints, 0% covered**

- [ ] **ISSUE-010-A** — `getStats(params?)` → `GET /dashboard/stats/` — params: `period`, `compare`
- [ ] **ISSUE-010-B** — `getAuthStats(params?)` → `GET /dashboard/auth/`
- [ ] **ISSUE-010-C** — `getSecurityStats(params?)` → `GET /dashboard/security/`
- [ ] **ISSUE-010-D** — `getGdprStats(params?)` → `GET /dashboard/gdpr/`
- [ ] **ISSUE-010-E** — `getOrganizationStats(params?)` → `GET /dashboard/organizations/`
- [ ] **ISSUE-010-F** — Define types `DashboardStats`, `AuthStats`, `SecurityStats`, `GdprStats`, `OrgStats`
- [ ] **ISSUE-010-G** — Register `DashboardModule` in `TenxyteClient`

---

## ISSUE-011 — Complete missing methods in existing modules

> `priority:high` `type:feature`

- [ ] **ISSUE-011-A** — `auth.ts`: Add `refreshToken(refreshToken)` → `POST /refresh/` — public method (currently internal to the interceptor only)
- [ ] **ISSUE-011-B** — `auth.ts`: Add `validation_url` to `requestMagicLink()` — required by the docs
- [ ] **ISSUE-011-C** — `user.ts`: Add `getMyRoles()` → `GET /me/roles/` — returns: `{ roles[], permissions[] }`
- [ ] **ISSUE-011-D** — `rbac.ts`: Add `getUserRoles(userId)` → `GET /users/<id>/roles/`
- [ ] **ISSUE-011-E** — `rbac.ts`: Add `getUserPermissions(userId)` → `GET /users/<id>/permissions/`

---

## ISSUE-012 — Register all new modules in `TenxyteClient`

> `priority:high` `type:chore` `mod:core`

- [ ] **ISSUE-012-A** — `public applications: ApplicationsModule` + instantiation
- [ ] **ISSUE-012-B** — `public admin: AdminModule` + instantiation
- [ ] **ISSUE-012-C** — `public gdpr: GdprModule` + instantiation
- [ ] **ISSUE-012-D** — `public dashboard: DashboardModule` + instantiation
- [ ] **ISSUE-012-E** — Update barrel exports in `src/index.ts`

---

# Phase 3 — Integration & DX

> 🟡 MEDIUM | 3-4 days

---

## ISSUE-013 — Strictly type all API responses

> `priority:medium` `type:refactor` `mod:types`

- [ ] **ISSUE-013-A** — Type `RegisterRequest` (replace `any` with interface containing `email`, `password`, `first_name?`, `last_name?`, `phone_country_code?`, `phone_number?`, `username?`)
- [ ] **ISSUE-013-B** — Replace all `Promise<any>` in `UserModule` with precise types (`TenxyteUser`, `ProfileUpdateResponse`, etc.)
- [ ] **ISSUE-013-C** — Type all `AuthModule` responses (`AuthResponse`, `RegisterResponse`, `MagicLinkVerifyResponse`)
- [ ] **ISSUE-013-D** — Type responses for the new modules (applications, admin, gdpr, dashboard)
- [ ] **ISSUE-013-E** — Verify and type `SecurityModule` responses

---

## ISSUE-014 — Fix DELETE-with-body pattern (`as any` hack)

> `priority:medium` `type:bug` `mod:rbac` `mod:http`

- [ ] **ISSUE-014-A** — Modify `RequestConfig` / `delete()` in `http/client.ts` to properly support `body` with DELETE
- [ ] **ISSUE-014-B** — Remove `as any` casts in `rbac.ts` (`removePermissionsFromRole`, `removePermissionsFromUser`)

---

## ISSUE-015 — Implement automatic retry middleware

> `priority:medium` `type:feature` `mod:http`

- [ ] **ISSUE-015-A** — Create a configurable retry interceptor: `retryConfig: { maxRetries, retryOn429, retryOnNetworkError }`, respect `Retry-After`, exponential backoff
- [ ] **ISSUE-015-B** — Integrate into `TenxyteClient` when `config.retryConfig` is provided

---

## ISSUE-016 — Implement configurable logger

> `priority:medium` `type:feature` `mod:core`

- [ ] **ISSUE-016-A** — Define `TenxyteLogger` interface (`debug`, `warn`, `error`), default logger: `console` in `silent` mode
- [ ] **ISSUE-016-B** — Add `logLevel` and `logger` to `TenxyteClientConfig`
- [ ] **ISSUE-016-C** — Replace hardcoded `console.debug` / `console.warn` in `ai.ts` with `this.logger.*`
- [ ] **ISSUE-016-D** — Propagate logger to all modules and interceptors

---

## ISSUE-017 — Add high-level helpers to `TenxyteClient`

> `priority:medium` `type:feature` `mod:core`

- [ ] **ISSUE-017-A** — `tx.isAuthenticated()` → checks whether a valid (non-expired) token exists in storage
- [ ] **ISSUE-017-B** — `tx.getAccessToken()` → returns the current token from storage
- [ ] **ISSUE-017-C** — `tx.getCurrentUser()` → returns the decoded JWT user (via `decodeJwt`)
- [ ] **ISSUE-017-D** — `tx.isTokenExpired()` → checks JWT expiry from cache without a network call

---

## ISSUE-018 — Prepare the interface for packages/react and packages/vue

> `priority:medium` `type:feature` `mod:core`

- [ ] **ISSUE-018-A** — Ensure `EventEmitter` emits state change events (`token:stored`, `session:expired`, `token:refreshed`)
- [ ] **ISSUE-018-B** — Expose synchronous `getState()` returning `{ isAuthenticated, user, accessToken, activeOrg, isAgentMode }`
- [ ] **ISSUE-018-C** — Document the interface contract (event names, state shape) for framework wrappers

---

# Phase 4 — Tests & Quality

> 🟡 MEDIUM | 3-4 days

---

## ISSUE-019 — Tests for existing modules with no coverage

> `priority:medium` `type:test`

- [ ] **ISSUE-019-A** — Create `tests/modules/b2b.test.ts` — test CRUD orgs, members, invitations, `switchOrganization()`, `clearOrganization()`, `getCurrentOrganizationSlug()`
- [ ] **ISSUE-019-B** — Create `tests/modules/ai.test.ts` — test token lifecycle (create, set, clear, isAgentMode), HITL (list, confirm, deny), heartbeat, reportUsage, interceptors (AgentBearer, trace ID)

---

## ISSUE-020 — Tests for new modules (Phase 2)

> `priority:medium` `type:test`

- [ ] **ISSUE-020-A** — Create `tests/modules/applications.test.ts` — test 6 CRUD methods + regenerate
- [ ] **ISSUE-020-B** — Create `tests/modules/admin.test.ts` — test audit logs, login attempts, blacklisted tokens, refresh tokens
- [ ] **ISSUE-020-C** — Create `tests/modules/gdpr.test.ts` — test 9 methods (user + admin GDPR)
- [ ] **ISSUE-020-D** — Create `tests/modules/dashboard.test.ts` — test 5 stats endpoints

---

## ISSUE-021 — Integration tests for the refactored `TenxyteClient`

> `priority:medium` `type:test` `mod:core`

- [ ] **ISSUE-021-A** — Full flow test: `loginWithEmail()` → token auto-stored → auto-authenticated request → 401 → auto-refresh → successful retry
- [ ] **ISSUE-021-B** — Session expired flow test: refresh fail → `session:expired` event emitted → storage cleared
- [ ] **ISSUE-021-C** — Agent flow test: `setAgentToken()` → request with `AgentBearer` → 202 → `agent:awaiting_approval` event → `clearAgentToken()` → back to standard Bearer
- [ ] **ISSUE-021-D** — B2B flow test: `switchOrganization('acme')` → request with `X-Org-Slug: acme` → `clearOrganization()` → header absent

---

## ISSUE-022 — Increase test coverage for existing modules

> `priority:medium` `type:test`

- [ ] **ISSUE-022-A** — Auth: test `register`, `loginWithPhone`, `logoutAll`, `refreshToken` (new public method)
- [ ] **ISSUE-022-B** — Security: test full WebAuthn flows (mock `navigator.credentials.create()` and `.get()`)
- [ ] **ISSUE-022-C** — RBAC: test edge cases — `null` token, empty roles, malformed JWT, `getUserRoles`, `getUserPermissions`
- [ ] **ISSUE-022-D** — User: test `uploadAvatar` with FormData mock, `getMyRoles`, `deleteAccount`
- [ ] **ISSUE-022-E** — HTTP: test `timeoutMs` with `AbortController`, retry interceptor, device info interceptor

---

## ISSUE-023 — Configure lint + format + CI

> `priority:medium` `type:chore` `mod:core`

- [ ] **ISSUE-023-A** — Configure ESLint with strict TypeScript rules (`@typescript-eslint/recommended`, `no-explicit-any`, `explicit-function-return-type`)
- [ ] **ISSUE-023-B** — Configure Prettier (ESLint integration)
- [ ] **ISSUE-023-C** — Add `npm run check` script that chains: lint → type-check (`tsc --noEmit`) → test
- [ ] **ISSUE-023-D** — Add a CI GitHub Actions workflow: install → check → build

---

# Phase 5 — Polish & Release

> 🟢 LOW | 2-3 days

---

## ISSUE-024 — Complete documentation

> `priority:low` `type:docs`

- [ ] **ISSUE-024-A** — Update `README.md` with new modules: `applications`, `admin`, `gdpr`, `dashboard`
- [ ] **ISSUE-024-B** — Add usage examples for each module (TypeScript snippets)
- [ ] **ISSUE-024-C** — Document emitted SDK events (names, payloads, when they fire)
- [ ] **ISSUE-024-D** — Document configuration options (`TenxyteClientConfig`)
- [ ] **ISSUE-024-E** — Add a migration guide v0.9 → v1.0 (breaking changes: constructor, auto-session)

---

## ISSUE-025 — Working examples

> `priority:low` `type:docs`

- [ ] **ISSUE-025-A** — Verify/complete examples in `examples/` (ensure they compile and run)
- [ ] **ISSUE-025-B** — Add a vanilla Node.js example (Express server using the SDK)
- [ ] **ISSUE-025-C** — Add a React example (with `useAuth`, `useUser` hooks)
- [ ] **ISSUE-025-D** — Add a Vue example (with composables)

---

## ISSUE-026 — npm publish preparation

> `priority:low` `type:chore` `mod:core`

- [ ] **ISSUE-026-A** — Verify `package.json`: fields `exports`, `types`, `files`, `main`, `module`, `sideEffects`
- [ ] **ISSUE-026-B** — Version to `1.0.0`
- [ ] **ISSUE-026-C** — Add `CHANGELOG.md` with all v1.0 features
- [ ] **ISSUE-026-D** — Publish to npm (`npm publish --access public`)
- [ ] **ISSUE-026-E** — Create a Git tag + GitHub release with release notes

---

## ISSUE-027 — Prepare `packages/react` and `packages/vue`

> `priority:low` `type:feature`

- [ ] **ISSUE-027-A** — Create stub `packages/react` with `package.json`, `tsconfig.json`, `tsup.config.ts`
- [ ] **ISSUE-027-B** — Implement React hooks: `useAuth()`, `useUser()`, `useOrganization()`, `useRbac()` — reactive bindings on the core `EventEmitter`
- [ ] **ISSUE-027-C** — Create stub `packages/vue` with `package.json`, `tsconfig.json`
- [ ] **ISSUE-027-D** — Implement Vue composables: `useAuth()`, `useUser()`, `useOrganization()`, `useRbac()`

---

# Summary

| Phase | Issues | Sub-issues | Priority |
|---|---|---|---|
| Phase 1 — Foundations | 6 (001-006) | 24 | 🔴 HIGH |
| Phase 2 — Missing Modules | 6 (007-012) | 42 | 🔴 HIGH |
| Phase 3 — DX & Integration | 6 (013-018) | 22 | 🟡 MEDIUM |
| Phase 4 — Tests & Quality | 5 (019-023) | 18 | 🟡 MEDIUM |
| Phase 5 — Polish & Release | 4 (024-027) | 18 | 🟢 LOW |
| **Total** | **27 issues** | **124 sub-issues** | — |
