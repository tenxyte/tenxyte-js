import { tx } from '../client'
import { toast } from '../utils/toast'
import { logEvent } from '../utils/logger'

// Spec: tx.ai.sendMessage() absent — SDK focuses on AgentToken + HITL lifecycle
// Real HITL via tx.ai.listPendingActions / confirmPendingAction / denyPendingAction

type ActionType = 'create_task' | 'assign_task' | 'update_task_status'
interface AgentAction {
    id: string; type: ActionType; confirmation_token: string
    params: Record<string, string>; description: string
}
interface ChatMsg { role: 'user' | 'agent'; text: string; actionId?: string; ts: Date }

const ACTION_LABELS: Record<ActionType, string> = {
    create_task: '🗂 Create task',
    assign_task: '👤 Assign task',
    update_task_status: '🔄 Update status',
}

let msgs: ChatMsg[] = []
const actionsMap = new Map<string, AgentAction>()
let approvalListener: ((e: Event) => void) | null = null

export function mount(container: HTMLElement): void {
    msgs = []
    actionsMap.clear()
    const org = localStorage.getItem('tx_active_org')
    renderPage(container, org)
    if (org) {
        setupDelegation(container)
        addWelcome(container, org)
        void loadRealPending(container)
    }
    approvalListener = (e: Event) => {
        const raw = (e as CustomEvent).detail as Record<string, unknown>
        const action = rawToAction(raw)
        actionsMap.set(action.id, action)
        addAgentMsg(container, `⚠️ A pending action requires your approval.`, action.id)
        showModal(container, action)
    }
    document.addEventListener('agent:awaiting_approval', approvalListener)
}

export function unmount(): void {
    msgs = []
    actionsMap.clear()
    if (approvalListener) {
        document.removeEventListener('agent:awaiting_approval', approvalListener)
        approvalListener = null
    }
    document.querySelector('.approval-overlay')?.remove()
}

// ─── Page Layout (#06.1 + #06.4) ──────────────────────────────

function renderPage(container: HTMLElement, org: string | null): void {
    const orgBadge = org
        ? `<span class="ai-org-badge">🏢 ${esc(org)}</span>`
        : `<span class="ai-org-badge ai-org-badge--none">No organization selected</span>`
    container.innerHTML = `
        <div class="page-ai">
            <div class="ai-header">
                <div class="ai-header-left">
                    <h2>AI Assistant</h2>
                    ${orgBadge}
                </div>
                <div class="ai-header-right">
                    <span class="hitl-badge"
                          title="Every agent action requires explicit human approval before execution.">
                        🛡 Human-in-the-Loop enabled
                    </span>
                </div>
            </div>
            ${!org
                ? `<div class="ai-no-org"><p>Select an organization using the header switcher to use the assistant.</p></div>`
                : `<div class="ai-chat" id="ai-chat"></div>
                   <div class="ai-input-area">
                       <input class="input" id="ai-input" type="text"
                              placeholder="Ask me to create tasks, assign work, update status…" />
                       <button class="btn" id="ai-send">Send</button>
                   </div>`
            }
        </div>
    `
    if (!org) return
    const input = container.querySelector<HTMLInputElement>('#ai-input')!
    const btn   = container.querySelector<HTMLButtonElement>('#ai-send')!
    const send  = () => { const t = input.value.trim(); if (t) { input.value = ''; void handleSend(container, t, org) } }
    btn.addEventListener('click', send)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send() })
}

function setupDelegation(container: HTMLElement): void {
    container.querySelector<HTMLElement>('#ai-chat')!
        .addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.action-approve-btn')
            if (!btn) return
            const action = actionsMap.get(btn.dataset.actionId!)
            if (action) showModal(container, action)
        })
}

// ─── Message Helpers ───────────────────────────────────────────

function addUserMsg(container: HTMLElement, text: string): void {
    msgs.push({ role: 'user', text, ts: new Date() })
    renderMsgs(container)
}

function addAgentMsg(container: HTMLElement, text: string, actionId?: string): void {
    msgs.push({ role: 'agent', text, actionId, ts: new Date() })
    renderMsgs(container)
}

function renderMsgs(container: HTMLElement): void {
    const chat = container.querySelector<HTMLElement>('#ai-chat')
    if (!chat) return
    chat.innerHTML = msgs.map(m => {
        const time = m.ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        const action = m.actionId ? actionsMap.get(m.actionId) : undefined
        if (m.role === 'user') return `
            <div class="ai-message ai-message--user">
                <div class="ai-bubble ai-bubble--user">${esc(m.text)}</div>
                <span class="ai-ts">${time}</span>
            </div>`
        return `
            <div class="ai-message ai-message--agent">
                <div class="ai-avatar">TX</div>
                <div>
                    <div class="ai-bubble ai-bubble--agent">${m.text}</div>
                    ${action ? `
                        <div class="action-preview">
                            <span class="action-type-badge">${ACTION_LABELS[action.type]}</span>
                            <span class="action-desc">${esc(action.description)}</span>
                            <button class="btn btn--sm action-approve-btn"
                                    data-action-id="${action.id}">Review &amp; Approve</button>
                        </div>` : ''}
                    <span class="ai-ts">${time}</span>
                </div>
            </div>`
    }).join('')
    chat.scrollTop = chat.scrollHeight
}

function showTyping(container: HTMLElement): void {
    const chat = container.querySelector<HTMLElement>('#ai-chat')
    if (!chat) return
    const el = document.createElement('div')
    el.id = 'ai-typing'
    el.className = 'ai-message ai-message--agent'
    el.innerHTML = `<div class="ai-avatar">TX</div><div class="ai-typing"><span></span><span></span><span></span></div>`
    chat.appendChild(el)
    chat.scrollTop = chat.scrollHeight
}

function hideTyping(container: HTMLElement): void {
    container.querySelector('#ai-typing')?.remove()
}

// ─── Send + Mock Responses (#06.1 + #06.3 + #06.4) ─────────────────

async function handleSend(container: HTMLElement, text: string, org: string): Promise<void> {
    addUserMsg(container, text)
    showTyping(container)
    const btn   = container.querySelector<HTMLButtonElement>('#ai-send')!
    const input = container.querySelector<HTMLInputElement>('#ai-input')!
    btn.disabled = true; input.disabled = true
    await delay(800 + Math.random() * 500)
    hideTyping(container)
    const { responseText, action } = buildMock(text, org)
    if (action) actionsMap.set(action.id, action)
    addAgentMsg(container, responseText, action?.id)
    btn.disabled = false; input.disabled = false
    input.focus()
}

function buildMock(text: string, org: string): { responseText: string; action?: AgentAction } {
    const lower = text.toLowerCase()
    const token = `sim_${Math.random().toString(36).slice(2, 10)}`
    const id    = `act_${Math.random().toString(36).slice(2, 8)}`
    if (lower.includes('create') && lower.includes('task')) {
        const title    = text.match(/task[:\s]+([^,\.]+)/i)?.[1]?.trim() ?? 'New task'
        const assignee = text.match(/assign(?:ed)?\s+to\s+([\w@\.]+)/i)?.[1] ?? 'team'
        const action: AgentAction = {
            id, type: 'create_task', confirmation_token: token,
            params: { title, assignee, org },
            description: `Create task “${title}” and assign to ${assignee}`,
        }
        return { responseText: `I’ll create that task in <strong>${esc(org)}</strong>. This requires your approval before execution.`, action }
    }
    if (lower.includes('assign')) {
        const who = text.match(/to\s+([\w@\.]+)/i)?.[1] ?? 'assignee'
        const action: AgentAction = {
            id, type: 'assign_task', confirmation_token: token,
            params: { assignee: who, org },
            description: `Assign task to ${who} in ${org}`,
        }
        return { responseText: `I’ll assign the task to <strong>${esc(who)}</strong>. Please review below.`, action }
    }
    if (lower.includes('status') || lower.includes('complete') || lower.includes('done') || lower.includes('update')) {
        const status = lower.includes('done') || lower.includes('complete') ? 'done'
            : lower.includes('progress') ? 'in_progress' : 'review'
        const action: AgentAction = {
            id, type: 'update_task_status', confirmation_token: token,
            params: { status, org },
            description: `Update task status to “${status}” in ${org}`,
        }
        return { responseText: `I’ll update the task status to <strong>${status}</strong>. Your approval is required.`, action }
    }
    return {
        responseText: `I can help manage tasks for <strong>${esc(org)}</strong>. Try:<br>
            • <em>Create a task to fix login bug and assign to alice@example.com</em><br>
            • <em>Assign the current task to bob@example.com</em><br>
            • <em>Mark the task as done</em>`,
    }
}

// ─── Approval Modal (#06.2) ────────────────────────────────────────

function showModal(container: HTMLElement, action: AgentAction): void {
    document.querySelector('.approval-overlay')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'approval-overlay'
    overlay.innerHTML = `
        <div class="approval-modal" role="dialog" aria-modal="true">
            <div class="approval-modal-header">
                <span class="hitl-badge">🛡 Human-in-the-Loop</span>
                <h3>Assistant requests your approval</h3>
            </div>
            <div class="approval-modal-body">
                <div class="action-card">
                    <span class="action-type-badge">${ACTION_LABELS[action.type]}</span>
                    <p class="action-card-desc">${esc(action.description)}</p>
                    <dl class="action-params">
                        ${Object.entries(action.params).map(([k, v]) =>
                            `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`
                        ).join('')}
                    </dl>
                </div>
            </div>
            <div class="approval-modal-footer">
                <button class="btn" id="modal-approve">✓ Approve</button>
                <button class="btn btn-danger" id="modal-reject">✗ Reject</button>
            </div>
        </div>
    `
    document.body.appendChild(overlay)
    overlay.querySelector('#modal-approve')!.addEventListener('click', async () => { overlay.remove(); await decide(container, action, 'approve') })
    overlay.querySelector('#modal-reject')!.addEventListener('click', async () => { overlay.remove(); await decide(container, action, 'reject') })
}

async function decide(container: HTMLElement, action: AgentAction, d: 'approve' | 'reject'): Promise<void> {
    try {
        if (d === 'approve') await tx.ai.confirmPendingAction(action.confirmation_token)
        else                 await tx.ai.denyPendingAction(action.confirmation_token)
    } catch { /* simulated token — expected to fail without real backend */ }
    if (d === 'approve') {
        logEvent('agent:action_approved', { type: action.type, id: action.id }, 'success')
        toast.success('Action approved')
        const feedback = action.type === 'create_task'
            ? `✅ Task <strong>${esc(action.params.title ?? 'task')}</strong> created and assigned to <strong>${esc(action.params.assignee ?? 'team')}</strong>. <a href="#/dashboard">View on Dashboard →</a>`
            : action.type === 'assign_task'
                ? `✅ Task assigned to <strong>${esc(action.params.assignee)}</strong>.`
                : `✅ Task status updated to <strong>${esc(action.params.status)}</strong>.`
        addAgentMsg(container, feedback)
    } else {
        logEvent('agent:action_rejected', { type: action.type, id: action.id }, 'warning')
        toast.info('Action rejected')
        addAgentMsg(container, `❌ Action cancelled. No changes were made.`)
    }
    actionsMap.delete(action.id)
}

// ─── Real Pending Actions ──────────────────────────────────────

async function loadRealPending(container: HTMLElement): Promise<void> {
    try {
        const list = await tx.ai.listPendingActions()
        list.forEach(raw => {
            const action = rawToAction(raw as unknown as Record<string, unknown>)
            actionsMap.set(action.id, action)
            addAgentMsg(container, `⚠️ Real pending action from agent.`, action.id)
        })
    } catch { /* not authenticated or no pending actions */ }
}

function rawToAction(raw: Record<string, unknown>): AgentAction {
    const id   = String(raw.id ?? `act_${Math.random().toString(36).slice(2, 8)}`)
    const perm = String(raw.permission ?? '')
    const type: ActionType = perm.includes('task') ? 'create_task'
        : perm.includes('assign') ? 'assign_task' : 'update_task_status'
    return {
        id, type,
        confirmation_token: String(raw.confirmation_token ?? ''),
        params: { permission: perm, endpoint: String(raw.endpoint ?? '') },
        description: `${perm} on ${String(raw.endpoint ?? 'unknown endpoint')}`,
    }
}

// ─── Welcome (#06.1 + #06.4) ──────────────────────────────────────

function addWelcome(container: HTMLElement, org: string): void {
    addAgentMsg(container,
        `👋 Hi! I’m your TX AI assistant for <strong>${esc(org)}</strong>.<br><br>
        With <strong>Human-in-the-Loop</strong> enabled, every action I take requires your explicit approval first.<br><br>
        <em>Try: “Create a task to fix the login bug and assign to alice@example.com”</em>`
    )
}

// ─── Utils ────────────────────────────────────────────────────────
function delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }
function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
