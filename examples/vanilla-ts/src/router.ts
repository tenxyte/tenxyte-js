import { tx } from './client'
import { setActiveNavItem, toggleShell } from './layout'

type PageModule = { mount: (el: HTMLElement) => void; unmount?: () => void }
interface Route { path: string; load: () => Promise<PageModule>; protected: boolean }

let currentUnmount: (() => void) | undefined

export function navigate(path: string): void {
    window.location.hash = `#${path}`
}

export function getCurrentRoute(): string {
    const hash = window.location.hash.replace(/^#/, '') || '/'
    return hash.split('?')[0] || '/'
}

export function getHashParams(): Record<string, string> {
    const hash = window.location.hash.replace(/^#/, '')
    const qs = hash.includes('?') ? hash.split('?')[1] : ''
    return qs ? Object.fromEntries(new URLSearchParams(qs)) : {}
}

function oauthCallbackMount(container: HTMLElement): void {
    container.innerHTML = '<div class="card"><p>Processing OAuth callback…</p></div>'
    // Full PKCE exchange: issue #03.2
    navigate('/login')
}

const routes: Route[] = [
    { path: '/login',          load: () => import('./pages/login'),         protected: false },
    { path: '/register',       load: () => import('./pages/register'),      protected: false },
    { path: '/dashboard',      load: () => import('./pages/dashboard'),     protected: true  },
    { path: '/organizations',  load: () => import('./pages/organizations'), protected: true  },
    { path: '/settings',       load: () => import('./pages/settings'),      protected: true  },
    { path: '/admin',          load: () => import('./pages/admin'),         protected: true  },
    { path: '/applications',   load: () => import('./pages/applications'),  protected: true  },
    { path: '/ai',             load: () => import('./pages/ai-assistant'),  protected: true  },
    { path: '/oauth/callback', load: () => Promise.resolve({ mount: oauthCallbackMount }), protected: false },
]

async function handleRoute(): Promise<void> {
    const path = getCurrentRoute()

    currentUnmount?.()
    currentUnmount = undefined

    const container = document.querySelector<HTMLElement>('#page-content')
    if (!container) return

    container.innerHTML = ''
    toggleShell(path)

    const route = routes.find(r => r.path === path)

    if (!route) {
        navigate((await tx.isAuthenticated()) ? '/dashboard' : '/login')
        return
    }

    if (route.protected && !(await tx.isAuthenticated())) {
        navigate('/login')
        return
    }

    const page = await route.load()
    page.mount(container)
    currentUnmount = page.unmount
    setActiveNavItem(path)
}

export function initRouter(): void {
    window.addEventListener('hashchange', () => { void handleRoute() })
    void handleRoute()
}
