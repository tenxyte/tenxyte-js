import type { TenxyteError } from '@tenxyte/core'
import { tx } from '../client'
import { toast } from '../utils/toast'
import { logEvent } from '../utils/logger'

interface TwoFAStatus { is_enabled: boolean; backup_codes_remaining: number }
interface WebAuthnCredential { id: number; device_name: string; created_at: string; last_used_at?: string }

export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="page-settings">
            <h2>Settings</h2>
            <section id="settings-2fa" class="settings-block"></section>
            <hr class="settings-divider" />
            <section id="settings-passkeys" class="settings-block"></section>
        </div>
    `
    void render2FASection(container.querySelector<HTMLElement>('#settings-2fa')!)
    void renderPasskeySection(container.querySelector<HTMLElement>('#settings-passkeys')!)
}

export function unmount(): void {}

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
