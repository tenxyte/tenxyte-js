export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="page-stub">
            <div class="card">
                <h2>Settings</h2>
                <p class="text-muted">2FA, passkeys, sessions, password change, GDPR — issues #04.1–#04.4, #08.x</p>
            </div>
        </div>
    `
}

export function unmount(): void {}
