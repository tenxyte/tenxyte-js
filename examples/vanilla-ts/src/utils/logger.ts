import type { TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { navigate } from '../router'
import { toast } from './toast'

type LogLevel = 'error' | 'success' | 'warning' | 'info'

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
    })

    tx.on('error', ({ error }) => {
        logEvent('error', error, 'error')
        const msg = (error as TenxyteError)?.error ?? 'An unexpected SDK error occurred'
        toast.error(msg)
    })
}
