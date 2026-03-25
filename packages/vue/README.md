# @tenxyte/vue

Vue 3 bindings for the [Tenxyte SDK](https://www.npmjs.com/package/@tenxyte/core). Provides reactive composables that automatically update when authentication state changes.

## Installation

```bash
npm install @tenxyte/core @tenxyte/vue
```

## Quick Start

### 1. Install the plugin

```ts
import { createApp } from 'vue';
import { TenxyteClient } from '@tenxyte/core';
import { tenxytePlugin } from '@tenxyte/vue';
import App from './App.vue';

const tx = new TenxyteClient({
    baseUrl: 'https://api.example.com',
    headers: { 'X-Access-Key': 'your-api-key' },
});

const app = createApp(App);
app.use(tenxytePlugin, tx);
app.mount('#app');
```

### 2. Use composables in any component

```vue
<script setup lang="ts">
import { useAuth, useUser, useRbac, useOrganization } from '@tenxyte/vue';

const { isAuthenticated, loading, logout } = useAuth();
const { user } = useUser();
const { hasRole } = useRbac();
</script>

<template>
    <p v-if="loading">Loading...</p>

    <div v-else-if="isAuthenticated">
        <p>Welcome, {{ user?.email }}</p>
        <AdminPanel v-if="hasRole('admin')" />
        <button @click="logout">Logout</button>
    </div>

    <LoginPage v-else />
</template>
```

## Composables

### `useAuth()`

Reactive authentication state and actions.

```ts
const {
    isAuthenticated, // Readonly<Ref<boolean>> — true if access token is valid
    loading,         // Readonly<Ref<boolean>> — true while initial state loads
    accessToken,     // Readonly<Ref<string | null>> — raw JWT access token
    loginWithEmail,  // (data: { email, password, device_info?, totp_code? }) => Promise<void>
    loginWithPhone,  // (data: { phone_country_code, phone_number, password, device_info? }) => Promise<void>
    logout,          // () => Promise<void>
    register,        // (data) => Promise<void>
} = useAuth();
```

**Example — Login form:**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@tenxyte/vue';

const { isAuthenticated, loginWithEmail, logout, loading } = useAuth();
const email = ref('');
const password = ref('');

async function handleLogin() {
    await loginWithEmail({ email: email.value, password: password.value });
}
</script>

<template>
    <p v-if="loading">Loading...</p>
    <button v-else-if="isAuthenticated" @click="logout">Logout</button>
    <form v-else @submit.prevent="handleLogin">
        <input v-model="email" placeholder="Email" />
        <input v-model="password" type="password" placeholder="Password" />
        <button type="submit">Sign In</button>
    </form>
</template>
```

### `useUser()`

Decoded JWT user and profile management.

```ts
const {
    user,          // Readonly<Ref<DecodedTenxyteToken | null>> — decoded JWT payload
    loading,       // Readonly<Ref<boolean>>
    getProfile,    // () => Promise<UserProfile> — fetch full profile from API
    updateProfile, // (data) => Promise<unknown>
} = useUser();
```

**Example:**

```vue
<script setup lang="ts">
import { useUser } from '@tenxyte/vue';
const { user, loading } = useUser();
</script>

<template>
    <span v-if="!loading && user">{{ user.email }}</span>
</template>
```

### `useOrganization()`

Multi-tenant organization context (B2B).

```ts
const {
    activeOrg,          // Readonly<Ref<string | null>> — current org slug
    switchOrganization, // (slug: string) => void
    clearOrganization,  // () => void
} = useOrganization();
```

**Example:**

```vue
<script setup lang="ts">
import { useOrganization } from '@tenxyte/vue';
const { activeOrg, switchOrganization, clearOrganization } = useOrganization();
</script>

<template>
    <select
        :value="activeOrg ?? ''"
        @change="(e) => (e.target as HTMLSelectElement).value
            ? switchOrganization((e.target as HTMLSelectElement).value)
            : clearOrganization()"
    >
        <option value="">No organization</option>
        <option v-for="org in orgs" :key="org.slug" :value="org.slug">
            {{ org.name }}
        </option>
    </select>
</template>
```

### `useRbac()`

Synchronous role and permission checks from the current JWT.

```ts
const {
    hasRole,       // (role: string) => boolean
    hasPermission, // (permission: string) => boolean
    hasAnyRole,    // (roles: string[]) => boolean
    hasAllRoles,   // (roles: string[]) => boolean
} = useRbac();
```

**Example:**

```vue
<script setup lang="ts">
import { useRbac } from '@tenxyte/vue';
const { hasRole } = useRbac();
</script>

<template>
    <AdminPanel v-if="hasRole('admin')" />
    <p v-else>Access denied</p>
</template>
```

## How It Works

The `tenxytePlugin` provides the `TenxyteClient` instance via Vue's dependency injection (`app.provide`). Each composable calls `useTenxyteClient()` internally to retrieve the client, then subscribes to SDK events (`token:stored`, `token:refreshed`, `session:expired`) using `onMounted`/`onUnmounted` lifecycle hooks. Reactive state is exposed as `readonly(ref(...))` so templates update automatically.

## Peer Dependencies

| Package | Version |
|---|---|
| `@tenxyte/core` | `^0.9.2` |
| `vue` | `^3.3.0` |

## License

MIT — see [LICENSE](./LICENSE)
