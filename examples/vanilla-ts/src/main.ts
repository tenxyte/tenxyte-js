import './style.css'
import { TenxyteClient } from '@tenxyte/core'

/**
 * Initialize the TenxyteClient
 * Make sure to replace env vars with your actual Application credentials.
 */
const tx = new TenxyteClient({
    baseUrl: import.meta.env.VITE_TENXYTE_BASE_URL,
    headers: {
        'X-Access-Key': import.meta.env.VITE_TENXYTE_ACCESS_KEY,
        'X-Access-Secret': import.meta.env.VITE_TENXYTE_ACCESS_SECRET,
    },
    autoRefresh: true,
    autoDeviceInfo: true,
});

// UI Elements
const appDiv = document.querySelector<HTMLDivElement>('#app')!

appDiv.innerHTML = `
  <div>
    <h1>Tenxyte SDK Example</h1>
    
    <div class="card" id="login-form">
      <h3>Login</h3>
      <input type="email" id="email" placeholder="Email" value="test@example.com" />
      <input type="password" id="password" placeholder="Password" value="password123" />
      <button id="login-btn">Sign In</button>
      <div id="status"></div>
    </div>

    <div class="card" id="user-info" style="display: none;">
      <h3>Welcome back!</h3>
      <pre id="profile-data"></pre>
      <button id="logout-btn">Log Out</button>
    </div>
    
    <div class="card">
      <h3>Events Log</h3>
      <pre id="event-log"></pre>
    </div>
  </div>
`

// DOM Elements
const loginBtn = document.querySelector<HTMLButtonElement>('#login-btn')!
const logoutBtn = document.querySelector<HTMLButtonElement>('#logout-btn')!
const emailInput = document.querySelector<HTMLInputElement>('#email')!
const passwordInput = document.querySelector<HTMLInputElement>('#password')!
const statusDiv = document.querySelector<HTMLDivElement>('#status')!
const loginForm = document.querySelector<HTMLDivElement>('#login-form')!
const userInfoSection = document.querySelector<HTMLDivElement>('#user-info')!
const profileDataPre = document.querySelector<HTMLPreElement>('#profile-data')!
const eventLogPre = document.querySelector<HTMLPreElement>('#event-log')!

// --- Event Listeners ---
function logEvent(name: string, payload?: unknown) {
    eventLogPre.textContent += `[${new Date().toLocaleTimeString()}] ${name}\n`;
    if (payload) eventLogPre.textContent += `${JSON.stringify(payload, null, 2)}\n`;
}

tx.on('session:expired', () => {
    logEvent('session:expired', { message: 'User must log in again.' });
    checkSession();
});

tx.on('token:refreshed', ({ accessToken }) => {
    logEvent('token:refreshed', { accessToken: accessToken.slice(0, 20) + '...' });
});

tx.on('error', ({ error }) => {
    logEvent('error', error);
});

// --- Actions ---

async function checkSession() {
    const isLoggedIn = await tx.isAuthenticated();
    if (isLoggedIn) {
        loginForm.style.display = 'none';
        userInfoSection.style.display = 'block';

        try {
            const profile = await tx.user.getProfile();
            profileDataPre.textContent = JSON.stringify(profile, null, 2);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            profileDataPre.textContent = 'Failed to load profile: ' + msg;
        }
    } else {
        loginForm.style.display = 'block';
        userInfoSection.style.display = 'none';
        profileDataPre.textContent = '';
    }
}

loginBtn.addEventListener('click', async () => {
    try {
        statusDiv.textContent = 'Logging in...';
        loginBtn.disabled = true;

        await tx.auth.loginWithEmail({
            email: emailInput.value,
            password: passwordInput.value,
            device_info: '',
        });

        statusDiv.textContent = '';
        logEvent('auth:login_success', { tokens_received: true });

        await checkSession();
    } catch (error: unknown) {
        const err = error as Record<string, unknown>;
        statusDiv.textContent = 'Login failed: ' + (err.details || err.error || err.message || 'Unknown error');
    } finally {
        loginBtn.disabled = false;
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await tx.auth.logoutAll();
        logEvent('auth:logout', { message: 'Session cleared.' });
        await checkSession();
    } catch (e: unknown) {
        console.error('Logout error', e);
    }
});

// Check session on load
checkSession();
