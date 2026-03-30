export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="page-stub">
            <div class="card">
                <h2>Dashboard</h2>
                <p class="text-muted">Authentication metrics and activity overview — issue #07.2</p>
            </div>
        </div>
    `
}

export function unmount(): void {}
