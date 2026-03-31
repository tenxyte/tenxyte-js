import type { TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { navigate, getHashParams } from '../router'
import { toast } from '../utils/toast'
import { logEvent } from '../utils/logger'

export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="auth-page">
            <div class="card" style="text-align:center">
                <p>Processing sign in…</p>
            </div>
        </div>
    `
    void handleCallback()
}

async function handleCallback(): Promise<void> {
    // Params arrive after the hash fragment (#/oauth/callback?code=...&state=...)
    const params       = getHashParams()
    const code         = params.code
    const state        = params.state
    const error        = params.error

    if (error) {
        logEvent('oauth:error', { error }, 'error')
        toast.error(`OAuth error: ${error}`)
        navigate('/login')
        return
    }

    const savedState   = sessionStorage.getItem('tx_pkce_state')
    const codeVerifier = sessionStorage.getItem('tx_pkce_verifier')

    if (!code || !state || state !== savedState) {
        logEvent('oauth:error', { reason: 'state_mismatch' }, 'error')
        toast.error('Security: invalid OAuth state')
        navigate('/login')
        return
    }

    sessionStorage.removeItem('tx_pkce_verifier')
    sessionStorage.removeItem('tx_pkce_state')

    const redirectUri = `${window.location.origin}/#/oauth/callback`

    try {
        // dist omits the optional 4th codeVerifier param; source (RFC 7636) supports it
        await (tx.auth.handleSocialCallback as (
            provider: string, code: string, redirectUri: string, codeVerifier?: string
        ) => Promise<unknown>)('google', code, redirectUri, codeVerifier ?? undefined)

        logEvent('oauth:code_exchanged', { provider: 'google' }, 'success')
        logEvent('oauth:login_success',  { provider: 'google' }, 'success')
        navigate('/dashboard')
    } catch (e: unknown) {
        const err = e as TenxyteError
        const msg = err.error ?? 'OAuth login failed'
        logEvent('oauth:error', { error: msg }, 'error')
        toast.error(msg)
        navigate('/login')
    }
}

export function unmount(): void {}
