import express from 'express';
import { TenxyteClient, MemoryStorage } from '@tenxyte/core';

// ─── Configuration ───
const PORT = process.env.PORT ?? 3000;
const TENXYTE_BASE_URL = process.env.TENXYTE_BASE_URL ?? 'http://localhost:8000';
const TENXYTE_ACCESS_KEY = process.env.TENXYTE_ACCESS_KEY ?? '';
const TENXYTE_ACCESS_SECRET = process.env.TENXYTE_ACCESS_SECRET ?? '';

// ─── SDK Initialization ───
// In a real app, you'd create one client per user session.
// For this demo, we use a single shared client.
const tx = new TenxyteClient({
    baseUrl: TENXYTE_BASE_URL,
    headers: {
        ...(TENXYTE_ACCESS_KEY && { 'X-Access-Key': TENXYTE_ACCESS_KEY }),
        ...(TENXYTE_ACCESS_SECRET && { 'X-Access-Secret': TENXYTE_ACCESS_SECRET }),
    },
    storage: new MemoryStorage(),
    autoRefresh: true,
    logger: console,
    logLevel: 'debug',
});

// Listen to SDK events
tx.on('session:expired', () => {
    console.log('[SDK Event] Session expired — user must re-authenticate.');
});

tx.on('token:refreshed', ({ accessToken }) => {
    console.log(`[SDK Event] Token refreshed: ${accessToken.slice(0, 20)}...`);
});

// ─── Express App ───
const app = express();
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok', sdk: '@tenxyte/core', version: '1.0.0' });
});

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const tokens = await tx.auth.loginWithEmail({
            email,
            password,
            device_info: `node-express/${process.version}`,
        });
        res.json({ message: 'Login successful', tokens });
    } catch (error) {
        res.status(401).json({ error: 'Login failed', details: error });
    }
});

// Register
app.post('/auth/register', async (req, res) => {
    try {
        const result = await tx.auth.register(req.body);
        res.status(201).json({ message: 'Registration successful', result });
    } catch (error) {
        res.status(400).json({ error: 'Registration failed', details: error });
    }
});

// Get current user profile
app.get('/me', async (_req, res) => {
    try {
        const isLoggedIn = await tx.isAuthenticated();
        if (!isLoggedIn) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const profile = await tx.user.getProfile();
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile', details: error });
    }
});

// Get decoded JWT user info (no network call)
app.get('/me/jwt', async (_req, res) => {
    const user = await tx.getCurrentUser();
    if (!user) {
        res.status(401).json({ error: 'No valid token' });
        return;
    }
    res.json(user);
});

// Check roles (synchronous JWT check)
app.get('/me/roles', async (_req, res) => {
    const token = await tx.getAccessToken();
    if (!token) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    tx.rbac.setToken(token);
    res.json({
        hasAdmin: tx.rbac.hasRole('admin'),
        hasEditor: tx.rbac.hasRole('editor'),
    });
});

// List organizations
app.get('/organizations', async (_req, res) => {
    try {
        const orgs = await tx.b2b.listOrganizations();
        res.json(orgs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list organizations', details: error });
    }
});

// Switch org context and list members
app.get('/organizations/:slug/members', async (req, res) => {
    try {
        tx.b2b.switchOrganization(req.params.slug);
        const members = await tx.b2b.listMembers(req.params.slug);
        tx.b2b.clearOrganization();
        res.json(members);
    } catch (error) {
        tx.b2b.clearOrganization();
        res.status(500).json({ error: 'Failed to list members', details: error });
    }
});

// Logout
app.post('/auth/logout', async (_req, res) => {
    try {
        await tx.auth.logoutAll();
        res.json({ message: 'Logged out' });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed', details: error });
    }
});

// SDK state snapshot
app.get('/sdk/state', async (_req, res) => {
    const state = await tx.getState();
    res.json(state);
});

// ─── Start Server ───
app.listen(PORT, () => {
    console.log(`🚀 Tenxyte Node.js Express example running on http://localhost:${PORT}`);
    console.log(`   API Base URL: ${TENXYTE_BASE_URL}`);
});
