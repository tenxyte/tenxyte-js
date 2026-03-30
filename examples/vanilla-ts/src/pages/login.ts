import { tx } from '../client'
import { navigate } from '../router'

export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="auth-page">
            <div class="card">
                <h2>Sign in to TenxHub</h2>
                <label class="label" for="login-email">Email</label>
                <input class="input" id="login-email" type="email" placeholder="you@example.com" autocomplete="email" />
                <label class="label" for="login-password">Password</label>
                <input class="input" id="login-password" type="password" placeholder="••••••••" autocomplete="current-password" />
                <div id="login-error" class="error-msg"></div>
                <button class="btn" id="login-btn">Sign In</button>
                <p class="auth-link">Don't have an account? <a href="#/register">Sign up</a></p>
            </div>
        </div>
    `

    const btn = container.querySelector<HTMLButtonElement>('#login-btn')!
    const errorEl = container.querySelector<HTMLDivElement>('#login-error')!

    btn.addEventListener('click', async () => {
        const email = container.querySelector<HTMLInputElement>('#login-email')!.value
        const password = container.querySelector<HTMLInputElement>('#login-password')!.value
        errorEl.textContent = ''
        btn.disabled = true
        btn.textContent = 'Signing in…'
        try {
            // device_info: '' is a placeholder; autoDeviceInfo: true on the client
            // injects the real fingerprint automatically (interceptor replaces falsy values).
            await tx.auth.loginWithEmail({ email, password, device_info: '' })
            navigate('/dashboard')
        } catch (e: unknown) {
            const err = e as Record<string, unknown>
            errorEl.textContent = String(err.details ?? err.error ?? err.message ?? 'Login failed')
        } finally {
            btn.disabled = false
            btn.textContent = 'Sign In'
        }
    })
}

export function unmount(): void {}
