import type { TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { navigate } from '../router'
import { toast } from './toast'

type LogLevel = 'error' | 'success' | 'warning' | 'info'

// ─── Centralized API error messages (#09.2) ──────────────────

const API_ERROR_MAP: Record<string, string> = {
    invalid_credentials:      'Invalid email or password.',
    email_already_exists:     'This email is already in use.',
    password_too_weak:        'Password does not meet requirements.',
    user_not_found:           'User not found.',
    token_expired:            'Your session has expired. Please sign in again.',
    invalid_token:            'Invalid or expired token.',
    permission_denied:        'You do not have permission to perform this action.',
    rate_limited:             'Too many requests. Please wait a moment.',
    account_locked:           'Your account has been locked. Please contact support.',
    email_not_verified:       'Please verify your email address.',
    invalid_current_password: 'Current password is incorrect.',
    password_breached:        'This password was found in a data breach. Please choose another.',
    organization_not_found:   'Organization not found.',
    member_already_exists:    'This user is already a member.',
    totp_invalid:             'Invalid 2FA code. Please try again.',
}

export function handleApiError(error: unknown): string {
    const raw  = error as Record<string, unknown>
    const code = typeof raw.code === 'string' ? raw.code.toLowerCase() : ''
    const mapped = code ? API_ERROR_MAP[code] : undefined
    if (mapped) return mapped
    const err = error as TenxyteError
    return err?.error ?? (error instanceof Error ? error.message : 'An unexpected error occurred, please try again.')
}

const MAX_ENTRIES = 100

export function logEvent(name: string, payload?: unknown, level: LogLevel = 'info'): void {
    const list = document.querySelector<HTMLUListElement>('#event-log-list')
    if (!list) return

    const time = new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    })

    const item = document.createElement('li')
    item.className = `log-entry log-entry--${level}`

    const header = `<span class="log-time">[${time}]</span> <span class="log-name">${name}</span>`

    if (payload !== undefined && payload !== null) {
        item.innerHTML = `
            <details>
                <summary>${header}</summary>
                <pre class="log-payload">${JSON.stringify(payload, null, 2)}</pre>
            </details>
        `
    } else {
        item.innerHTML = header
    }

    list.appendChild(item)
    item.scrollIntoView({ behavior: 'smooth', block: 'end' })

    while (list.children.length > MAX_ENTRIES) {
        list.removeChild(list.firstChild!)
    }
}

export function initLogger(): void {
    tx.on('session:expired', () => {
        logEvent('session:expired', undefined, 'error')
        toast.error('Session expired, please sign in again')
        navigate('/login')
    })

    tx.on('token:refreshed', ({ accessToken }) => {
        logEvent('token:refreshed', { accessToken: `${accessToken.slice(0, 20)}…` }, 'success')
    })

    tx.on('token:stored', ({ accessToken, refreshToken }) => {
        logEvent('token:stored', { accessToken: `${accessToken.slice(0, 20)}…`, hasRefresh: !!refreshToken }, 'success')
    })

    tx.on('agent:awaiting_approval', ({ action }) => {
        logEvent('agent:awaiting_approval', action, 'warning')
        document.dispatchEvent(new CustomEvent('agent:awaiting_approval', { detail: action }))
    })

    tx.on('error', ({ error }) => {
        logEvent('error', error, 'error')
        const msg = (error as TenxyteError)?.error ?? 'An unexpected SDK error occurred'
        toast.error(msg)
    })
}
