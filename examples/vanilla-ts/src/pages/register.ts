export function mount(container: HTMLElement): void {
    container.innerHTML = `
        <div class="auth-page">
            <div class="card">
                <h2>Create your account</h2>
                <p class="text-muted">Full registration form with breach check — issue #02.2</p>
                <p class="auth-link">Already have an account? <a href="#/login">Sign in</a></p>
            </div>
        </div>
    `
}

export function unmount(): void {}
