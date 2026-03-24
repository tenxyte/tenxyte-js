import './style.css'
import { TenxyteClient } from '@tenxyte/core'

/**
 * Initialize the TenxyteClient
 * Make sure to replace `YOUR_APP_KEY` with your actual public Application Key.
 */
const tx = new TenxyteClient({
  baseUrl: import.meta.env.VITE_TENXYTE_BASE_URL,
  headers: {
    'X-Access-Key': import.meta.env.VITE_TENXYTE_ACCESS_KEY,
    'X-Access-Secret': import.meta.env.VITE_TENXYTE_ACCESS_SECRET,
  }
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

// --- Event Listeners Example ---
function logEvent(name: string, payload?: any) {
    eventLogPre.textContent += `[${new Date().toLocaleTimeString()}] ${name}\n`;
    if (payload) eventLogPre.textContent += `${JSON.stringify(payload, null, 2)}\n`;
}

tx.on('session:expired', () => {
    logEvent('session:expired', { message: 'User must log in again.' });
    checkSession();
});

tx.on('request:error', (error) => {
    logEvent('request:error', error);
});

// --- Actions ---

async function checkSession() {
    // If we have an active session, fetch profile and show User Info
    if (tx.isAuthenticated()) {
        loginForm.style.display = 'none';
        userInfoSection.style.display = 'block';

        try {
            const profile = await tx.users.getProfile();
            profileDataPre.textContent = JSON.stringify(profile, null, 2);
        } catch (e: any) {
            profileDataPre.textContent = 'Failed to load profile: ' + e.message;
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

        const tokens = await tx.auth.loginWithEmail({
            email: emailInput.value,
            password: passwordInput.value
        });

        statusDiv.textContent = '';
        logEvent('auth:login_success', { tokens_received: true });

        checkSession();
    } catch (error: any) {
        statusDiv.textContent = 'Login failed: ' + (error.details || error.error || error.message);
    } finally {
        loginBtn.disabled = false;
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        // Perform remote logout. Since we pass the refresh token internally in production usually, 
        // here we just use the raw token (note: local clear is often sufficient for client-side).
        tx.clearSession(); // Immediately clears localStorage and headers
        logEvent('auth:logout', { message: 'Session cleared.' });

        checkSession();
    } catch (e: any) {
        console.error('Logout error', e);
    }
});

// Check session on load
checkSession();
