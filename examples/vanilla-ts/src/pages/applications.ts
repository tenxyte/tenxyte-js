import { tx } from '../client'
import { toast } from '../utils/toast'
import { logEvent, handleApiError } from '../utils/logger'

interface App { id: string; name: string; description?: string; access_key: string; is_active: boolean; created_at: string }

let appPage = 1

export function mount(container: HTMLElement): void {
    appPage = 1
    void renderPage(container)
}

export function unmount(): void {
    appPage = 1
    document.querySelector('.app-modal-overlay')?.remove()
}

// ─── Page ───────────────────────────────────────────────────────────────

async function renderPage(container: HTMLElement): Promise<void> {
    container.innerHTML = `
        <div class="page-apps">
            <div class="page-apps-header">
                <div><h2>Applications &amp; API Keys</h2>
                    <p class="text-muted">Manage OAuth2 applications and API credentials</p>
                </div>
                <button class="btn" id="create-app-btn">+ New Application</button>
            </div>
            <div id="app-list"><div class="skeleton-block"></div></div>
        </div>
    `
    await loadAppList(container)
    container.querySelector('#create-app-btn')!.addEventListener('click', () => showCreateModal(container))
}

// ─── List ───────────────────────────────────────────────────────────────

async function loadAppList(container: HTMLElement): Promise<void> {
    const list = container.querySelector<HTMLElement>('#app-list')!
    list.innerHTML = `<div class="skeleton-block"></div>`
    try {
        // Spec: tx.applications.list({ orgId }) — actual: tx.applications.listApplications(params) — no orgId
        const res = await tx.applications.listApplications({ page: appPage, page_size: 12, ordering: '-created_at' })
        if (!res.results.length) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔑</div><p class="empty-state-title">No applications yet</p><p class="empty-state-desc">Create your first OAuth2 application to start integrating with the API.</p></div>`
            return
        }
        list.innerHTML = `
            <div class="app-grid">${(res.results as App[]).map(appCard).join('')}</div>
            <div class="pagination">
                <button class="btn btn--sm" id="app-prev" ${appPage<=1?'disabled':''}>← Prev</button>
                <span class="text-muted">Page ${appPage}</span>
                <button class="btn btn--sm" id="app-next" ${!res.next?'disabled':''}>Next →</button>
            </div>
        `
        list.querySelector('#app-prev')?.addEventListener('click', async () => { appPage--; await loadAppList(container) })
        list.querySelector('#app-next')?.addEventListener('click', async () => { appPage++; await loadAppList(container) })
        list.querySelectorAll<HTMLButtonElement>('.revoke-app-btn').forEach(btn =>
            btn.addEventListener('click', () => void handleRevoke(container, btn.dataset.appId!, btn.dataset.appName!))
        )
    } catch (e: unknown) {
        list.innerHTML = `<p class="error-msg">${handleApiError(e)}</p>`
    }
}

function appCard(app: App): string {
    const date  = new Date(app.created_at).toLocaleDateString('en-GB')
    const badge = app.is_active
        ? `<span class="role-badge role-badge--member">Active</span>`
        : `<span class="role-badge" style="background:#fee2e2;color:#991b1b">Revoked</span>`
    return `
        <div class="app-card">
            <div class="app-card-header">
                <strong class="app-name">${esc(app.name)}</strong>
                ${badge}
            </div>
            ${app.description ? `<p class="text-muted" style="font-size:0.82rem;margin:4px 0">${esc(app.description)}</p>` : ''}
            <p class="app-key-row">Key: <code class="app-key">${esc(app.access_key)}</code></p>
            <p class="text-muted" style="font-size:0.75rem">Created ${date}</p>
            ${app.is_active
                ? `<button class="btn btn-danger btn--sm revoke-app-btn" data-app-id="${app.id}" data-app-name="${esc(app.name)}">Revoke</button>`
                : `<span class="text-muted" style="font-size:0.8rem">— Application revoked</span>`}
        </div>
    `
}

// ─── Create Modal ────────────────────────────────────────────────────────

function showCreateModal(container: HTMLElement): void {
    document.querySelector('.app-modal-overlay')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'app-modal-overlay approval-overlay'
    overlay.innerHTML = `
        <div class="approval-modal" role="dialog" aria-modal="true">
            <div class="approval-modal-header"><h3>Create New Application</h3></div>
            <div class="approval-modal-body">
                <div class="form-group">
                    <label class="form-label">Name <span style="color:var(--color-error)">*</span></label>
                    <input id="new-app-name" class="input" type="text" placeholder="My API Application" />
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input id="new-app-desc" class="input" type="text" placeholder="Optional description" />
                </div>
                <p class="warning-note">⚠️ The client secret will be shown <strong>only once</strong> after creation and cannot be retrieved again.</p>
            </div>
            <div class="approval-modal-footer">
                <button class="btn" id="confirm-create">Create</button>
                <button class="btn" style="background:var(--color-surface-raised);color:var(--color-text)" id="cancel-create">Cancel</button>
            </div>
        </div>
    `
    document.body.appendChild(overlay)
    overlay.querySelector('#cancel-create')!.addEventListener('click', () => overlay.remove())
    overlay.querySelector('#confirm-create')!.addEventListener('click', async () => {
        const nameEl = overlay.querySelector<HTMLInputElement>('#new-app-name')!
        const descEl = overlay.querySelector<HTMLInputElement>('#new-app-desc')!
        const name = nameEl.value.trim()
        if (!name) { nameEl.focus(); return }
        overlay.remove()
        await handleCreate(container, name, descEl.value.trim() || undefined)
    })
}

async function handleCreate(container: HTMLElement, name: string, description?: string): Promise<void> {
    try {
        // Spec: tx.applications.create({ orgId, name, type, redirectUris, scopes }) — actual: createApplication({ name, description? })
        const res = await tx.applications.createApplication({ name, description })
        logEvent('app:created', { name, clientId: res.client_id }, 'success')
        toast.success('Application created')
        showSecretModal(container, res.name, res.client_id, res.client_secret)
    } catch (e: unknown) {
        toast.error(handleApiError(e))
    }
}

// ─── Secret Reveal Modal ─────────────────────────────────────────────────

function showSecretModal(container: HTMLElement, name: string, clientId: string, secret: string): void {
    document.querySelector('.app-modal-overlay')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'app-modal-overlay approval-overlay'
    overlay.innerHTML = `
        <div class="approval-modal" role="dialog">
            <div class="approval-modal-header"><h3>Application Created: ${esc(name)}</h3></div>
            <div class="approval-modal-body">
                <p class="warning-note">⚠️ Copy these credentials now — the secret <strong>will never be shown again</strong>.</p>
                <div class="secret-field">
                    <label class="form-label">Client ID</label>
                    <div class="secret-row">
                        <code id="val-client-id">${esc(clientId)}</code>
                        <button class="btn btn--sm copy-btn" data-target="val-client-id">Copy</button>
                    </div>
                </div>
                <div class="secret-field">
                    <label class="form-label">Client Secret</label>
                    <div class="secret-row">
                        <code id="val-secret" class="secret-masked">••••••••••••••••</code>
                        <button class="btn btn--sm" id="reveal-secret">Reveal</button>
                        <button class="btn btn--sm copy-btn" data-value="${esc(secret)}">Copy</button>
                    </div>
                </div>
            </div>
            <div class="approval-modal-footer">
                <button class="btn" id="close-secret">Done</button>
            </div>
        </div>
    `
    document.body.appendChild(overlay)
    const secretEl = overlay.querySelector<HTMLElement>('#val-secret')!
    let revealed = false
    overlay.querySelector('#reveal-secret')!.addEventListener('click', () => {
        revealed = !revealed
        secretEl.textContent = revealed ? secret : '••••••••••••••••'
        secretEl.classList.toggle('secret-masked', !revealed)
    })
    overlay.querySelectorAll<HTMLButtonElement>('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const text = btn.dataset.value ?? document.getElementById(btn.dataset.target!)?.textContent ?? ''
            await navigator.clipboard.writeText(text)
            toast.success('Copied to clipboard!')
        })
    })
    overlay.querySelector('#close-secret')!.addEventListener('click', () => {
        overlay.remove()
        void loadAppList(container)
    })
}

// ─── Revoke ──────────────────────────────────────────────────────────────

async function handleRevoke(container: HTMLElement, appId: string, appName: string): Promise<void> {
    if (!confirm(`Revoke "${appName}"? This will immediately disable all API access for this application.`)) return
    try {
        // Spec: tx.applications.revoke({ applicationId }) — actual: patchApplication(id, { is_active: false })
        await tx.applications.patchApplication(appId, { is_active: false })
        logEvent('app:revoked', { appId, name: appName }, 'warning')
        toast.success(`${appName} revoked`)
        await loadAppList(container)
    } catch (e: unknown) {
        toast.error(handleApiError(e))
    }
}

// ─── Utils ──────────────────────────────────────────────────────────────
function esc(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
