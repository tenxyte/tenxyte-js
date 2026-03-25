# @tenxyte/react

React bindings for the [Tenxyte SDK](https://www.npmjs.com/package/@tenxyte/core). Provides reactive hooks that automatically re-render your components when authentication state changes.

## Installation

```bash
npm install @tenxyte/core @tenxyte/react
```

## Quick Start

### 1. Create the client and wrap your app

```tsx
import { TenxyteClient } from '@tenxyte/core';
import { TenxyteProvider } from '@tenxyte/react';
import App from './App';

const tx = new TenxyteClient({
    baseUrl: 'https://api.example.com',
    headers: { 'X-Access-Key': 'your-api-key' },
});

function Root() {
    return (
        <TenxyteProvider client={tx}>
            <App />
        </TenxyteProvider>
    );
}
```

### 2. Use hooks in any component

```tsx
import { useAuth, useUser, useRbac, useOrganization } from '@tenxyte/react';

function Dashboard() {
    const { isAuthenticated, loading, logout } = useAuth();
    const { user } = useUser();
    const { hasRole } = useRbac();

    if (loading) return <p>Loading...</p>;
    if (!isAuthenticated) return <LoginPage />;

    return (
        <div>
            <p>Welcome, {user?.email}</p>
            {hasRole('admin') && <AdminPanel />}
            <button onClick={logout}>Logout</button>
        </div>
    );
}
```

## Hooks

### `useAuth()`

Reactive authentication state and actions.

```tsx
const {
    isAuthenticated, // boolean — true if access token is valid and not expired
    loading,         // boolean — true while initial state loads from storage
    accessToken,     // string | null — raw JWT access token
    loginWithEmail,  // (data: { email, password, device_info?, totp_code? }) => Promise<void>
    loginWithPhone,  // (data: { phone_country_code, phone_number, password, device_info? }) => Promise<void>
    logout,          // () => Promise<void>
    register,        // (data) => Promise<void>
} = useAuth();
```

**Example — Login form:**

```tsx
function LoginPage() {
    const { loginWithEmail } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await loginWithEmail({ email, password });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            <button type="submit">Sign In</button>
        </form>
    );
}
```

### `useUser()`

Decoded JWT user and profile management.

```tsx
const {
    user,          // DecodedTenxyteToken | null — decoded JWT payload
    loading,       // boolean
    getProfile,    // () => Promise<UserProfile> — fetch full profile from API
    updateProfile, // (data) => Promise<unknown>
} = useUser();
```

**Example:**

```tsx
function UserBadge() {
    const { user, loading } = useUser();
    if (loading || !user) return null;
    return <span>{user.email}</span>;
}
```

### `useOrganization()`

Multi-tenant organization context (B2B).

```tsx
const {
    activeOrg,          // string | null — current org slug
    switchOrganization, // (slug: string) => void
    clearOrganization,  // () => void
} = useOrganization();
```

**Example:**

```tsx
function OrgSwitcher({ orgs }: { orgs: { slug: string; name: string }[] }) {
    const { activeOrg, switchOrganization, clearOrganization } = useOrganization();

    return (
        <select
            value={activeOrg ?? ''}
            onChange={(e) =>
                e.target.value ? switchOrganization(e.target.value) : clearOrganization()
            }
        >
            <option value="">No organization</option>
            {orgs.map((o) => (
                <option key={o.slug} value={o.slug}>{o.name}</option>
            ))}
        </select>
    );
}
```

### `useRbac()`

Synchronous role and permission checks from the current JWT.

```tsx
const {
    hasRole,       // (role: string) => boolean
    hasPermission, // (permission: string) => boolean
    hasAnyRole,    // (roles: string[]) => boolean
    hasAllRoles,   // (roles: string[]) => boolean
} = useRbac();
```

**Example:**

```tsx
function AdminPanel() {
    const { hasRole } = useRbac();
    if (!hasRole('admin')) return <p>Access denied</p>;
    return <AdminDashboard />;
}
```

## How It Works

`TenxyteProvider` places the `TenxyteClient` instance into React context. Each hook subscribes to SDK events (`token:stored`, `token:refreshed`, `session:expired`) and triggers a re-render when the auth state changes. All state updates are automatic — no manual invalidation needed.

## Peer Dependencies

| Package | Version |
|---|---|
| `@tenxyte/core` | `^0.9.2` |
| `react` | `^18.0.0 \|\| ^19.0.0` |

## License

MIT — see [LICENSE](./LICENSE)
