import type { TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { toast } from '../utils/toast'

interface Org { id: number; name: string; slug: string; description?: string }
interface Member {
    id: number; user_id: number; email: string
    first_name: string; last_name: string
    role: { code: string; name: string }; joined_at: string
}

export function mount(container: HTMLElement): void {
    void renderOrgList(container)
}

export function unmount(): void {}

// ─── Org List (#05.1) ───────────────────────────────────────

async function renderOrgList(container: HTMLElement): Promise<void> {
    container.innerHTML = `
        <div class="page-orgs">
            <div class="page-orgs-header">
                <h2>Organizations</h2>
                <button class="btn" id="new-org-btn">+ New organization</button>
            </div>
            <div id="org-create-form"></div>
            <div id="org-list"><div class="skeleton-block"></div></div>
        </div>
    `
    container.querySelector('#new-org-btn')!
        .addEventListener('click', () =>
            renderCreateForm(
                container.querySelector<HTMLElement>('#org-create-form')!,
                container
            )
        )
    await loadOrgList(container)
}

async function loadOrgList(container: HTMLElement): Promise<void> {
    const listEl = container.querySelector<HTMLElement>('#org-list')!
    try {
        const res = await tx.b2b.listMyOrganizations()
        const orgs = res.results as Org[]
        if (orgs.length === 0) {
            listEl.innerHTML = `
                <div class="org-empty">
                    <div class="org-empty-icon">🏢</div>
                    <p>No organizations yet.</p>
                    <p class="text-muted">Create your first organization to collaborate with your team.</p>
                </div>
            `
            return
        }
        listEl.innerHTML = `<div class="org-cards">${orgs.map(orgCard).join('')}</div>`
        orgs.forEach(org => {
            listEl.querySelector<HTMLElement>(`[data-org-slug="${org.slug}"]`)!
                .addEventListener('click', () => void renderOrgDetail(container, org))
        })
    } catch (e: unknown) {
        const err = e as TenxyteError
        listEl.innerHTML = `<p class="error-msg">${err.error ?? 'Failed to load organizations'}</p>`
    }
}

function orgCard(org: Org): string {
    const initials = org.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
    return `
        <div class="org-card" data-org-slug="${org.slug}" role="button" tabindex="0">
            <div class="org-avatar">${initials}</div>
            <div class="org-card-info">
                <strong>${org.name}</strong>
                <small class="text-muted">/${org.slug}</small>
            </div>
            <span class="org-card-arrow">›</span>
        </div>
    `
}

function renderCreateForm(formEl: HTMLElement, container: HTMLElement): void {
    if (formEl.innerHTML.includes('org-form-inner')) { formEl.innerHTML = ''; return }
    formEl.innerHTML = `
        <div class="org-form card org-form-inner">
            <h3 style="margin:0 0 12px">New organization</h3>
            <label class="label" for="org-name">Name</label>
            <input class="input" id="org-name" type="text" placeholder="Acme Corp" />
            <label class="label" for="org-slug" style="margin-top:8px">Slug</label>
            <input class="input" id="org-slug" type="text" placeholder="acme-corp" />
            <div id="org-form-error" class="error-msg"></div>
            <div class="settings-btn-row">
                <button class="btn" id="org-create-btn">Create</button>
                <button class="btn btn-ghost" id="org-cancel-btn">Cancel</button>
            </div>
        </div>
    `
    const nameInp = formEl.querySelector<HTMLInputElement>('#org-name')!
    const slugInp = formEl.querySelector<HTMLInputElement>('#org-slug')!
    nameInp.addEventListener('input', () => {
        slugInp.value = nameInp.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    })
    formEl.querySelector('#org-cancel-btn')!.addEventListener('click', () => { formEl.innerHTML = '' })
    formEl.querySelector<HTMLButtonElement>('#org-create-btn')!
        .addEventListener('click', async () => {
            const btn   = formEl.querySelector<HTMLButtonElement>('#org-create-btn')!
            const errEl = formEl.querySelector<HTMLDivElement>('#org-form-error')!
            const name  = nameInp.value.trim()
            const slug  = slugInp.value.trim()
            if (!name) { errEl.textContent = 'Name is required.'; return }
            btn.disabled = true; btn.textContent = 'Creating…'
            errEl.textContent = ''
            try {
                await tx.b2b.createOrganization({ name, slug: slug || undefined })
                toast.success(`Organization “${name}” created`)
                formEl.innerHTML = ''
                await loadOrgList(container)
            } catch (e: unknown) {
                const err = e as TenxyteError
                errEl.textContent = err.error ?? 'Creation failed'
                btn.disabled = false; btn.textContent = 'Create'
            }
        })
}

// ─── Org Detail + Members (#05.2) ───────────────────────────────

async function renderOrgDetail(container: HTMLElement, org: Org): Promise<void> {
    container.innerHTML = `
        <div class="page-orgs">
            <div class="page-orgs-header">
                <button class="btn btn-ghost btn--sm" id="back-btn">‹ Back</button>
                <h2>${org.name}</h2>
                <button class="btn btn--sm" id="invite-btn">+ Invite member</button>
            </div>
            <div id="invite-form"></div>
            <div id="members-table"><div class="skeleton-block"></div></div>
        </div>
    `
    container.querySelector('#back-btn')!.addEventListener('click', () => void renderOrgList(container))
    container.querySelector('#invite-btn')!
        .addEventListener('click', () =>
            renderInviteForm(
                container.querySelector<HTMLElement>('#invite-form')!,
                org, container
            )
        )
    await loadMembers(container, org)
}

async function loadMembers(container: HTMLElement, org: Org): Promise<void> {
    const tableEl = container.querySelector<HTMLElement>('#members-table')!
    try {
        const res     = await tx.b2b.listMembers(org.slug)
        const members = res.results as Member[]
        const adminCount = members.filter(m =>
            m.role.code === 'admin' || m.role.code === 'owner'
        ).length
        tableEl.innerHTML = members.length === 0
            ? `<p class="text-muted">No members yet.</p>`
            : `
                <table class="members-table">
                    <thead><tr>
                        <th>Member</th><th>Email</th><th>Role</th><th>Joined</th><th></th>
                    </tr></thead>
                    <tbody>
                        ${members.map(m => memberRow(m, adminCount)).join('')}
                    </tbody>
                </table>
            `
        tableEl.querySelectorAll<HTMLButtonElement>('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const uid   = parseInt(btn.dataset.userId!, 10)
                const email = btn.dataset.email!
                if (!confirm(`Remove ${email} from this organization?`)) return
                btn.disabled = true
                try {
                    await tx.b2b.removeMember(org.slug, uid)
                    toast.info(`${email} removed`)
                    await loadMembers(container, org)
                } catch (e: unknown) {
                    const err = e as TenxyteError
                    toast.error(err.error ?? 'Failed to remove member')
                    btn.disabled = false
                }
            })
        })
    } catch (e: unknown) {
        const err = e as TenxyteError
        tableEl.innerHTML = `<p class="error-msg">${err.error ?? 'Failed to load members'}</p>`
    }
}

function memberRow(m: Member, adminCount: number): string {
    const initials = [m.first_name?.[0], m.last_name?.[0]].filter(Boolean).join('').toUpperCase()
        || m.email[0].toUpperCase()
    const isLastAdmin = (m.role.code === 'admin' || m.role.code === 'owner') && adminCount <= 1
    return `
        <tr>
            <td>
                <div class="member-cell">
                    <span class="member-avatar">${initials}</span>
                    <span>${m.first_name} ${m.last_name}</span>
                </div>
            </td>
            <td class="text-muted">${m.email}</td>
            <td><span class="role-badge role-${m.role.code}">${m.role.name}</span></td>
            <td class="text-muted">${new Date(m.joined_at).toLocaleDateString()}</td>
            <td>
                ${isLastAdmin
                    ? `<span class="text-muted" title="Cannot remove last admin">—</span>`
                    : `<button class="btn btn-danger btn--sm remove-member-btn"
                               data-user-id="${m.user_id}"
                               data-email="${m.email}">Remove</button>`
                }
            </td>
        </tr>
    `
}

function renderInviteForm(formEl: HTMLElement, org: Org, container: HTMLElement): void {
    if (formEl.innerHTML.includes('invite-form-inner')) { formEl.innerHTML = ''; return }
    formEl.innerHTML = `
        <div class="org-form card invite-form-inner">
            <h3 style="margin:0 0 12px">Invite member</h3>
            <label class="label" for="invite-email">Email</label>
            <input class="input" id="invite-email" type="email" placeholder="colleague@example.com" />
            <label class="label" for="invite-role" style="margin-top:8px">Role</label>
            <select class="input" id="invite-role">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
            </select>
            <div id="invite-error" class="error-msg"></div>
            <div class="settings-btn-row">
                <button class="btn" id="invite-send-btn">Send invitation</button>
                <button class="btn btn-ghost" id="invite-cancel-btn">Cancel</button>
            </div>
        </div>
    `
    formEl.querySelector('#invite-cancel-btn')!.addEventListener('click', () => { formEl.innerHTML = '' })
    formEl.querySelector<HTMLButtonElement>('#invite-send-btn')!
        .addEventListener('click', async () => {
            const btn   = formEl.querySelector<HTMLButtonElement>('#invite-send-btn')!
            const errEl = formEl.querySelector<HTMLDivElement>('#invite-error')!
            const email = formEl.querySelector<HTMLInputElement>('#invite-email')!.value.trim()
            const role  = formEl.querySelector<HTMLSelectElement>('#invite-role')!.value
            if (!email) { errEl.textContent = 'Enter an email address.'; return }
            btn.disabled = true; btn.textContent = 'Sending…'
            errEl.textContent = ''
            try {
                await tx.b2b.inviteMember(org.slug, { email, role_code: role })
                toast.success(`Invitation sent to ${email}`)
                formEl.innerHTML = ''
                await loadMembers(container, org)
            } catch (e: unknown) {
                const err = e as TenxyteError
                errEl.textContent = err.error ?? 'Failed to send invitation'
                btn.disabled = false; btn.textContent = 'Send invitation'
            }
        })
}
