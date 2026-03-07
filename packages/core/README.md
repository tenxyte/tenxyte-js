# @tenxyte/core

The official core JavaScript/TypeScript SDK for the Tenxyte API.
This SDK is the foundation for interacting securely with Tenxyte's robust authentication, multi-tenant organization management, and Advanced AI Security (AIRS) capabilities.

## Installation

You can install the package using `npm`, `yarn`, or `pnpm`:

```bash
npm install @tenxyte/core
# or
yarn add @tenxyte/core
# or
pnpm add @tenxyte/core
```

## Initialization

The single entry point for all operations is the `TenxyteClient`. You must initialize it with your API's base URL and (if you're using App-Centric auth) the `appKey` in headers. 

> **Important**: Never expose an `appSecret` in frontend environments like React or Vue client bundles. Use it exclusively in server-side processes.

```typescript
import { TenxyteClient } from '@tenxyte/core';

const tx = new TenxyteClient({
  baseUrl: 'https://api.my-backend.com',
  headers: {
    'X-Access-Key': 'your-public-app-key' // Optional, based on your backend configs.
  }
});
```

The SDK is composed of separate functional modules: `auth`, `security`, `rbac`, `user`, `b2b`, and `ai`.

---

## Authentication Flows

### Standard Email / Password
```typescript
try {
  const { user, tokens } = await tx.auth.loginWithEmail('user@example.com', 'secure_password!');
  console.log(`Welcome back, ${user.first_name}!`);
} catch (error) {
  if (error.code === '2FA_REQUIRED') {
    // Collect TOTP code from user...
    await tx.auth.loginWithEmail('user@example.com', 'secure_password!', { totpCode: '123456' });
  }
}
```

### Social Login (OAuth2)
```typescript
// Direct token exchange
const response = await tx.auth.loginWithSocial('google', { 
    id_token: 'google_id_token_jwt' 
});

// Or using OAuth code exchange
const callback = await tx.auth.handleSocialCallback('github', 'auth_code', 'https://myapp.com/callback');
```

### Passwordless (Magic Link)
```typescript
// 1. Request the link
await tx.auth.requestMagicLink('user@example.com', 'https://myapp.com/verify-magic');

// 2. On the callback page, verify the token returned in the URL
const { user, tokens } = await tx.auth.verifyMagicLink(urlParams.get('token'));
```

---

## Authorization & RBAC

The SDK automatically intercepts your requests to attach `Authorization: Bearer <token>` when available. 
By utilizing the embedded `EventEmitter`, you can listen to rotation and expiration changes.

```typescript
tx.http.addResponseInterceptor(async (response) => {
    // You can intercept logic, or use tx.on(...) to be built later over the SDK Event layer.
    return response;
});
```

### Verifying Roles and Permissions
```typescript
// Fetch user roles & direct permissions across their active scope
const myRoles = await tx.user.getMyRoles();

// List backend global roles
const roles = await tx.rbac.listRoles();
```

---

## Advanced Security

### WebAuthn / Passkeys
The `security` module natively wraps browser credentials APIs to seamlessly interact with Tenxyte's FIDO2 bindings.

```typescript
// Register a new device/Passkey for the authenticated user
await tx.security.registerWebAuthn('My MacBook Chrome');

// Authenticate securely (Without needing a password)
const session = await tx.security.authenticateWebAuthn('user@example.com');
```

### 2FA (TOTP) Enrollment
```typescript
const { secret, qr_code_url, backup_codes } = await tx.security.setup2FA();
// Show the QR code to the user, then confirm their first valid code
await tx.security.confirm2FA(userProvidedCode);
```

---

## B2B Organizations (Multi-Tenancy)

Tenxyte natively supports complex multi-tenant B2B topologies. Using `switchOrganization` instructs the SDK to pass the context `X-Org-Slug` downstream transparently.

```typescript
// Activate context
tx.b2b.switchOrganization('acme-corp');

// All subsequent calls inject `X-Org-Slug: acme-corp`.
const members = await tx.b2b.listMembers('acme-corp');

// Invite a collaborator into this organization
await tx.b2b.inviteMember('acme-corp', { email: 'dev@example.com', role_code: 'admin' });

// Clear context
tx.b2b.clearOrganization();
```

---

## AIRS (AI Responsibility & Security)

If your architecture includes orchestrating authenticated LLM agents that take action via Tenxyte endpoints, you must use **AgentTokens**.

```typescript
// 1. Authenticated User delegates secure permissions to an Agent
const agentTokenData = await tx.ai.createAgentToken({
    agent_id: 'Invoice-Parser-Bot',
    permissions: ['invoices.read', 'invoices.create'],
    budget_limit_usd: 5.00, // strict budget enforcing
    circuit_breaker: { max_requests: 100, window_seconds: 60 }
});

// 2. Instruct the SDK to flip into Agent Mode
tx.ai.setAgentToken(agentTokenData.token);

// The SDK will now authorize using `AgentBearer <token>`.
// 3. Keep the agent alive
await tx.ai.sendHeartbeat(agentTokenData.id);

// 4. Report LLM consumption cost transparently back to backend
await tx.ai.reportUsage(agentTokenData.id, {
    cost_usd: 0.015,
    prompt_tokens: 1540,
    completion_tokens: 420
});

// Disable agent mode and return to standard User flow
tx.ai.clearAgentToken();
```

### Human In The Loop (HITL) & Auditing
```typescript
// Linking operations to prompt identifiers for debugging
tx.ai.setTraceId('trace-1234abcd-prompt');
// Request will now include X-Prompt-Trace-ID

// Any requests generating a `HTTP 202 Accepted` indicate HITL.
const pendingActions = await tx.ai.listPendingActions();
await tx.ai.confirmPendingAction(pendingActions[0].confirmation_token);
```

## License
MIT
