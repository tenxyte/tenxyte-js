import type { GeneratedSchema, TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { navigate, getHashParams } from '../router'
import { toast } from '../utils/toast'
import { logEvent } from '../utils/logger'

type Tab = 'email' | 'magic-link' | 'google' | 'passkey'

let activeTab: Tab = 'email'
let cooldownTimer: ReturnType<typeof setInterval> | null = null

export function mount(container: HTMLElement): void {
    const { token } = getHashParams()
    if (token) {
        renderTokenVerification(container, token)
        return
    }
    renderShell(container)
}

function renderTokenVerification(container: HTMLElement, token: string): void {
    container.innerHTML = `
        <div class="auth-page">
            <div class="card" style="text-align:center">
                <p>Verifying magic link…</p>
            </div>
        </div>
    `
    tx.auth.verifyMagicLink(token)
        .then(() => navigate('/dashboard'))
        .catch((e: unknown) => {
            const err = e as TenxyteError
            toast.error(err.error ?? 'Invalid or expired magic link')
            navigate('/login')
        })
}

function renderShell(container: HTMLElement): void {
    const tabs: { key: Tab; label: string }[] = [
        { key: 'email',      label: 'Email'      },
        { key: 'magic-link', label: 'Magic Link' },
        { key: 'google',     label: 'Google'     },
        { key: 'passkey',    label: 'Passkey'    },
    ]

    container.innerHTML = `
        <div class="auth-page">
            <div class="card">
                <h2>Sign in to TenxHub</h2>
                <div class="tab-list" id="login-tabs">
                    ${tabs.map(t => `
                        <button class="tab-btn${t.key === activeTab ? ' active' : ''}" data-tab="${t.key}">
                            ${t.label}
                        </button>
                    `).join('')}
                </div>
                <div id="tab-content"></div>
                <p class="auth-link">Don't have an account? <a href="#/register">Sign up</a></p>
            </div>
        </div>
    `

    container.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeTab = btn.dataset.tab as Tab
            container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn))
            renderTab(container.querySelector<HTMLDivElement>('#tab-content')!)
        })
    })

    renderTab(container.querySelector<HTMLDivElement>('#tab-content')!)
}

function renderTab(el: HTMLElement): void {
    el.innerHTML = ''
    switch (activeTab) {
        case 'email':      renderEmailTab(el);  break
        case 'magic-link': renderMagicTab(el);  break
        case 'google':     renderGoogleTab(el);  break
        case 'passkey':    renderStubTab(el, 'Passkey (WebAuthn) — issue #04.4'); break
    }
}

function renderEmailTab(el: HTMLElement): void {
    el.innerHTML = `
        <label class="label" for="login-email">Email</label>
        <input class="input" id="login-email" type="email" placeholder="you@example.com" autocomplete="email" />
        <label class="label" for="login-password">Password</label>
        <input class="input" id="login-password" type="password" placeholder="••••••••" autocomplete="current-password" />
        <div id="login-2fa" style="display:none">
            <label class="label" for="login-totp">Authenticator code</label>
            <input class="input" id="login-totp" type="text" inputmode="numeric" maxlength="6" placeholder="000000" />
        </div>
        <div id="login-error" class="error-msg"></div>
        <button class="btn" id="login-btn">Sign In</button>
    `

    const btn     = el.querySelector<HTMLButtonElement>('#login-btn')!
    const errorEl = el.querySelector<HTMLDivElement>('#login-error')!
    const tfaRow  = el.querySelector<HTMLDivElement>('#login-2fa')!
    let needs2fa  = false

    btn.addEventListener('click', async () => {
        const email    = el.querySelector<HTMLInputElement>('#login-email')!.value
        const password = el.querySelector<HTMLInputElement>('#login-password')!.value
        const totp     = el.querySelector<HTMLInputElement>('#login-totp')?.value.trim()

        errorEl.textContent = ''
        btn.disabled = true
        btn.textContent = needs2fa ? 'Verifying…' : 'Signing in…'

        try {
            const payload: { email: string; password: string; totp_code?: string } = { email, password }
            if (needs2fa && totp) payload.totp_code = totp
            // device_info is omitted: autoDeviceInfo: true on the client injects the
            // real device fingerprint automatically via request interceptor.
            await tx.auth.loginWithEmail(payload as GeneratedSchema['LoginEmail'])
            navigate('/dashboard')
        } catch (e: unknown) {
            const err = e as TenxyteError
            if (err.code === '2FA_REQUIRED') {
                needs2fa = true
                tfaRow.style.display = 'block'
                btn.textContent = 'Verify'
                errorEl.textContent = 'Enter your 6-digit authenticator code.'
            } else {
                const msg = typeof err.details === 'string' ? err.details : err.error ?? 'Login failed'
                errorEl.textContent = msg
            }
        } finally {
            btn.disabled = false
            if (!needs2fa) btn.textContent = 'Sign In'
        }
    })
}

function renderMagicTab(el: HTMLElement): void {
    el.innerHTML = `
        <label class="label" for="ml-email">Email</label>
        <input class="input" id="ml-email" type="email" placeholder="you@example.com" autocomplete="email" />
        <div id="ml-error" class="error-msg"></div>
        <button class="btn" id="ml-btn">Send Magic Link</button>
    `

    el.querySelector<HTMLButtonElement>('#ml-btn')!.addEventListener('click', async () => {
        const email   = el.querySelector<HTMLInputElement>('#ml-email')!.value.trim()
        const errorEl = el.querySelector<HTMLDivElement>('#ml-error')!
        const btn     = el.querySelector<HTMLButtonElement>('#ml-btn')!

        if (!email) { errorEl.textContent = 'Enter your email address.'; return }
        errorEl.textContent = ''
        btn.disabled = true
        btn.textContent = 'Sending…'

        try {
            const validationUrl = `${window.location.origin}/#/login`
            await tx.auth.requestMagicLink({ email, validation_url: validationUrl })
            renderMagicSent(el, email)
        } catch (e: unknown) {
            const err = e as TenxyteError
            errorEl.textContent = err.error ?? 'Failed to send magic link'
            btn.disabled = false
            btn.textContent = 'Send Magic Link'
        }
    })
}

function renderMagicSent(el: HTMLElement, email: string): void {
    if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }
    let remaining = 60

    el.innerHTML = `
        <div class="magic-sent">
            <div class="magic-sent-icon">📬</div>
            <p><strong>Check your inbox</strong></p>
            <p class="text-muted">We sent a magic link to <strong>${email}</strong></p>
            <button class="btn" id="ml-resend" disabled>
                Resend (<span id="ml-countdown">60</span>s)
            </button>
        </div>
    `

    const resend    = el.querySelector<HTMLButtonElement>('#ml-resend')!
    const countdown = el.querySelector<HTMLSpanElement>('#ml-countdown')!

    cooldownTimer = setInterval(() => {
        remaining--
        countdown.textContent = String(remaining)
        if (remaining <= 0) {
            clearInterval(cooldownTimer!)
            cooldownTimer = null
            resend.disabled = false
            resend.textContent = 'Resend'
        }
    }, 1000)

    resend.addEventListener('click', () => { el.innerHTML = ''; renderMagicTab(el) })
}

function renderGoogleTab(el: HTMLElement): void {
    el.innerHTML = `
        <div class="oauth-tab">
            <button class="btn btn-google" id="google-btn">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
            </button>
            <div id="google-error" class="error-msg"></div>
        </div>
    `

    el.querySelector<HTMLButtonElement>('#google-btn')!.addEventListener('click', async () => {
        const errorEl = el.querySelector<HTMLDivElement>('#google-error')!
        const clientId = (import.meta as unknown as { env: Record<string, string> }).env.VITE_GOOGLE_CLIENT_ID
        if (!clientId) {
            errorEl.textContent = 'Google OAuth not configured (VITE_GOOGLE_CLIENT_ID missing)'
            return
        }
        try {
            await initiateGooglePKCE(clientId)
        } catch {
            errorEl.textContent = 'Failed to initiate Google sign in'
        }
    })
}

async function initiateGooglePKCE(clientId: string): Promise<void> {
    const codeVerifier  = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateRandomHex(16)

    sessionStorage.setItem('tx_pkce_verifier', codeVerifier)
    sessionStorage.setItem('tx_pkce_state', state)

    logEvent('oauth:pkce_initiated', { provider: 'google', state_preview: `${state.slice(0, 8)}…` }, 'info')

    const redirectUri = `${window.location.origin}/#/oauth/callback`
    const params = new URLSearchParams({
        client_id:             clientId,
        redirect_uri:          redirectUri,
        response_type:         'code',
        scope:                 'openid email profile',
        state,
        code_challenge:        codeChallenge,
        code_challenge_method: 'S256',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

function generateCodeVerifier(): string {
    const arr = new Uint8Array(32)
    crypto.getRandomValues(arr)
    return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const data   = new TextEncoder().encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function generateRandomHex(bytes: number): string {
    const arr = new Uint8Array(bytes)
    crypto.getRandomValues(arr)
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function renderStubTab(el: HTMLElement, label: string): void {
    el.innerHTML = `<p class="text-muted" style="padding:12px 0">${label}</p>`
}

export function unmount(): void {
    if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }
}
