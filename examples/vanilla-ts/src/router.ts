import { tx } from './client'
import { setActiveNavItem, toggleShell, populateOrgSwitcher } from './layout'
import { toast } from './utils/toast'

let orgSwitcherReady = false

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

const routes: Route[] = [
    { path: '/login',          load: () => import('./pages/login'),           protected: false },
    { path: '/register',       load: () => import('./pages/register'),        protected: false },
    { path: '/dashboard',      load: () => import('./pages/dashboard'),       protected: true  },
    { path: '/organizations',  load: () => import('./pages/organizations'),   protected: true  },
    { path: '/settings',       load: () => import('./pages/settings'),        protected: true  },
    { path: '/admin',          load: () => import('./pages/admin'),           protected: true  },
    { path: '/applications',   load: () => import('./pages/applications'),    protected: true  },
    { path: '/ai',             load: () => import('./pages/ai-assistant'),    protected: true  },
    { path: '/oauth/callback', load: () => import('./pages/oauth-callback'), protected: false },
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

    // #07.1: RBAC guard — admin route requires admin:read permission
    if (path === '/admin' && !tx.rbac.hasPermission('admin:read')) {
        toast.error('Access denied')
        navigate('/dashboard')
        return
    }

    if (route.protected && !orgSwitcherReady) {
        orgSwitcherReady = true
        void populateOrgSwitcher()
        // Hide Admin link in sidebar if user lacks admin:read permission
        if (!tx.rbac.hasPermission('admin:read')) {
            const adminLink = document.querySelector<HTMLAnchorElement>('[data-route="/admin"]')
            if (adminLink) adminLink.style.display = 'none'
        }
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
