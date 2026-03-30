export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="page-stub">
            <div class="card">
                <h2>AI Assistant</h2>
                <p class="text-muted">AIRS chat interface with Human-in-the-Loop approval — issues #06.1–#06.4</p>
            </div>
        </div>
    `
}

export function unmount(): void {}
