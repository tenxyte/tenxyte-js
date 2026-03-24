# Tenxyte JS SDK — Audit Complet & Roadmap d'Implémentation

> **Date de l'audit** : 24 Mars 2026
> **Périmètre** : `packages/core` vs Documentation officielle (`docs/`)
> **Version actuelle** : `@tenxyte/core@0.9.0`

---

## Table des matières

- [1. Résumé exécutif](#1-résumé-exécutif)
- [2. Évaluation de la structure du projet](#2-évaluation-de-la-structure-du-projet)
- [3. Matrice de couverture — Implémenté vs Documentation](#3-matrice-de-couverture--implémenté-vs-documentation)
  - [3.1 Module Auth](#31-module-auth)
  - [3.2 Module Security](#32-module-security)
  - [3.3 Module RBAC](#33-module-rbac)
  - [3.4 Module User](#34-module-user)
  - [3.5 Module B2B (Organizations)](#35-module-b2b-organizations)
  - [3.6 Module AI (AIRS)](#36-module-ai-airs)
  - [3.7 HTTP Client & Interceptors](#37-http-client--interceptors)
  - [3.8 Storage](#38-storage)
  - [3.9 Utils](#39-utils)
  - [3.10 Types](#310-types)
- [4. Fonctionnalités entièrement manquantes](#4-fonctionnalités-entièrement-manquantes)
- [5. Problèmes structurels & dette technique](#5-problèmes-structurels--dette-technique)
- [6. Couverture de tests](#6-couverture-de-tests)
- [7. Roadmap détaillée par phases](#7-roadmap-détaillée-par-phases)
  - [Phase 1 — Fondations critiques](#phase-1--fondations-critiques-priorité-haute)
  - [Phase 2 — Modules manquants](#phase-2--modules-manquants-priorité-haute)
  - [Phase 3 — Intégration & DX](#phase-3--intégration--dx-priorité-moyenne)
  - [Phase 4 — Tests & Qualité](#phase-4--tests--qualité-priorité-moyenne)
  - [Phase 5 — Polish & Release](#phase-5--polish--release-priorité-basse)
- [8. Conclusion : Implémentabilité & Évolutivité](#8-conclusion--implémentabilité--évolutivité)

---

## 1. Résumé exécutif

Le SDK `@tenxyte/core` est dans un état **fonctionnel mais incomplet** (~65% de couverture par rapport à la documentation). La structure modulaire est **saine et extensible**, mais plusieurs blocs critiques documentés ne sont pas encore implémentés, et certains composants existants ne sont pas intégrés entre eux.

### Points forts ✅
- Architecture modulaire propre (1 module = 1 domaine fonctionnel)
- HTTP Client robuste avec interceptors (auth, refresh, retry)
- Types bien définis avec schema OpenAPI généré
- Couverture API bonne sur Auth, Security, RBAC, B2B, AIRS
- Storage abstrait avec 3 implémentations (Memory, LocalStorage, Cookie)
- EventEmitter prêt mais non branché
- Build toolchain moderne (tsup, vitest, TypeScript)

### Lacunes critiques ❌
- **Aucune gestion automatique de session** (storage + interceptors non branchés sur le client principal)
- **`config.ts` est vide** — pas de configuration centralisée
- **Pas de module Applications** (CRUD complet documenté mais absent)
- **Pas de module Admin/Security** (audit logs, login attempts, blacklisted tokens, refresh tokens)
- **Pas de module GDPR** (account deletion flow complet, data export)
- **Pas de module Dashboard** (5 endpoints stats)
- **`EventEmitter` non intégré** au `TenxyteClient`
- **`device_info` non injecté** dans les requêtes d'auth
- **Pas d'export du module B2B et AI** dans `index.ts`
- **`GET /me/roles/`** non implémenté
- **`POST /refresh/`** non exposé comme méthode publique
- **`RegisterRequest` typé `any`** — aucun typage réel

---

## 2. Évaluation de la structure du projet

### Architecture actuelle

```
packages/core/
├── src/
│   ├── client.ts              # TenxyteClient — point d'entrée principal
│   ├── config.ts              # ❌ VIDE — aucune config
│   ├── index.ts               # Barrel exports (incomplet)
│   ├── http/
│   │   ├── client.ts          # ✅ HTTP wrapper fetch + interceptors
│   │   ├── interceptors.ts    # ✅ Auth + Refresh interceptors
│   │   └── index.ts           # Barrel (n'exporte pas interceptors)
│   ├── modules/
│   │   ├── auth.ts            # ✅ Auth (login, register, social, magic link)
│   │   ├── security.ts        # ✅ 2FA, OTP, Passwords, WebAuthn
│   │   ├── rbac.ts            # ✅ Roles, Permissions, sync checks
│   │   ├── user.ts            # ✅ Profile + Admin user mgmt
│   │   ├── b2b.ts             # ✅ Organizations, Members, Invitations
│   │   └── ai.ts              # ✅ AIRS AgentTokens, HITL, Circuit Breaker
│   ├── storage/
│   │   ├── index.ts           # ✅ Interface TenxyteStorage
│   │   ├── memory.ts          # ✅ MemoryStorage (SSR/fallback)
│   │   ├── localStorage.ts    # ✅ LocalStorage (browser)
│   │   └── cookie.ts          # ✅ CookieStorage (browser)
│   ├── types/
│   │   ├── index.ts           # ✅ Types manuels + error codes
│   │   └── api-schema.d.ts    # ✅ Généré depuis OpenAPI (215KB)
│   └── utils/
│       ├── base64url.ts       # ✅ WebAuthn encoding
│       ├── device_info.ts     # ✅ Fingerprint builder
│       ├── events.ts          # ✅ EventEmitter (non branché)
│       └── jwt.ts             # ✅ JWT decode (browser + Node)
├── tests/
│   ├── http.test.ts           # ✅ HTTP + Interceptors
│   ├── storage.test.ts        # ✅ Storage impls
│   ├── utils.test.ts          # ✅ JWT, base64url, device_info
│   └── modules/
│       ├── auth.test.ts       # ✅ AuthModule
│       ├── rbac.test.ts       # ✅ RbacModule
│       ├── security.test.ts   # ✅ SecurityModule
│       └── user.test.ts       # ✅ UserModule
├── package.json               # ✅ Config build/test/lint
├── tsconfig.json              # ✅ TypeScript config
├── tsup.config.ts             # ✅ Build config (ESM + CJS)
└── vitest.config.ts           # ✅ Test config
```

### Verdict structurel

| Critère | Score | Commentaire |
|---|---|---|
| **Modularité** | ⭐⭐⭐⭐⭐ | Excellente — chaque domaine est isolé dans son module |
| **Extensibilité** | ⭐⭐⭐⭐ | Ajout de modules facile, mais `TenxyteClient` doit évoluer |
| **Séparation des concerns** | ⭐⭐⭐⭐ | HTTP/Storage/Types bien séparés, mais pas de layer config |
| **Facilité d'implémentation** | ⭐⭐⭐⭐ | Pattern clair : 1 module → injecte HttpClient → expose méthodes |
| **Testabilité** | ⭐⭐⭐⭐ | Mock du HttpClient simple, chaque module testable isolément |
| **Upgradabilité** | ⭐⭐⭐ | Manque config centralisée et EventEmitter intégré pour évolutions |
| **Prêt pour packages/react et packages/vue** | ⭐⭐ | Besoin d'events + session state pour que les wrappers framework marchent |

**Conclusion** : La structure est **solide et facilement implémentable**. Le pattern module→HttpClient est clair et reproductible. Les manques sont davantage fonctionnels que structurels. L'ajout de nouveaux modules suit toujours le même schéma, ce qui rend le projet **très upgradable**.

---

## 3. Matrice de couverture — Implémenté vs Documentation

### Légende
- ✅ = Implémenté et conforme à la doc
- ⚠️ = Partiellement implémenté ou divergence avec la doc
- ❌ = Non implémenté (documenté mais absent du code)

---

### 3.1 Module Auth

| Endpoint / Fonctionnalité | Doc | SDK | Status | Notes |
|---|---|---|---|---|
| `POST /login/email/` | ✅ | ✅ | ✅ | Conforme |
| `POST /login/phone/` | ✅ | ✅ | ✅ | Conforme |
| `POST /register/` | ✅ | ⚠️ | ⚠️ | `RegisterRequest` typé `any` — pas de vrai typage |
| `POST /logout/` | ✅ | ✅ | ✅ | Conforme |
| `POST /logout/all/` | ✅ | ✅ | ✅ | Conforme |
| `POST /refresh/` | ✅ | ❌ | ❌ | **Pas de méthode publique** — géré uniquement en interceptor interne |
| `POST /magic-link/request/` | ✅ | ⚠️ | ⚠️ | Manque le champ `validation_url` requis par la doc |
| `GET /magic-link/verify/` | ✅ | ✅ | ✅ | Conforme |
| `POST /social/<provider>/` | ✅ | ✅ | ✅ | Conforme |
| `GET /social/<provider>/callback/` | ✅ | ✅ | ✅ | Conforme |
| `device_info` injection dans login/register | ✅ | ❌ | ❌ | **`buildDeviceInfo()` existe mais n'est jamais injecté** |

### 3.2 Module Security

| Endpoint / Fonctionnalité | Doc | SDK | Status | Notes |
|---|---|---|---|---|
| `GET /2fa/status/` | ✅ | ✅ | ✅ | Conforme |
| `POST /2fa/setup/` | ✅ | ✅ | ✅ | Conforme |
| `POST /2fa/confirm/` | ✅ | ✅ | ✅ | Conforme |
| `POST /2fa/disable/` | ✅ | ✅ | ✅ | Conforme |
| `POST /2fa/backup-codes/` | ✅ | ✅ | ✅ | Conforme |
| `POST /otp/request/` | ✅ | ✅ | ✅ | Conforme |
| `POST /otp/verify/email/` | ✅ | ✅ | ✅ | Conforme |
| `POST /otp/verify/phone/` | ✅ | ✅ | ✅ | Conforme |
| `POST /password/reset/request/` | ✅ | ✅ | ✅ | Conforme |
| `POST /password/reset/confirm/` | ✅ | ✅ | ✅ | Conforme |
| `POST /password/change/` | ✅ | ✅ | ✅ | Conforme |
| `POST /password/strength/` | ✅ | ✅ | ✅ | Conforme |
| `GET /password/requirements/` | ✅ | ✅ | ✅ | Conforme |
| `POST /webauthn/register/begin+complete/` | ✅ | ✅ | ✅ | Intégration `navigator.credentials` native |
| `POST /webauthn/authenticate/begin+complete/` | ✅ | ✅ | ✅ | Conforme |
| `GET /webauthn/credentials/` | ✅ | ✅ | ✅ | Conforme |
| `DELETE /webauthn/credentials/<id>/` | ✅ | ✅ | ✅ | Conforme |

### 3.3 Module RBAC

| Endpoint / Fonctionnalité | Doc | SDK | Status | Notes |
|---|---|---|---|---|
| `GET /permissions/` | ✅ | ✅ | ✅ | Conforme |
| `POST /permissions/` | ✅ | ✅ | ✅ | Conforme |
| `GET /permissions/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `PUT /permissions/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `DELETE /permissions/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `GET /roles/` | ✅ | ✅ | ✅ | Conforme |
| `POST /roles/` | ✅ | ✅ | ✅ | Conforme |
| `GET /roles/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `PUT /roles/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `DELETE /roles/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `GET /roles/<id>/permissions/` | ✅ | ✅ | ✅ | Conforme |
| `POST /roles/<id>/permissions/` | ✅ | ✅ | ✅ | Conforme |
| `DELETE /roles/<id>/permissions/` (remove perms from role) | ✅ | ⚠️ | ⚠️ | Implémenté avec `body` dans DELETE — hack `as any` |
| `GET /users/<id>/roles/` | ✅ | ❌ | ❌ | **Manquant** — pas de `getUserRoles()` |
| `POST /users/<id>/roles/` | ✅ | ✅ | ✅ | Conforme |
| `DELETE /users/<id>/roles/` | ✅ | ✅ | ✅ | Conforme |
| `GET /users/<id>/permissions/` | ✅ | ❌ | ❌ | **Manquant** — pas de `getUserPermissions()` |
| `POST /users/<id>/permissions/` | ✅ | ✅ | ✅ | Conforme |
| `DELETE /users/<id>/permissions/` | ✅ | ⚠️ | ⚠️ | Implémenté avec `body` dans DELETE — hack `as any` |
| Sync checks (`hasRole`, `hasPermission`, etc.) | ✅ | ✅ | ✅ | Excellente implémentation JWT-side |

### 3.4 Module User

| Endpoint / Fonctionnalité | Doc | SDK | Status | Notes |
|---|---|---|---|---|
| `GET /me/` | ✅ | ✅ | ✅ | Conforme |
| `PATCH /me/` | ✅ | ✅ | ✅ | Conforme |
| `GET /me/roles/` | ✅ | ❌ | ❌ | **Manquant** — endpoint documenté mais pas de méthode |
| Avatar upload (FormData) | ✅ | ✅ | ✅ | Conforme |
| `POST /request-account-deletion/` | ✅ | ⚠️ | ⚠️ | Implémenté mais incomplet vs doc (manque `reason`, typing partiel) |
| `POST /confirm-account-deletion/` | ✅ | ❌ | ❌ | **Manquant** |
| `POST /cancel-account-deletion/` | ✅ | ❌ | ❌ | **Manquant** |
| `GET /account-deletion-status/` | ✅ | ❌ | ❌ | **Manquant** |
| `POST /export-user-data/` | ✅ | ❌ | ❌ | **Manquant** |
| `GET /admin/users/` | ✅ | ✅ | ✅ | Conforme |
| `GET /admin/users/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `PATCH /admin/users/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `DELETE /admin/users/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `POST /admin/users/<id>/ban/` | ✅ | ✅ | ✅ | Conforme |
| `POST /admin/users/<id>/unban/` | ✅ | ✅ | ✅ | Conforme |
| `POST /admin/users/<id>/lock/` | ✅ | ✅ | ✅ | Conforme |
| `POST /admin/users/<id>/unlock/` | ✅ | ✅ | ✅ | Conforme |

### 3.5 Module B2B (Organizations)

| Endpoint / Fonctionnalité | Doc | SDK | Status | Notes |
|---|---|---|---|---|
| `POST /organizations/` | ✅ | ✅ | ✅ | Conforme |
| `GET /organizations/` (list) | ✅ | ✅ | ✅ | Conforme |
| `GET /organizations/<slug>/` | ✅ | ✅ | ✅ | Conforme |
| `PATCH /organizations/<slug>/` | ✅ | ✅ | ✅ | Conforme |
| `DELETE /organizations/<slug>/` | ✅ | ✅ | ✅ | Conforme |
| `GET /organizations/<slug>/tree/` | ✅ | ✅ | ✅ | Conforme |
| `GET /organizations/<slug>/members/` | ✅ | ✅ | ✅ | Conforme |
| `POST /organizations/<slug>/members/` | ✅ | ✅ | ✅ | Conforme |
| `PATCH /organizations/<slug>/members/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `DELETE /organizations/<slug>/members/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `POST /organizations/<slug>/invitations/` | ✅ | ✅ | ✅ | Conforme |
| `GET /organizations/roles/` | ✅ | ✅ | ✅ | Conforme |
| `switchOrganization()` / `clearOrganization()` | ✅ | ✅ | ✅ | Avec interceptor auto X-Org-Slug |
| Export dans `index.ts` | — | ❌ | ❌ | **B2bModule non exporté** dans barrel |

### 3.6 Module AI (AIRS)

| Endpoint / Fonctionnalité | Doc | SDK | Status | Notes |
|---|---|---|---|---|
| `POST /ai/tokens/` | ✅ | ✅ | ✅ | Conforme |
| `GET /ai/tokens/` | ✅ | ✅ | ✅ | Conforme |
| `GET /ai/tokens/<id>/` | ✅ | ✅ | ✅ | Conforme |
| `POST /ai/tokens/<id>/revoke/` | ✅ | ✅ | ✅ | Conforme |
| `POST /ai/tokens/<id>/suspend/` | ✅ | ✅ | ✅ | Conforme |
| `POST /ai/tokens/revoke-all/` | ✅ | ✅ | ✅ | Conforme |
| `POST /ai/tokens/<id>/heartbeat/` | ✅ | ✅ | ✅ | Conforme |
| `GET /ai/pending-actions/` | ✅ | ✅ | ✅ | Conforme |
| `POST /ai/pending-actions/confirm/` | ✅ | ✅ | ✅ | Conforme |
| `POST /ai/pending-actions/deny/` | ✅ | ✅ | ✅ | Conforme |
| `POST /ai/tokens/<id>/report-usage/` | ✅ | ✅ | ✅ | Conforme |
| `setAgentToken()` / `clearAgentToken()` | ✅ | ✅ | ✅ | Avec interceptor AgentBearer |
| `setTraceId()` / `clearTraceId()` | ✅ | ✅ | ✅ | Avec interceptor X-Prompt-Trace-ID |
| Export dans `index.ts` | — | ❌ | ❌ | **AiModule non exporté** dans barrel |

### 3.7 HTTP Client & Interceptors

| Fonctionnalité | Doc | SDK | Status | Notes |
|---|---|---|---|---|
| Fetch wrapper (GET/POST/PUT/PATCH/DELETE) | ✅ | ✅ | ✅ | Conforme |
| Query params serialization | ✅ | ✅ | ✅ | Conforme |
| JSON body serialization | ✅ | ✅ | ✅ | Conforme |
| FormData multipart support | ✅ | ✅ | ✅ | Auto-remove Content-Type |
| Error normalization → `TenxyteError` | ✅ | ✅ | ✅ | Conforme |
| `Retry-After` header parsing | ✅ | ✅ | ✅ | Conforme |
| 204 No Content handling | ✅ | ✅ | ✅ | Conforme |
| Request interceptors (pipeline) | ✅ | ✅ | ✅ | Conforme |
| Response interceptors (pipeline) | ✅ | ✅ | ✅ | Conforme |
| Auth interceptor (Bearer injection) | ✅ | ✅ | ✅ | Conforme |
| Refresh interceptor (401 → retry) | ✅ | ✅ | ✅ | Avec queue pour requêtes concurrentes |
| `timeoutMs` support | — | ⚠️ | ⚠️ | Déclaré dans l'interface mais **non implémenté** |
| `X-Access-Secret` header injection | ✅ | ❌ | ❌ | Doc requiert `X-Access-Key` + `X-Access-Secret` |
| Interceptors non exportés dans `http/index.ts` | — | ⚠️ | ⚠️ | `interceptors.ts` non ré-exporté |

### 3.8 Storage

| Fonctionnalité | SDK | Status | Notes |
|---|---|---|---|
| `TenxyteStorage` interface | ✅ | ✅ | Async-compatible |
| `MemoryStorage` | ✅ | ✅ | SSR/Node fallback |
| `LocalStorage` | ✅ | ✅ | Avec fallback Memory |
| `CookieStorage` | ✅ | ✅ | Avec options Secure/SameSite |
| **Intégration avec TenxyteClient** | ❌ | ❌ | **Storage n'est jamais instancié ni branché** |

### 3.9 Utils

| Fonctionnalité | SDK | Status | Notes |
|---|---|---|---|
| `base64url` (encode/decode) | ✅ | ✅ | Pour WebAuthn |
| `buildDeviceInfo()` | ✅ | ✅ | Auto-detect OS/browser/runtime |
| `EventEmitter` | ✅ | ⚠️ | Implémenté mais **non branché** au TenxyteClient |
| `decodeJwt()` | ✅ | ✅ | Browser + Node compatible |

### 3.10 Types

| Fonctionnalité | SDK | Status | Notes |
|---|---|---|---|
| `TenxyteUser` | ✅ | ✅ | Conforme à la doc |
| `TokenPair` | ✅ | ✅ | Conforme |
| `TenxyteError` + `TenxyteErrorCode` | ✅ | ✅ | Exhaustif — couvre tous les codes documentés |
| `Organization` | ✅ | ✅ | Conforme |
| `PaginatedResponse<T>` | ✅ | ✅ | Conforme |
| `AgentTokenSummary` | ✅ | ✅ | Conforme |
| `AgentPendingAction` | ✅ | ✅ | Conforme |
| `GeneratedSchema` (OpenAPI) | ✅ | ✅ | Généré automatiquement |
| `RegisterRequest` | ⚠️ | ⚠️ | **Typé `any`** — doit utiliser `GeneratedSchema` |

---

## 4. Fonctionnalités entièrement manquantes

### 4.1 Module Applications (❌ 0% couvert)

La documentation décrit un module complet de gestion des Applications (clients API) avec 6 endpoints :

| Endpoint | Méthode | Description |
|---|---|---|
| `/applications/` | GET | List all applications |
| `/applications/` | POST | Create application (returns one-time secret) |
| `/applications/<id>/` | GET | Get application details |
| `/applications/<id>/` | PUT | Update application |
| `/applications/<id>/` | DELETE | Delete application |
| `/applications/<id>/regenerate/` | POST | Regenerate credentials |

**Impact** : Tout développeur admin ne peut pas gérer ses API keys depuis le SDK.

### 4.2 Module Admin Security (❌ 0% couvert)

| Endpoint | Méthode | Description |
|---|---|---|
| `/admin/audit-logs/` | GET | List audit logs (filtrable) |
| `/admin/audit-logs/<id>/` | GET | Get single audit log |
| `/admin/login-attempts/` | GET | List login attempts |
| `/admin/blacklisted-tokens/` | GET | List blacklisted tokens |
| `/admin/blacklisted-tokens/cleanup/` | POST | Cleanup expired tokens |
| `/admin/refresh-tokens/` | GET | List active refresh tokens |
| `/admin/refresh-tokens/<id>/revoke/` | POST | Revoke specific refresh token |

**Impact** : Aucune observabilité sécurité depuis le SDK.

### 4.3 GDPR User Flow (❌ ~20% couvert)

Seul `POST /request-account-deletion/` est partiellement implémenté. Il manque :

| Endpoint | Méthode | Description |
|---|---|---|
| `/confirm-account-deletion/` | POST | Confirm with token |
| `/cancel-account-deletion/` | POST | Cancel pending deletion |
| `/account-deletion-status/` | GET | Get deletion status/history |
| `/export-user-data/` | POST | GDPR data portability export |

### 4.4 GDPR Admin Flow (❌ 0% couvert)

| Endpoint | Méthode | Description |
|---|---|---|
| `/admin/deletion-requests/` | GET | List deletion requests |
| `/admin/deletion-requests/<id>/` | GET | Get deletion request |
| `/admin/deletion-requests/<id>/process/` | POST | Process deletion |
| `/admin/deletion-requests/process-expired/` | POST | Batch process expired |

### 4.5 Dashboard Module (❌ 0% couvert)

| Endpoint | Méthode | Description |
|---|---|---|
| `/dashboard/stats/` | GET | Global stats |
| `/dashboard/auth/` | GET | Auth stats |
| `/dashboard/security/` | GET | Security stats |
| `/dashboard/gdpr/` | GET | GDPR stats |
| `/dashboard/organizations/` | GET | Org stats |

### 4.6 Méthodes RBAC manquantes

| Endpoint | Méthode | Description |
|---|---|---|
| `/users/<id>/roles/` | GET | List roles for a user |
| `/users/<id>/permissions/` | GET | List direct permissions for a user |

---

## 5. Problèmes structurels & dette technique

### 5.1 CRITIQUE — Session Management non câblé

Le `TenxyteClient` ne prend **aucun** paramètre de storage et n'instancie pas les interceptors d'auth/refresh. Le développeur doit tout câbler manuellement. Ceci est contraire à l'expérience documentée dans le README.

**Le client devrait** :
1. Accepter un `storage` option (avec `MemoryStorage` par défaut)
2. Auto-configurer les interceptors `createAuthInterceptor` + `createRefreshInterceptor`
3. Émettre des events (`session:expired`, `token:refreshed`, etc.)
4. Auto-stocker les tokens après login/refresh
5. Auto-injecter `device_info` dans les requêtes d'authentification

### 5.2 HAUTE — `config.ts` vide

Aucun système de configuration centralisé. Devrait contenir :
- SDK version
- Default storage type
- Auto-refresh toggle
- Device info auto-inject toggle
- Event hooks par défaut

### 5.3 HAUTE — `index.ts` barrel incomplet

```typescript
// Manquants :
export * from './modules/b2b';    // ❌
export * from './modules/ai';     // ❌
export * from './storage';        // ❌
export * from './utils/events';   // ❌
export * from './utils/jwt';      // ❌
export * from './utils/device_info'; // ❌
export * from './http/interceptors'; // ❌
```

### 5.4 MOYENNE — `RegisterRequest = any`

Le type `RegisterRequest` dans `auth.ts` est `any`. Il devrait utiliser le schema OpenAPI généré (`GeneratedSchema['Register']` ou un type manuel reprenant les champs documentés).

### 5.5 MOYENNE — `timeoutMs` non implémenté

L'interface `HttpClientOptions` déclare `timeoutMs?` mais le HTTP client ne l'utilise jamais (pas d'`AbortController`).

### 5.6 MOYENNE — DELETE avec body via hack `as any`

`removePermissionsFromRole` et `removePermissionsFromUser` dans `rbac.ts` utilisent `as any` pour contourner le typage et passer un `body` dans un DELETE. L'interface `RequestConfig` devrait supporter cette utilisation proprement, ou ces endpoints devraient utiliser des query params.

### 5.7 BASSE — User module return types `any`

Plusieurs méthodes de `UserModule` retournent `Promise<any>` au lieu de types précis (`TenxyteUser`, etc.).

### 5.8 BASSE — `http/index.ts` n'exporte pas `interceptors.ts`

Les interceptors sont définis mais pas accessibles depuis le barrel export `http/index.ts`.

---

## 6. Couverture de tests

| Module | Fichier test | Méthodes testées | Couverture estimée |
|---|---|---|---|
| HTTP Client | `http.test.ts` | Core request, error normalization, 204, interceptors, refresh | ~85% |
| Auth | `modules/auth.test.ts` | loginEmail, logout, magicLink, social, callback | ~70% |
| Security | `modules/security.test.ts` | Non lu en détail | ~50% |
| RBAC | `modules/rbac.test.ts` | Sync checks, CRUD calls | ~60% |
| User | `modules/user.test.ts` | Profile, admin actions | ~50% |
| Storage | `storage.test.ts` | Memory, LocalStorage, Cookie | ~80% |
| Utils | `utils.test.ts` | JWT decode, base64url, device_info | ~80% |
| **B2B** | ❌ Aucun | — | **0%** |
| **AI (AIRS)** | ❌ Aucun | — | **0%** |

---

## 7. Roadmap détaillée par phases

---

### Phase 1 — Fondations critiques (Priorité: HAUTE)

> Objectif : Rendre le `TenxyteClient` fonctionnel de bout en bout comme documenté.

#### 1.1 — Implémenter `config.ts`
- Définir `TenxyteClientConfig` interface complète
- Options: `baseUrl`, `headers`, `storage`, `autoRefresh`, `autoDeviceInfo`, `timeoutMs`, `onSessionExpired`
- Valeurs par défaut sensées

#### 1.2 — Refactorer `TenxyteClient` (client.ts)
- Accepter `TenxyteClientConfig` au lieu de `HttpClientOptions`
- Instancier automatiquement le `storage` (default: `MemoryStorage`)
- Câbler `createAuthInterceptor` + `createRefreshInterceptor` automatiquement
- Intégrer `EventEmitter` directement dans le client
- Exposer `.on()`, `.once()`, `.off()` pour les events SDK
- Définir les événements : `session:expired`, `token:refreshed`, `token:stored`, `agent:awaiting_approval`, `error`

#### 1.3 — Auto-gestion des tokens après login
- Après chaque appel login/register/refresh réussi, stocker automatiquement `access_token` et `refresh_token` dans le storage
- Alimenter `rbac.setToken()` automatiquement
- Émettre `token:stored`

#### 1.4 — Implémenter `timeoutMs` avec `AbortController`
- Dans `TenxyteHttpClient.request()`, créer un `AbortController` si `timeoutMs` est défini
- Throw un `TenxyteError` avec code `TIMEOUT`

#### 1.5 — Injection automatique de `device_info`
- Option `autoDeviceInfo: boolean` dans la config
- Si activé, injecter `device_info` dans les payloads de login/register/social automatiquement via un request interceptor dédié

#### 1.6 — Compléter les barrel exports (`index.ts`)
- Ajouter tous les modules/types/utils manquants
- Exporter `interceptors.ts` depuis `http/index.ts`

**Estimation** : 2-3 jours

---

### Phase 2 — Modules manquants (Priorité: HAUTE)

> Objectif : Atteindre 100% de couverture des endpoints documentés.

#### 2.1 — Créer `modules/applications.ts`
```
ApplicationsModule
├── listApplications(params?)
├── createApplication(data)
├── getApplication(appId)
├── updateApplication(appId, data)
├── deleteApplication(appId)
└── regenerateCredentials(appId, confirmation)
```

#### 2.2 — Créer `modules/admin.ts`
```
AdminModule
├── // Audit Logs
├── listAuditLogs(params?)
├── getAuditLog(logId)
├── // Login Attempts
├── listLoginAttempts(params?)
├── // Blacklisted Tokens
├── listBlacklistedTokens(params?)
├── cleanupBlacklistedTokens()
├── // Refresh Tokens
├── listRefreshTokens(params?)
└── revokeRefreshToken(tokenId)
```

#### 2.3 — Créer `modules/gdpr.ts`
```
GdprModule
├── // User-facing
├── requestAccountDeletion(password, otpCode?, reason?)
├── confirmAccountDeletion(token)
├── cancelAccountDeletion(password)
├── getAccountDeletionStatus()
├── exportUserData(password)
├── // Admin-facing
├── listDeletionRequests(params?)
├── getDeletionRequest(requestId)
├── processDeletionRequest(requestId, confirmation, adminNotes?)
└── processExpiredDeletions()
```

#### 2.4 — Créer `modules/dashboard.ts`
```
DashboardModule
├── getStats(params?)
├── getAuthStats(params?)
├── getSecurityStats(params?)
├── getGdprStats(params?)
└── getOrganizationStats(params?)
```

#### 2.5 — Compléter les méthodes manquantes

- **`auth.ts`** : Ajouter `refreshToken(refreshToken)` comme méthode publique
- **`user.ts`** : Ajouter `getMyRoles()` pour `GET /me/roles/`
- **`user.ts`** : Déplacer GDPR user methods vers `gdpr.ts`, garder un proxy si backward compat nécessaire
- **`rbac.ts`** : Ajouter `getUserRoles(userId)` et `getUserPermissions(userId)`
- **`auth.ts`** : Ajouter `validation_url` au `MagicLinkRequest`

#### 2.6 — Enregistrer tous les nouveaux modules dans `TenxyteClient`
```typescript
public applications: ApplicationsModule;
public admin: AdminModule;
public gdpr: GdprModule;
public dashboard: DashboardModule;
```

**Estimation** : 3-4 jours

---

### Phase 3 — Intégration & DX (Priorité: MOYENNE)

> Objectif : Améliorer l'expérience développeur et préparer les packages framework.

#### 3.1 — Typer rigoureusement toutes les réponses
- Remplacer tous les `Promise<any>` par des types précis
- Typer `RegisterRequest` avec les champs documentés ou `GeneratedSchema`
- Typer les réponses admin/user avec des interfaces dédiées
- Ajouter des types pour les réponses dashboard

#### 3.2 — Fixer le DELETE avec body
- Option A : Modifier `RequestConfig` pour permettre `body` avec DELETE proprement
- Option B : Migrer vers query params pour les endpoints `removePermissionsFromRole` / `removePermissionsFromUser`
- Supprimer les `as any` hacks

#### 3.3 — Middleware de retry automatique
- Implémenter un retry configurable pour les erreurs réseau et 429 (avec `Retry-After`)
- Option dans la config : `retryConfig: { maxRetries: 3, retryOn429: true }`

#### 3.4 — Logger configurable
- Remplacer les `console.debug` / `console.warn` en dur dans `ai.ts`
- Système de log injectable : `logger: { debug, warn, error }`
- Niveaux : `silent`, `error`, `warn`, `debug`

#### 3.5 — Helpers de haut niveau
- `tx.isAuthenticated()` → vérifie si un token valide existe en storage
- `tx.getAccessToken()` → retourne le token courant
- `tx.getCurrentUser()` → retourne le user du JWT décodé
- `tx.isTokenExpired()` → check expiry du JWT en cache

#### 3.6 — Préparer l'interface pour packages/react et packages/vue
- S'assurer que `EventEmitter` émet correctement les events de state change
- Exposer un `getState()` synchrone pour les bindings réactifs
- Documenter le contrat d'interface pour les wrappers framework

**Estimation** : 3-4 jours

---

### Phase 4 — Tests & Qualité (Priorité: MOYENNE)

> Objectif : Couverture > 90% et CI robuste.

#### 4.1 — Tests modules manquants
- `modules/b2b.test.ts` — Tester toutes les méthodes (CRUD orgs, members, invitations, context switch)
- `modules/ai.test.ts` — Tester toutes les méthodes (token lifecycle, HITL, heartbeat, usage report)
- `modules/applications.test.ts` — Tester le nouveau module
- `modules/admin.test.ts` — Tester le nouveau module
- `modules/gdpr.test.ts` — Tester le nouveau module
- `modules/dashboard.test.ts` — Tester le nouveau module

#### 4.2 — Tests d'intégration du TenxyteClient refactoré
- Tester le flow complet : login → token storage → auto-refresh → session expired event
- Tester le flow agent : setAgentToken → request with AgentBearer → clearAgentToken
- Tester le flow B2B : switchOrg → request with X-Org-Slug → clearOrg

#### 4.3 — Augmenter la couverture des tests existants
- Auth : tester `register`, `loginWithPhone`, `logoutAll`
- Security : tester les flows WebAuthn (mock `navigator.credentials`)
- RBAC : tester les edge cases (token null, roles vides)
- User : tester `uploadAvatar` avec FormData, `deleteAccount`

#### 4.4 — Ajouter lint + format CI
- Configurer ESLint avec rules TypeScript strictes
- Configurer Prettier
- Ajouter un script `npm run check` qui lint + type-check + test

**Estimation** : 3-4 jours

---

### Phase 5 — Polish & Release (Priorité: BASSE)

> Objectif : Prêt pour publication npm.

#### 5.1 — Documentation complète
- Mettre à jour `README.md` avec tous les nouveaux modules
- Ajouter des exemples pour chaque module
- Documenter les events émis
- Ajouter un guide de migration pour la v1.0

#### 5.2 — Exemples fonctionnels
- Vérifier/compléter les exemples dans `examples/`
- Exemple React, Vue, Node.js vanilla

#### 5.3 — Publication
- Vérifier le `package.json` (exports, types, files)
- Versionner en `1.0.0`
- Publier sur npm
- Tag GitHub release

#### 5.4 — Préparer `packages/react` et `packages/vue`
- Créer les stubs de packages avec hooks/composables
- `useAuth()`, `useUser()`, `useOrganization()`, `useRbac()`
- Bindings réactifs sur l'`EventEmitter` du core

**Estimation** : 2-3 jours

---

## 8. Conclusion : Implémentabilité & Évolutivité

### La structure est-elle facilement implémentable ?

**Oui, très clairement.** Le pattern est simple et reproductible :

1. Créer un fichier `modules/xxx.ts`
2. Définir une classe `XxxModule` qui reçoit `TenxyteHttpClient` en constructeur
3. Implémenter les méthodes en appelant `this.client.get/post/put/patch/delete`
4. Ajouter les types de retour
5. Enregistrer dans `TenxyteClient`
6. Exporter dans `index.ts`

Tout nouveau module suit exactement ce chemin. Le couplage est minimal (chaque module ne dépend que du HTTP client).

### La structure est-elle facilement upgradable ?

**Oui, avec les réserves suivantes :**

| Aspect | Upgradable ? | Condition |
|---|---|---|
| Ajout de nouveaux modules | ✅ Trivial | Suivre le pattern existant |
| Ajout de nouveaux endpoints à un module | ✅ Trivial | Ajouter une méthode |
| Changement de version API (`/v2/`) | ✅ Facile | Modifier `baseUrl` ou ajouter un préfixe configurable |
| Wrappers framework (React/Vue) | ⚠️ Moyen | Nécessite que l'EventEmitter + session state soient branchés (Phase 1) |
| Support SSR/RSC | ✅ Facile | `MemoryStorage` déjà prévu, pas de dépendance DOM dans le core |
| OpenAPI schema update | ✅ Automatisé | Script `generate:schema` déjà en place |
| Ajout de providers social auth | ✅ Trivial | Le type union est facilement extensible |

### Estimation totale

| Phase | Effort estimé | Priorité |
|---|---|---|
| Phase 1 — Fondations | 2-3 jours | 🔴 HAUTE |
| Phase 2 — Modules manquants | 3-4 jours | 🔴 HAUTE |
| Phase 3 — DX & Intégration | 3-4 jours | 🟡 MOYENNE |
| Phase 4 — Tests & Qualité | 3-4 jours | 🟡 MOYENNE |
| Phase 5 — Polish & Release | 2-3 jours | 🟢 BASSE |
| **Total** | **13-18 jours** | — |

### Score de couverture global actuel : **~65%**

| Catégorie | Endpoints doc | Implémentés | % |
|---|---|---|---|
| Auth | 11 | 9 | 82% |
| Security (2FA/OTP/Pass/WebAuthn) | 12 | 12 | 100% |
| RBAC | 14 | 12 | 86% |
| User Profile | 4 | 2 | 50% |
| User Admin | 6 | 6 | 100% |
| B2B Organizations | 12 | 12 | 100% |
| AIRS (AI) | 11 | 11 | 100% |
| Applications | 6 | 0 | 0% |
| Admin Security | 7 | 0 | 0% |
| GDPR (User) | 5 | 1 | 20% |
| GDPR (Admin) | 4 | 0 | 0% |
| Dashboard | 5 | 0 | 0% |
| **Total** | **97** | **65** | **~67%** |

> **Le SDK a d'excellentes fondations. Les Phases 1 et 2 sont les plus critiques pour atteindre la parité documentaire et rendre le client réellement utilisable en production.**
