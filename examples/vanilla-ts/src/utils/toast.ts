type ToastType = 'success' | 'error' | 'info'

interface ToastItem { message: string; type: ToastType }

const DURATION_MS = 4000
const MAX_VISIBLE = 3
const queue: ToastItem[] = []
let activeCount = 0

function getContainer(): HTMLElement {
    let container = document.querySelector<HTMLElement>('#toast-container')
    if (!container) {
        container = document.createElement('div')
        container.id = 'toast-container'
        document.body.appendChild(container)
    }
    return container
}

function processQueue(): void {
    while (activeCount < MAX_VISIBLE && queue.length > 0) {
        renderToast(queue.shift()!)
    }
}

function renderToast(item: ToastItem): void {
    activeCount++
    const container = getContainer()

    const el = document.createElement('div')
    el.className = `toast toast--${item.type}`
    el.textContent = item.message
    container.appendChild(el)

    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('toast--visible'))
    })

    setTimeout(() => {
        el.classList.remove('toast--visible')
        el.addEventListener('transitionend', () => {
            el.remove()
            activeCount--
            processQueue()
        }, { once: true })
    }, DURATION_MS)
}

export const toast = {
    success: (message: string): void => { queue.push({ message, type: 'success' }); processQueue() },
    error:   (message: string): void => { queue.push({ message, type: 'error'   }); processQueue() },
    info:    (message: string): void => { queue.push({ message, type: 'info'    }); processQueue() },
}
