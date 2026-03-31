import type { TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { toast } from '../utils/toast'
import { logEvent } from '../utils/logger'

interface Member {
    id: number; user_id: number; email: string
    first_name: string; last_name: string
    role: { code: string; name: string }; joined_at: string
}
interface OrgRole { code: string; name: string; description: string; weight: number }

export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="page-admin">
            <h2>Admin</h2>
            <section id="admin-roles" class="settings-block"></section>
        </div>
    `
    void renderRoleManagement(container.querySelector<HTMLElement>('#admin-roles')!)
}

export function unmount(): void {}

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
                    const err = e as TenxyteError
                    toast.error(err.error ?? 'Failed to update role')
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
        const err = e as TenxyteError
        tableEl.innerHTML = `<p class="error-msg">${err.error ?? 'Failed to load members'}</p>`
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
