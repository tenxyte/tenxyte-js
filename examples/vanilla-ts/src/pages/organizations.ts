export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="page-stub">
            <div class="card">
                <h2>Organizations</h2>
                <p class="text-muted">Organization list, member management, invitations — issues #05.1 & #05.2</p>
            </div>
        </div>
    `
}

export function unmount(): void {}
