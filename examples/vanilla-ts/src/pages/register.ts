import type { TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { navigate } from '../router'
import { toast } from '../utils/toast'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="auth-page">
            <div class="card">
                <h2>Create your account</h2>
                <div class="register-name-row">
                    <div>
                        <label class="label" for="reg-first">First name</label>
                        <input class="input" id="reg-first" type="text" placeholder="Jane" autocomplete="given-name" />
                    </div>
                    <div>
                        <label class="label" for="reg-last">Last name</label>
                        <input class="input" id="reg-last" type="text" placeholder="Doe" autocomplete="family-name" />
                    </div>
                </div>
                <label class="label" for="reg-email">Email</label>
                <input class="input" id="reg-email" type="email" placeholder="you@example.com" autocomplete="email" />
                <label class="label" for="reg-password">Password</label>
                <input class="input" id="reg-password" type="password" placeholder="Min. 8 characters" autocomplete="new-password" />
                <div id="reg-strength" class="strength-hint"></div>
                <label class="label" for="reg-confirm">Confirm password</label>
                <input class="input" id="reg-confirm" type="password" placeholder="Repeat password" autocomplete="new-password" />
                <div id="reg-error" class="error-msg"></div>
                <button class="btn" id="reg-btn">Create Account</button>
                <p class="auth-link">Already have an account? <a href="#/login">Sign in</a></p>
            </div>
        </div>
    `

    const btn = container.querySelector<HTMLButtonElement>('#reg-btn')!
    const errorEl = container.querySelector<HTMLDivElement>('#reg-error')!
    const strengthEl = container.querySelector<HTMLDivElement>('#reg-strength')!
    const passwordInput = container.querySelector<HTMLInputElement>('#reg-password')!

    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value
        if (debounceTimer) clearTimeout(debounceTimer)
        if (!val) { strengthEl.innerHTML = ''; return }
        debounceTimer = setTimeout(async () => {
            try {
                const res = await tx.security.checkPasswordStrength(val)
                const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
                const variants = ['error', 'error', 'warning', 'success', 'success']
                const s = Math.min(res.score, 4)
                strengthEl.innerHTML = `<span class="badge badge--${variants[s]}">${labels[s]}</span>`
                if (!res.is_valid) {
                    strengthEl.innerHTML += `<span class="text-muted"> — doesn't meet requirements</span>`
                }
            } catch { strengthEl.innerHTML = '' }
        }, 500)
    })

    btn.addEventListener('click', async () => {
        const first_name = container.querySelector<HTMLInputElement>('#reg-first')!.value.trim()
        const last_name  = container.querySelector<HTMLInputElement>('#reg-last')!.value.trim()
        const email      = container.querySelector<HTMLInputElement>('#reg-email')!.value.trim()
        const password   = passwordInput.value
        const confirm    = container.querySelector<HTMLInputElement>('#reg-confirm')!.value

        errorEl.textContent = ''

        if (!first_name || !last_name || !email || !password) {
            errorEl.textContent = 'All fields are required.'; return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errorEl.textContent = 'Invalid email address.'; return
        }
        if (password.length < 8) {
            errorEl.textContent = 'Password must be at least 8 characters.'; return
        }
        if (password !== confirm) {
            errorEl.textContent = 'Passwords do not match.'; return
        }

        btn.disabled = true
        btn.textContent = 'Creating account…'
        try {
            await tx.auth.register({ email, password, first_name, last_name, login: true })
            navigate('/dashboard')
        } catch (e: unknown) {
            const err = e as TenxyteError
            if ((err.code as string) === 'PASSWORD_BREACHED') {
                errorEl.textContent = '⚠️ This password has been compromised in a data breach. Please choose another.'
            } else {
                const emailErr = typeof err.details === 'object' && err.details !== null
                    ? (err.details as Record<string, string[]>).email?.[0]
                    : undefined
                const msg = emailErr ?? (typeof err.details === 'string' ? err.details : err.error ?? 'Registration failed')
                errorEl.textContent = emailErr ? 'This email is already in use.' : msg
                if (!emailErr) toast.error(msg)
            }
        } finally {
            btn.disabled = false
            btn.textContent = 'Create Account'
        }
    })
}

export function unmount(): void {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null }
}
