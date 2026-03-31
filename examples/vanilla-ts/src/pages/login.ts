import type { GeneratedSchema, TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { navigate, getHashParams } from '../router'
import { toast } from '../utils/toast'

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
        case 'google':     renderStubTab(el, 'Google OAuth2 — issue #03.3');  break
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

function renderStubTab(el: HTMLElement, label: string): void {
    el.innerHTML = `<p class="text-muted" style="padding:12px 0">${label}</p>`
}

export function unmount(): void {
    if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }
}
