import type { TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { navigate } from '../router'
import { toast } from '../utils/toast'
import { logEvent } from '../utils/logger'

interface TwoFAStatus { is_enabled: boolean; backup_codes_remaining: number }
interface WebAuthnCredential { id: number; device_name: string; created_at: string; last_used_at?: string }
interface SessionInfo { id: string; user_email: string; device_info?: string; ip_address?: string | null; last_used_at: string; created_at: string; is_revoked?: boolean }

const EXPORT_LS_KEY = 'gdpr_export_ts'
let pwdDebounce: ReturnType<typeof setTimeout> | null = null

export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="page-settings">
            <h2>Settings</h2>
            <section id="settings-2fa" class="settings-block"></section>
            <hr class="settings-divider" />
            <section id="settings-passkeys" class="settings-block"></section>
            <hr class="settings-divider" />
            <section id="settings-password" class="settings-block"></section>
            <hr class="settings-divider" />
            <section id="settings-sessions" class="settings-block"></section>
            <hr class="settings-divider" />
            <section id="settings-data" class="settings-block"></section>
            <hr class="settings-divider" />
            <section id="settings-danger" class="settings-block"></section>
        </div>
    `
    void render2FASection(container.querySelector<HTMLElement>('#settings-2fa')!)
    void renderPasskeySection(container.querySelector<HTMLElement>('#settings-passkeys')!)
    renderPasswordSection(container.querySelector<HTMLElement>('#settings-password')!)
    void renderSessionsSection(container.querySelector<HTMLElement>('#settings-sessions')!)
    renderDataSection(container.querySelector<HTMLElement>('#settings-data')!)
    renderDangerSection(container.querySelector<HTMLElement>('#settings-danger')!)
}

export function unmount(): void {
    if (pwdDebounce) { clearTimeout(pwdDebounce); pwdDebounce = null }
    document.getElementById('delete-modal-overlay')?.remove()
}

// ─── 2FA Section (#04.1 + #04.2) ─────────────────────────────

async function render2FASection(el: HTMLElement): Promise<void> {
    el.innerHTML = `<div class="skeleton-block"></div>`
    try {
        const status = await tx.security.get2FAStatus()
        paint2FASection(el, status)
    } catch {
        el.innerHTML = `<p class="error-msg">Failed to load 2FA status.</p>`
    }
}

function paint2FASection(el: HTMLElement, status: TwoFAStatus): void {
    const badge = status.is_enabled
        ? `<span class="badge badge--success">Enabled</span>`
        : `<span class="badge badge--danger">Disabled</span>`

    el.innerHTML = `
        <div class="settings-section">
            <div class="settings-section-header">
                <div>
                    <h3>Two-Factor Authentication</h3>
                    <p class="text-muted">Secure your account with TOTP (Google Authenticator, Authy)</p>
                </div>
                ${badge}
            </div>
            <div id="2fa-actions">
                ${status.is_enabled
                    ? `<button class="btn btn-danger" id="disable-2fa-btn">Disable 2FA</button>`
                    : `<button class="btn" id="enable-2fa-btn">Enable 2FA</button>`
                }
            </div>
            <div id="2fa-panel"></div>
        </div>
    `

    if (status.is_enabled) {
        el.querySelector<HTMLButtonElement>('#disable-2fa-btn')!
            .addEventListener('click', () =>
                renderDisable2FAPanel(
                    el.querySelector<HTMLDivElement>('#2fa-panel')!, el
                )
            )
    } else {
        el.querySelector<HTMLButtonElement>('#enable-2fa-btn')!
            .addEventListener('click', async () => {
                const btn = el.querySelector<HTMLButtonElement>('#enable-2fa-btn')!
                btn.disabled = true
                await renderSetup2FAPanel(
                    el.querySelector<HTMLDivElement>('#2fa-panel')!, el
                )
                btn.disabled = false
            })
    }
}

async function renderSetup2FAPanel(panel: HTMLElement, sectionEl: HTMLElement): Promise<void> {
    panel.innerHTML = `<p class="text-muted" style="margin-top:12px">Generating setup…</p>`
    try {
        const res = await tx.security.setup2FA()
        panel.innerHTML = `
            <div class="totp-setup">
                <p>Scan this QR code with your authenticator app:</p>
                <img src="${res.qr_code}" alt="TOTP QR code" class="totp-qr" />
                <p class="text-muted">Manual key: <code>${res.manual_entry_key}</code></p>
                <label class="label" for="totp-verify-code">Verification code</label>
                <input class="input totp-input" id="totp-verify-code" type="text"
                       inputmode="numeric" maxlength="7" placeholder="000 000"
                       autocomplete="one-time-code" />
                <div id="totp-verify-error" class="error-msg"></div>
                <button class="btn" id="totp-verify-btn">Verify and enable</button>
            </div>
        `
        const inp = panel.querySelector<HTMLInputElement>('#totp-verify-code')!
        inp.addEventListener('input', () => {
            const d = inp.value.replace(/\D/g, '').slice(0, 6)
            inp.value = d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d
        })
        panel.querySelector<HTMLButtonElement>('#totp-verify-btn')!
            .addEventListener('click', async () => {
                const btn   = panel.querySelector<HTMLButtonElement>('#totp-verify-btn')!
                const errEl = panel.querySelector<HTMLDivElement>('#totp-verify-error')!
                const code  = inp.value.replace(/\s/g, '')
                if (code.length < 6) { errEl.textContent = 'Enter the 6-digit code.'; return }
                btn.disabled = true; btn.textContent = 'Verifying…'
                errEl.textContent = ''
                try {
                    await tx.security.confirm2FA(code)
                    logEvent('auth:2fa_setup', { action: 'enabled' }, 'success')
                    toast.success('2FA enabled successfully')
                    await render2FASection(sectionEl)
                } catch (e: unknown) {
                    const err = e as TenxyteError
                    errEl.textContent = err.error ?? 'Incorrect code, try again'
                    btn.disabled = false; btn.textContent = 'Verify and enable'
                }
            })
    } catch (e: unknown) {
        const err = e as TenxyteError
        panel.innerHTML = `<p class="error-msg">${err.error ?? 'Setup failed'}</p>`
    }
}

function renderDisable2FAPanel(panel: HTMLElement, sectionEl: HTMLElement): void {
    panel.innerHTML = `
        <div class="totp-setup">
            <p class="text-muted">Enter your current authenticator code to confirm.</p>
            <label class="label" for="totp-disable-code">TOTP code</label>
            <input class="input totp-input" id="totp-disable-code" type="text"
                   inputmode="numeric" maxlength="7" placeholder="000 000"
                   autocomplete="one-time-code" />
            <div id="totp-disable-error" class="error-msg"></div>
            <div class="settings-btn-row">
                <button class="btn btn-danger" id="totp-disable-confirm-btn">Confirm disable</button>
                <button class="btn btn-ghost" id="totp-disable-cancel-btn">Cancel</button>
            </div>
        </div>
    `
    const inp = panel.querySelector<HTMLInputElement>('#totp-disable-code')!
    inp.addEventListener('input', () => {
        const d = inp.value.replace(/\D/g, '').slice(0, 6)
        inp.value = d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d
    })
    panel.querySelector('#totp-disable-cancel-btn')!.addEventListener('click', () => { panel.innerHTML = '' })
    panel.querySelector<HTMLButtonElement>('#totp-disable-confirm-btn')!
        .addEventListener('click', async () => {
            const btn   = panel.querySelector<HTMLButtonElement>('#totp-disable-confirm-btn')!
            const errEl = panel.querySelector<HTMLDivElement>('#totp-disable-error')!
            const code  = inp.value.replace(/\s/g, '')
            if (code.length < 6) { errEl.textContent = 'Enter the 6-digit code.'; return }
            btn.disabled = true; btn.textContent = 'Disabling…'
            errEl.textContent = ''
            try {
                await tx.security.disable2FA(code)
                logEvent('auth:2fa_setup', { action: 'disabled' }, 'info')
                toast.info('2FA disabled')
                await render2FASection(sectionEl)
            } catch (e: unknown) {
                const err = e as TenxyteError
                errEl.textContent = err.error ?? 'Incorrect code'
                btn.disabled = false; btn.textContent = 'Confirm disable'
            }
        })
}

// ─── Passkeys Section (#04.4) ─────────────────────────────────

async function renderPasskeySection(el: HTMLElement): Promise<void> {
    el.innerHTML = `<div class="skeleton-block"></div>`
    try {
        const res = await tx.security.listWebAuthnCredentials()
        paintPasskeySection(el, res.credentials as WebAuthnCredential[])
    } catch {
        el.innerHTML = `<p class="error-msg">Failed to load passkeys.</p>`
    }
}

function paintPasskeySection(el: HTMLElement, credentials: WebAuthnCredential[]): void {
    const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential

    el.innerHTML = `
        <div class="settings-section">
            <div class="settings-section-header">
                <div>
                    <h3>Passkeys (WebAuthn)</h3>
                    <p class="text-muted">Sign in with biometrics or a hardware security key (FIDO2)</p>
                </div>
                ${!supported ? `<span class="badge badge--warning">Unsupported</span>` : ''}
            </div>
            ${!supported
                ? `<p class="text-muted">Your browser does not support WebAuthn passkeys.</p>`
                : `
                    <ul class="passkey-list">
                        ${credentials.length === 0
                            ? `<li class="passkey-list-empty">No passkeys registered yet.</li>`
                            : credentials.map(c => `
                                <li class="passkey-item">
                                    <span class="passkey-icon">🔑</span>
                                    <div class="passkey-info">
                                        <strong>${c.device_name || 'Unnamed device'}</strong>
                                        <small class="text-muted">Added ${new Date(c.created_at).toLocaleDateString()}</small>
                                    </div>
                                    <button class="btn btn-danger btn--sm passkey-remove-btn"
                                            data-id="${c.id}">Remove</button>
                                </li>
                            `).join('')
                        }
                    </ul>
                    <div id="passkey-error" class="error-msg"></div>
                    <button class="btn" id="add-passkey-btn">Add a passkey</button>
                `
            }
        </div>
    `

    if (!supported) return

    el.querySelectorAll<HTMLButtonElement>('.passkey-remove-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Remove this passkey?')) return
            const credId = parseInt(btn.dataset.id!, 10)
            btn.disabled = true
            try {
                await tx.security.deleteWebAuthnCredential(credId)
                logEvent('auth:passkey_removed', { credentialId: credId }, 'info')
                toast.info('Passkey removed')
                await renderPasskeySection(el)
            } catch (e: unknown) {
                const err = e as TenxyteError
                toast.error(err.error ?? 'Failed to remove passkey')
                btn.disabled = false
            }
        })
    })

    el.querySelector<HTMLButtonElement>('#add-passkey-btn')!
        .addEventListener('click', async () => {
            const btn   = el.querySelector<HTMLButtonElement>('#add-passkey-btn')!
            const errEl = el.querySelector<HTMLDivElement>('#passkey-error')!
            btn.disabled = true; btn.textContent = 'Registering…'
            errEl.textContent = ''
            try {
                await tx.security.registerWebAuthn()
                logEvent('auth:passkey_registered', undefined, 'success')
                toast.success('Passkey registered')
                await renderPasskeySection(el)
            } catch (e: unknown) {
                const err = e as TenxyteError
                errEl.textContent = err.error ?? 'Registration failed or was cancelled'
                btn.disabled = false; btn.textContent = 'Add a passkey'
            }
        })
}

// ─── Password Change Section (#08.4) ──────────────────────────

function renderPasswordSection(el: HTMLElement): void {
    el.innerHTML = `
        <div class="settings-section">
            <div class="settings-section-header">
                <div>
                    <h3>Change Password</h3>
                    <p class="text-muted">Update your password — strength is checked in real time.</p>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label" for="pwd-current">Current password</label>
                <input class="input" id="pwd-current" type="password" autocomplete="current-password" />
            </div>
            <div class="form-group">
                <label class="form-label" for="pwd-new">New password</label>
                <input class="input" id="pwd-new" type="password" autocomplete="new-password" />
                <div id="pwd-strength" class="strength-hint"></div>
            </div>
            <div class="form-group">
                <label class="form-label" for="pwd-confirm">Confirm new password</label>
                <input class="input" id="pwd-confirm" type="password" autocomplete="new-password" />
            </div>
            <div id="pwd-error" class="error-msg"></div>
            <button class="btn" id="pwd-save-btn">Change Password</button>
        </div>
    `
    const newPwdInput = el.querySelector<HTMLInputElement>('#pwd-new')!
    const strengthEl  = el.querySelector<HTMLDivElement>('#pwd-strength')!
    const errorEl     = el.querySelector<HTMLDivElement>('#pwd-error')!
    const saveBtn     = el.querySelector<HTMLButtonElement>('#pwd-save-btn')!

    newPwdInput.addEventListener('input', () => {
        const val = newPwdInput.value
        if (pwdDebounce) clearTimeout(pwdDebounce)
        if (!val) { strengthEl.innerHTML = ''; return }
        pwdDebounce = setTimeout(async () => {
            try {
                const res = await tx.security.checkPasswordStrength(val)
                const labels   = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
                const variants = ['error', 'error', 'warning', 'success', 'success']
                const s = Math.min(res.score, 4)
                strengthEl.innerHTML = `<span class="badge badge--${variants[s]}">${labels[s]}</span>`
                if (!res.is_valid) {
                    strengthEl.innerHTML += ` <span class="text-muted">— doesn't meet requirements</span>`
                }
            } catch { strengthEl.innerHTML = '' }
        }, 500)
    })

    saveBtn.addEventListener('click', async () => {
        const current = el.querySelector<HTMLInputElement>('#pwd-current')!.value
        const newPwd  = newPwdInput.value
        const confirm = el.querySelector<HTMLInputElement>('#pwd-confirm')!.value
        errorEl.textContent = ''
        if (!current) { errorEl.textContent = 'Current password is required.'; return }
        if (newPwd.length < 8) { errorEl.textContent = 'New password must be at least 8 characters.'; return }
        if (newPwd !== confirm) { errorEl.textContent = 'Passwords do not match.'; return }
        saveBtn.disabled = true; saveBtn.textContent = 'Saving…'
        try {
            await tx.security.changePassword(current, newPwd)
            logEvent('auth:password_changed', undefined, 'success')
            toast.success('Password changed')
            el.querySelector<HTMLInputElement>('#pwd-current')!.value = ''
            newPwdInput.value = ''; strengthEl.innerHTML = ''
            el.querySelector<HTMLInputElement>('#pwd-confirm')!.value = ''
        } catch (e: unknown) {
            const err = e as TenxyteError
            const code = String((err as unknown as Record<string, unknown>).code ?? '')
            if (code === 'INVALID_CURRENT_PASSWORD' || err.error?.toLowerCase().includes('current')) {
                errorEl.textContent = 'Current password is incorrect.'
            } else if (code === 'PASSWORD_BREACHED') {
                errorEl.textContent = '⚠️ This password was found in a data breach. Choose another.'
            } else {
                errorEl.textContent = err.error ?? 'Failed to change password'
            }
        } finally {
            saveBtn.disabled = false; saveBtn.textContent = 'Change Password'
        }
    })
}

// ─── Active Sessions Section (#08.3) ──────────────────────────

async function renderSessionsSection(el: HTMLElement): Promise<void> {
    el.innerHTML = `<div class="skeleton-block"></div>`
    try {
        const res = await tx.admin.listRefreshTokens()
        paintSessionsSection(el, res.results as SessionInfo[])
    } catch {
        paintSessionsSection(el, null)
    }
}

function paintSessionsSection(el: HTMLElement, sessions: SessionInfo[] | null): void {
    const active = sessions ? sessions.filter(s => !s.is_revoked) : []
    el.innerHTML = `
        <div class="settings-section">
            <div class="settings-section-header">
                <div>
                    <h3>Active Sessions</h3>
                    <p class="text-muted">Devices currently signed in to your account.</p>
                </div>
                <button class="btn btn-danger btn--sm" id="sessions-logout-all-btn">Disconnect all</button>
            </div>
            ${sessions === null
                ? `<p class="text-muted" style="margin-top:8px">Session listing requires admin access. You can still disconnect all sessions below.</p>`
                : `<ul class="session-list">
                    ${active.length === 0
                        ? `<li class="session-empty">No active sessions found.</li>`
                        : active.map(s => sessionRow(s)).join('')
                    }
                </ul>`
            }
        </div>
    `
    el.querySelector('#sessions-logout-all-btn')!.addEventListener('click', async () => {
        if (!confirm('Disconnect all sessions? You will be logged out.')) return
        try {
            await tx.auth.logoutAll()
            logEvent('auth:logout_all', undefined, 'info')
            toast.info('All sessions disconnected')
            navigate('/login')
        } catch (e: unknown) {
            const err = e as TenxyteError
            toast.error(err.error ?? 'Failed to disconnect sessions')
        }
    })
    el.querySelectorAll<HTMLButtonElement>('.session-revoke-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const tokenId = btn.dataset.id!
            btn.disabled = true
            try {
                await tx.admin.revokeRefreshToken(tokenId)
                logEvent('auth:session_revoked', { tokenId }, 'info')
                toast.info('Session disconnected')
                await renderSessionsSection(el)
            } catch (e: unknown) {
                const err = e as TenxyteError
                toast.error(err.error ?? 'Failed to disconnect')
                btn.disabled = false
            }
        })
    })
}

function sessionRow(s: SessionInfo): string {
    const device = s.device_info ? s.device_info.slice(0, 64) : 'Unknown device'
    const ip     = s.ip_address ?? '—'
    const last   = s.last_used_at ? new Date(s.last_used_at).toLocaleString() : '—'
    return `
        <li class="session-item">
            <div class="session-device-info">
                <strong>${esc(device)}</strong>
                <small class="text-muted">IP: ${esc(ip)} · Last active: ${last}</small>
            </div>
            <button class="btn btn-danger btn--sm session-revoke-btn" data-id="${s.id}">Disconnect</button>
        </li>
    `
}

// ─── GDPR Data Export Section (#08.1) ─────────────────────────

function renderDataSection(el: HTMLElement): void {
    const disabled = isExportDisabled()
    el.innerHTML = `
        <div class="settings-section">
            <div class="settings-section-header">
                <div>
                    <h3>My Data</h3>
                    <p class="text-muted">Download all your personal data (GDPR Art. 20 — right to data portability).</p>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label" for="export-pwd">Confirm with your password</label>
                <input class="input" id="export-pwd" type="password" autocomplete="current-password" ${disabled ? 'disabled' : ''} />
            </div>
            <div id="export-msg" class="text-muted" style="margin-bottom:8px">
                ${disabled ? 'An export was already requested. You can request a new one after 24 hours.' : ''}
            </div>
            <button class="btn" id="export-btn" ${disabled ? 'disabled' : ''}>Export my data</button>
        </div>
    `
    el.querySelector<HTMLButtonElement>('#export-btn')!.addEventListener('click', async () => {
        const pwd   = el.querySelector<HTMLInputElement>('#export-pwd')!.value
        const btn   = el.querySelector<HTMLButtonElement>('#export-btn')!
        const msgEl = el.querySelector<HTMLDivElement>('#export-msg')!
        if (!pwd) { toast.error('Enter your password to export data.'); return }
        btn.disabled = true; btn.textContent = 'Exporting…'
        try {
            const data = await tx.gdpr.exportUserData(pwd)
            logEvent('gdpr:data_exported', undefined, 'info')
            localStorage.setItem(EXPORT_LS_KEY, String(Date.now()))
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url  = URL.createObjectURL(blob)
            const a    = Object.assign(document.createElement('a'), { href: url, download: 'my-data.json' })
            document.body.appendChild(a); a.click(); document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast.success('Data exported successfully')
            msgEl.textContent = 'Export downloaded. You can request a new one after 24 hours.'
            el.querySelector<HTMLInputElement>('#export-pwd')!.value = ''
            btn.textContent = 'Export my data'
        } catch (e: unknown) {
            const err = e as TenxyteError
            toast.error(err.error ?? 'Export failed')
            btn.disabled = false; btn.textContent = 'Export my data'
        }
    })
}

function isExportDisabled(): boolean {
    const ts = localStorage.getItem(EXPORT_LS_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < 24 * 60 * 60 * 1000
}

// ─── GDPR Account Deletion Section (#08.2) ────────────────────

function renderDangerSection(el: HTMLElement): void {
    el.innerHTML = `
        <div class="settings-section settings-danger">
            <div class="settings-section-header">
                <div>
                    <h3>Danger Zone</h3>
                    <p class="text-muted">Irreversible actions — proceed with caution.</p>
                </div>
            </div>
            <div class="danger-block">
                <div>
                    <strong>Delete my account</strong>
                    <p class="text-muted" style="margin:2px 0 0">Permanently delete your account and all associated data.</p>
                </div>
                <button class="btn btn-danger" id="delete-account-btn">Delete account</button>
            </div>
        </div>
    `
    el.querySelector('#delete-account-btn')!.addEventListener('click', () => showDeleteStep1())
}

function showDeleteStep1(): void {
    const overlay = document.createElement('div')
    overlay.id = 'delete-modal-overlay'
    overlay.className = 'approval-modal-overlay'
    overlay.innerHTML = `
        <div class="approval-modal">
            <div class="approval-modal-header">
                <h3>Delete your account</h3>
            </div>
            <div class="approval-modal-body">
                <p>You are about to permanently delete your account. This action:</p>
                <ul style="margin:8px 0 0 18px;line-height:1.8">
                    <li>Cannot be undone</li>
                    <li>Will erase all your personal data</li>
                    <li>Will revoke all active sessions and API keys</li>
                    <li>Will remove you from all organizations</li>
                </ul>
                <p style="margin-top:12px;color:var(--color-text-muted)">A 30-day grace period applies — you may cancel during this time.</p>
            </div>
            <div class="approval-modal-footer">
                <button class="btn btn-danger" id="delete-step1-next">I understand, continue</button>
                <button class="btn btn-ghost" id="delete-step1-cancel">Cancel</button>
            </div>
        </div>
    `
    document.body.appendChild(overlay)
    overlay.querySelector('#delete-step1-cancel')!.addEventListener('click', () => overlay.remove())
    overlay.querySelector('#delete-step1-next')!.addEventListener('click', () => { overlay.remove(); showDeleteStep2() })
}

function showDeleteStep2(): void {
    const overlay = document.createElement('div')
    overlay.id = 'delete-modal-overlay'
    overlay.className = 'approval-modal-overlay'
    overlay.innerHTML = `
        <div class="approval-modal">
            <div class="approval-modal-header">
                <h3>Final confirmation</h3>
            </div>
            <div class="approval-modal-body">
                <div class="form-group">
                    <label class="form-label" for="del-confirm-text">Type <strong>DELETE</strong> to unlock</label>
                    <input class="input" id="del-confirm-text" type="text" placeholder="DELETE" autocomplete="off" />
                </div>
                <div class="form-group">
                    <label class="form-label" for="del-confirm-pwd">Current password</label>
                    <input class="input" id="del-confirm-pwd" type="password" autocomplete="current-password" />
                </div>
                <div id="del-error" class="error-msg"></div>
            </div>
            <div class="approval-modal-footer">
                <button class="btn btn-danger" id="delete-step2-confirm" disabled>Delete my account</button>
                <button class="btn btn-ghost" id="delete-step2-cancel">Cancel</button>
            </div>
        </div>
    `
    document.body.appendChild(overlay)
    const confirmInput = overlay.querySelector<HTMLInputElement>('#del-confirm-text')!
    const confirmBtn   = overlay.querySelector<HTMLButtonElement>('#delete-step2-confirm')!
    const errorEl      = overlay.querySelector<HTMLDivElement>('#del-error')!
    confirmInput.addEventListener('input', () => {
        confirmBtn.disabled = confirmInput.value.trim() !== 'DELETE'
    })
    overlay.querySelector('#delete-step2-cancel')!.addEventListener('click', () => overlay.remove())
    confirmBtn.addEventListener('click', async () => {
        const pwd = overlay.querySelector<HTMLInputElement>('#del-confirm-pwd')!.value
        if (!pwd) { errorEl.textContent = 'Password is required.'; return }
        confirmBtn.disabled = true; confirmBtn.textContent = 'Deleting…'
        errorEl.textContent = ''
        try {
            await tx.gdpr.requestAccountDeletion({ password: pwd, reason: 'User initiated deletion' })
            logEvent('gdpr:account_deletion_requested', undefined, 'info')
            overlay.remove()
            toast.info('Deletion scheduled — check your email to confirm. You have 30 days to cancel.')
            await tx.auth.logoutAll()
            navigate('/login')
        } catch (e: unknown) {
            const err = e as TenxyteError
            errorEl.textContent = err.error ?? 'Deletion request failed'
            confirmBtn.disabled = false; confirmBtn.textContent = 'Delete my account'
        }
    })
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
