export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="page-stub">
            <div class="card">
                <h2>Applications</h2>
                <p class="text-muted">OAuth2 applications and API key management — issue #07.4</p>
            </div>
        </div>
    `
}

export function unmount(): void {}
