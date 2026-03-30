export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="page-stub">
            <div class="card">
                <h2>Admin</h2>
                <p class="text-muted">Stats dashboard, audit logs, RBAC role management — issues #05.3, #07.2 & #07.3</p>
            </div>
        </div>
    `
}

export function unmount(): void {}
