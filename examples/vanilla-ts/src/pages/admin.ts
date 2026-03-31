import { tx } from '../client'
import { toast } from '../utils/toast'
import { logEvent, handleApiError } from '../utils/logger'

interface Member {
    id: number; user_id: number; email: string
    first_name: string; last_name: string
    role: { code: string; name: string }; joined_at: string
}
interface OrgRole { code: string; name: string; description: string; weight: number }

let statsTimer: ReturnType<typeof setInterval> | null = null
let auditPage = 1

export function mount(container: HTMLElement): void {
    const org = localStorage.getItem('tx_active_org')
    container.innerHTML = `
        <div class="page-admin">
            <h2>Admin</h2>
            <section id="admin-stats" class="settings-block"></section>
            <section id="admin-logs" class="settings-block"></section>
            <section id="admin-roles" class="settings-block"></section>
        </div>
    `
    void renderStats(container.querySelector<HTMLElement>('#admin-stats')!, org)
    void renderAuditLogs(container.querySelector<HTMLElement>('#admin-logs')!, org)
    void renderRoleManagement(container.querySelector<HTMLElement>('#admin-roles')!)
}

export function unmount(): void {
    if (statsTimer) { clearInterval(statsTimer); statsTimer = null }
    auditPage = 1
}

// ─── Stats Dashboard (#07.2) ──────────────────────────────────

async function renderStats(el: HTMLElement, org: string | null): Promise<void> {
    el.innerHTML = `
        <div class="settings-section">
            <div class="settings-section-header">
                <div><h3>Stats Dashboard</h3>
                    <p class="text-muted">${org ? `Metrics for <strong>${org}</strong>` : 'Global metrics'} — auto-refreshes every 30s</p>
                </div>
            </div>
            <div id="stats-grid" class="stats-grid">
                ${Array(4).fill(`<div class="skeleton-block" style="height:90px;border-radius:8px"></div>`).join('')}
            </div>
        </div>
    `
    await loadStats(el.querySelector<HTMLElement>('#stats-grid')!)
    statsTimer = setInterval(() => {
        const g = document.querySelector<HTMLElement>('#stats-grid')
        if (!g) { clearInterval(statsTimer!); statsTimer = null; return }
        void loadStats(g)
    }, 30_000)
}

async function loadStats(grid: HTMLElement): Promise<void> {
    try {
        // Spec: tx.dashboard.getStats({ orgId }) — actual: no orgId param; org context via X-Org-Slug header
        const [stats, sec] = await Promise.all([
            tx.dashboard.getStats({ compare: true }),
            tx.dashboard.getSecurityStats(),
        ])
        const s   = (stats.summary ?? {}) as Record<string, unknown>
        const t   = (stats.trends  ?? {}) as Record<string, unknown>
        const sr  = sec as Record<string, unknown>
        const twoFa = (sr.two_fa_adoption_rate
            ?? (sr.security_summary as Record<string,unknown> | undefined)?.two_fa_adoption) as number | undefined
        grid.innerHTML = [
            statCard('Active Sessions',   String(s.active_sessions ?? '—'),  t.user_growth as number | undefined),
            statCard('Total Users',        String(s.total_users    ?? '—'),  t.user_growth as number | undefined),
            statCard('Login Success Rate', fmtPct(t.login_success_rate),    undefined),
            statCard('2FA Adoption',       twoFa != null ? fmtPct(twoFa) : (t.security_incidents != null ? `${t.security_incidents} incidents` : '—'), undefined),
        ].join('')
    } catch (e: unknown) { grid.innerHTML = `<p class="error-msg">${handleApiError(e)}</p>` }
}

function statCard(label: string, value: string, delta?: number): string {
    const d = delta != null
        ? `<span class="stat-delta ${delta >= 0 ? 'stat-delta--up' : 'stat-delta--down'}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%</span>`
        : ''
    return `<div class="stat-card"><p class="stat-label">${label}</p><p class="stat-value">${value}${d}</p></div>`
}

function fmtPct(v: unknown): string {
    if (typeof v === 'number') return `${(v < 2 ? v * 100 : v).toFixed(1)}%`
    return '—'
}

// ─── Audit Logs (#07.3) ──────────────────────────────────────────

const AUDIT_ACTIONS = [
    'login','login_failed','logout','logout_all','password_change','2fa_enabled','2fa_disabled',
    'account_created','account_locked','account_unlocked','role_assigned','role_removed',
    'app_created','suspicious_activity','agent_action',
] as const
const FAIL_ACTIONS = new Set(['login_failed','account_locked','suspicious_activity','session_limit_exceeded','device_limit_exceeded'])

async function renderAuditLogs(el: HTMLElement, org: string | null): Promise<void> {
    el.innerHTML = `
        <div class="settings-section">
            <div class="settings-section-header">
                <div><h3>Audit Logs</h3>
                    <p class="text-muted">Security event log${org ? ` for <strong>${org}</strong>` : ''}</p>
                </div>
            </div>
            <div class="audit-filters">
                <select id="audit-action" class="input input--sm">
                    <option value="">All actions</option>
                    ${AUDIT_ACTIONS.map(a => `<option value="${a}">${a.replace(/_/g,' ')}</option>`).join('')}
                </select>
                <input id="audit-user" class="input input--sm" type="text" placeholder="Filter by user ID…" />
                <button class="btn btn--sm" id="audit-apply">Apply</button>
            </div>
            <div id="audit-body"><div class="skeleton-block"></div></div>
        </div>
    `
    auditPage = 1
    await loadAuditTable(el.querySelector<HTMLElement>('#audit-body')!, el)
    el.querySelector('#audit-apply')!.addEventListener('click', async () => {
        auditPage = 1; await loadAuditTable(el.querySelector<HTMLElement>('#audit-body')!, el)
    })
}

async function loadAuditTable(body: HTMLElement, section: HTMLElement): Promise<void> {
    const action = section.querySelector<HTMLSelectElement>('#audit-action')?.value || undefined
    const userId = section.querySelector<HTMLInputElement>('#audit-user')?.value.trim() || undefined
    body.innerHTML = `<div class="skeleton-block"></div>`
    try {
        // Spec: tx.audit.getLogs({ orgId, limit: 50 }) — actual: tx.admin.listAuditLogs({ action, user_id, page, page_size })
        const res = await tx.admin.listAuditLogs({ action, user_id: userId, page: auditPage, page_size: 20, ordering: '-created_at' })
        if (!res.results.length) { body.innerHTML = `<p class="text-muted">No log entries found.</p>`; return }
        body.innerHTML = `
            <table class="members-table audit-table">
                <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>IP</th></tr></thead>
                <tbody>${res.results.map(l => {
                    const fail = FAIL_ACTIONS.has(l.action)
                    const ts = new Date(l.created_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'medium'})
                    return `<tr class="${fail ? 'audit-row--fail' : ''}">
                        <td class="text-muted" style="white-space:nowrap;font-size:0.8rem">${ts}</td>
                        <td>${l.user_email || '—'}</td>
                        <td><span class="audit-badge audit-badge--${fail ? 'fail' : 'ok'}">${l.action.replace(/_/g,' ')}</span></td>
                        <td class="text-muted">${l.ip_address ?? '—'}</td>
                    </tr>`
                }).join('')}</tbody>
            </table>
            <div class="pagination">
                <button class="btn btn--sm" id="audit-prev" ${auditPage<=1?'disabled':''}>← Prev</button>
                <span class="text-muted">Page ${auditPage}</span>
                <button class="btn btn--sm" id="audit-next" ${!res.next?'disabled':''}>Next →</button>
            </div>
        `
        body.querySelector('#audit-prev')?.addEventListener('click', async () => { auditPage--; await loadAuditTable(body, section) })
        body.querySelector('#audit-next')?.addEventListener('click', async () => { auditPage++; await loadAuditTable(body, section) })
    } catch (e: unknown) {
        body.innerHTML = `<p class="error-msg">${handleApiError(e)}</p>`
    }
}

// ─── Role Management (#05.3) ───────────────────────────────

async function renderRoleManagement(el: HTMLElement): Promise<void> {
    const slug = localStorage.getItem('tx_active_org')
    if (!slug) {
        el.innerHTML = `
            <div class="settings-section">
                <div class="settings-section-header">
                    <div><h3>Role Management</h3></div>
                </div>
                <p class="text-muted">Select an organization using the header switcher to manage member roles.</p>
            </div>
        `
        return
    }
    el.innerHTML = `
        <div class="settings-section">
            <div class="settings-section-header">
                <div>
                    <h3>Role Management</h3>
                    <p class="text-muted">Assign roles to members of <strong>${slug}</strong></p>
                </div>
            </div>
            <div id="role-table"><div class="skeleton-block"></div></div>
        </div>
    `
    await loadRoleTable(el.querySelector<HTMLElement>('#role-table')!, slug)
}

async function loadRoleTable(tableEl: HTMLElement, slug: string): Promise<void> {
    try {
        const [membersRes, rolesRes] = await Promise.all([
            tx.b2b.listMembers(slug),
            tx.b2b.listOrgRoles(),
        ])
        const members = membersRes.results as Member[]
        const roles   = rolesRes as OrgRole[]
        if (members.length === 0) {
            tableEl.innerHTML = `<p class="text-muted">No members in this organization.</p>`
            return
        }
        tableEl.innerHTML = `
            <table class="members-table">
                <thead><tr>
                    <th>Member</th><th>Email</th><th>Role</th><th>Permissions</th>
                </tr></thead>
                <tbody>
                    ${members.map(m => roleRow(m, roles)).join('')}
                </tbody>
            </table>
        `
        tableEl.querySelectorAll<HTMLSelectElement>('.role-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const userId   = parseInt(sel.dataset.userId!, 10)
                const email    = sel.dataset.email!
                const roleCode = sel.value
                sel.disabled = true
                try {
                    await tx.b2b.updateMemberRole(slug, userId, roleCode)
                    logEvent('rbac:role_assigned', { userId, email, role: roleCode, org: slug }, 'success')
                    toast.success(`Role updated for ${email}`)
                } catch (e: unknown) {
                    toast.error(handleApiError(e))
                } finally {
                    sel.disabled = false
                }
            })
        })
        tableEl.querySelectorAll<HTMLButtonElement>('.perms-btn').forEach(btn => {
            const tooltip = btn.nextElementSibling as HTMLElement
            btn.addEventListener('click', async () => {
                if (tooltip.dataset.loaded === 'true') {
                    tooltip.style.display = tooltip.style.display === 'none' ? 'block' : 'none'
                    return
                }
                btn.disabled = true; btn.textContent = '…'
                try {
                    const res  = await tx.rbac.getUserPermissions(btn.dataset.userId!)
                    const list = Array.isArray(res)
                        ? res as string[]
                        : ((res as Record<string, unknown>).permissions as string[] ?? [])
                    tooltip.innerHTML = list.length
                        ? `<ul class="perms-list">${list.map(p => `<li><code>${p}</code></li>`).join('')}</ul>`
                        : `<span class="text-muted">No permissions assigned</span>`
                    tooltip.dataset.loaded = 'true'
                    tooltip.style.display = 'block'
                } catch {
                    tooltip.innerHTML = `<span class="text-muted">Unable to load permissions</span>`
                    tooltip.style.display = 'block'
                } finally {
                    btn.disabled = false; btn.textContent = 'View perms'
                }
            })
        })
    } catch (e: unknown) {
        tableEl.innerHTML = `<p class="error-msg">${handleApiError(e)}</p>`
    }
}

function roleRow(m: Member, roles: OrgRole[]): string {
    const name    = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email
    const options = roles.map(r =>
        `<option value="${r.code}" ${r.code === m.role.code ? 'selected' : ''}>${r.name}</option>`
    ).join('')
    return `
        <tr>
            <td>${name}</td>
            <td class="text-muted">${m.email}</td>
            <td>
                <select class="input input--sm role-select"
                        data-user-id="${m.user_id}" data-email="${m.email}">
                    ${options}
                </select>
            </td>
            <td>
                <button class="btn btn--sm perms-btn" data-user-id="${m.user_id}">View perms</button>
                <div class="perms-tooltip" style="display:none"></div>
            </td>
        </tr>
    `
}
