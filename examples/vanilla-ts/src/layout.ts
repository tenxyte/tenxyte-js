import { tx } from './client'

type UserProfile = Record<string, unknown> & {
    first_name?: string
    last_name?: string
    email?: string
}

const NAV_ITEMS = [
    { route: '/dashboard',     label: 'Dashboard',     icon: '⊞' },
    { route: '/organizations', label: 'Organizations', icon: '🏢' },
    { route: '/applications',  label: 'Applications',  icon: '🔑' },
    { route: '/ai',            label: 'AI Assistant',  icon: '✦' },
    { route: '/admin',         label: 'Admin',         icon: '🛡' },
    { route: '/settings',      label: 'Settings',      icon: '⚙' },
]

export function initLayout(): void {
    document.body.innerHTML = `
        <div id="app-shell">
            <aside id="sidebar">
                <div id="sidebar-brand">
                    <span class="brand-logo">TX</span>
                    <span class="brand-name">TenxHub</span>
                </div>
                <nav id="sidebar-nav">
                    ${NAV_ITEMS.map(({ route, icon, label }) => `
                        <a href="#${route}" class="nav-item" data-route="${route}">
                            <span class="nav-icon">${icon}</span>
                            <span class="nav-label">${label}</span>
                        </a>
                    `).join('')}
                </nav>
            </aside>
            <div id="main-area">
                <header id="app-header">
                    <div id="header-left">
                        <span id="header-logo">TenxHub</span>
                    </div>
                    <div id="header-right">
                        <select id="org-selector" title="Active organization">
                            <option value="">— No organization —</option>
                        </select>
                        <span id="header-username"></span>
                        <button id="header-logout-btn" class="btn-secondary">Log Out</button>
                    </div>
                </header>
                <main id="page-content"></main>
            </div>
            <aside id="event-log-panel">
                <div class="panel-header">
                    <span>SDK Event Log</span>
                    <button id="clear-log-btn" class="btn-secondary">Clear</button>
                </div>
                <ul id="event-log-list"></ul>
            </aside>
        </div>
    `

    document.querySelector('#clear-log-btn')!.addEventListener('click', () => {
        const list = document.querySelector<HTMLUListElement>('#event-log-list')
        if (list) list.innerHTML = ''
    })

    const sel = document.querySelector<HTMLSelectElement>('#org-selector')!
    sel.addEventListener('change', () => {
        const slug = sel.value
        if (!slug) {
            tx.b2b.clearOrganization()
            localStorage.removeItem('tx_active_org')
        } else {
            tx.b2b.switchOrganization(slug)
            localStorage.setItem('tx_active_org', slug)
        }
        window.location.reload()
    })
}

export async function populateOrgSwitcher(): Promise<void> {
    const sel = document.querySelector<HTMLSelectElement>('#org-selector')
    if (!sel) return
    try {
        const res  = await tx.b2b.listMyOrganizations()
        const orgs = res.results as Array<{ id: number; name: string; slug: string }>
        const savedSlug = localStorage.getItem('tx_active_org')
        sel.innerHTML = `<option value="">— No organization —</option>`
            + orgs.map(o =>
                `<option value="${o.slug}" ${o.slug === savedSlug ? 'selected' : ''}>${o.name}</option>`
            ).join('')
        if (savedSlug) {
            tx.b2b.switchOrganization(savedSlug)
        }
    } catch {
        // not authenticated yet — select stays empty
    }
}

export function updateHeader(user: UserProfile): void {
    const el = document.querySelector<HTMLSpanElement>('#header-username')
    if (!el) return
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || String(user.email ?? '')
    el.textContent = name
}

export function setActiveNavItem(route: string): void {
    document.querySelectorAll<HTMLAnchorElement>('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === route)
    })
}

export function toggleShell(route: string): void {
    const isAuthRoute = route === '/login' || route === '/register'
    const shell = document.querySelector<HTMLElement>('#app-shell')
    if (shell) shell.classList.toggle('auth-mode', isAuthRoute)
}
