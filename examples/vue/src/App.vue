<script setup lang="ts">
import { ref } from 'vue';
import { useAuth, useUser, useOrganization, useRbac } from '@tenxyte/vue';

const { isAuthenticated, loading, loginWithEmail, logout } = useAuth();
const { user } = useUser();
const { activeOrg, switchOrganization, clearOrganization } = useOrganization();
const { hasRole } = useRbac();

const email = ref('test@example.com');
const password = ref('password123');
const error = ref<string | null>(null);

async function handleLogin() {
    try {
        error.value = null;
        await loginWithEmail({ email: email.value, password: password.value });
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    }
}
</script>

<template>
    <div style="max-width: 600px; margin: 2rem auto; font-family: sans-serif">
        <h1>Tenxyte Vue Example</h1>

        <p v-if="loading">Loading...</p>

        <!-- Login Form -->
        <div v-else-if="!isAuthenticated">
            <div style="display: flex; flex-direction: column; gap: 8px; max-width: 400px">
                <input v-model="email" placeholder="Email" />
                <input v-model="password" type="password" placeholder="Password" />
                <button @click="handleLogin">Sign In</button>
                <p v-if="error" style="color: red">{{ error }}</p>
            </div>
        </div>

        <!-- Authenticated View -->
        <div v-else>
            <section>
                <h2>User</h2>
                <pre>{{ JSON.stringify(user, null, 2) }}</pre>
            </section>

            <section>
                <h2>Roles</h2>
                <p>Admin: {{ hasRole('admin') ? '✅' : '❌' }}</p>
                <p>Editor: {{ hasRole('editor') ? '✅' : '❌' }}</p>
            </section>

            <section>
                <h2>Organization</h2>
                <p>Active: {{ activeOrg ?? 'None' }}</p>
                <button @click="switchOrganization('acme')">Switch to Acme</button>
                <button @click="clearOrganization">Clear Org</button>
            </section>

            <button @click="logout" style="margin-top: 16px">Log Out</button>
        </div>
    </div>
</template>
