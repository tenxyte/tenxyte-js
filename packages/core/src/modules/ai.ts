import { TenxyteHttpClient } from '../http/client';
import { AgentTokenSummary, AgentPendingAction } from '../types';
import type { TenxyteLogger } from '../config';

export class AiModule {
    private agentToken: string | null = null;
    private traceId: string | null = null;
    private logger?: TenxyteLogger;

    constructor(private client: TenxyteHttpClient, logger?: TenxyteLogger) {
        this.logger = logger;
        // Register an interceptor to auto-inject AgentBearer and Trace ID
        this.client.addRequestInterceptor((config) => {
            const headers: Record<string, string> = { ...config.headers };

            if (this.agentToken) {
                // Determine if we should replace the standard Authorization
                // By Tenxyte specification, AgentToken uses "AgentBearer"
                headers['Authorization'] = `AgentBearer ${this.agentToken}`;
            }

            if (this.traceId) {
                headers['X-Prompt-Trace-ID'] = this.traceId;
            }

            return { ...config, headers };
        });

        // Intercept 202 Accepted and specific 403 errors (Circuit Breaker)
        // Usually, these should be emitted via the main TenxyteClient EventEmitter.
        // For now, we add a response interceptor to handle the HTTP side.
        this.client.addResponseInterceptor(async (response, request) => {
            // Note: Since response streams can only be read once, full integration
            // with EventEmitter for deep inspection (like 202s body) requires cloning.
            if (response.status === 202) {
                // HTTP 202 Accepted indicates HITL awaiting confirmation
                const cloned = response.clone();
                try {
                    const data = await cloned.json();
                    // Assuming TenxyteClient will fire 'agent:awaiting_approval' based on this later
                    this.logger?.debug('[Tenxyte AI] Received 202 Awaiting Approval:', data);
                } catch {
                    // Ignore parsing errors
                }
            } else if (response.status === 403) {
                const cloned = response.clone();
                try {
                    const data = await cloned.json();
                    if (data.code === 'BUDGET_EXCEEDED') {
                        this.logger?.warn('[Tenxyte AI] Network responded with Budget Exceeded for Agent.');
                    } else if (data.status === 'suspended') {
                        this.logger?.warn('[Tenxyte AI] Circuit breaker open for Agent.');
                    }
                } catch {
                    // Ignore parsing errors
                }
            }
            return response;
        });
    }

    // ─── AgentToken Lifecycle ───

    /**
     * Create an AgentToken granting specific deterministic limits to an AI Agent.
     */
    async createAgentToken(data: {
        agent_id: string;
        permissions?: string[];
        expires_in?: number;
        organization?: string;
        budget_limit_usd?: number;
        circuit_breaker?: {
            max_requests?: number;
            window_seconds?: number;
        };
        dead_mans_switch?: {
            heartbeat_required_every?: number;
        };
    }): Promise<{
        id: number;
        token: string;
        agent_id: string;
        status: string;
        expires_at: string;
    }> {
        return this.client.post('/api/v1/auth/ai/tokens/', data);
    }

    /**
     * Set the SDK to operate on behalf of an Agent using the generated Agent Token payload.
     * Overrides standard `Authorization` headers with `AgentBearer`.
     */
    setAgentToken(token: string): void {
        this.agentToken = token;
    }

    /** Disables the active Agent override and reverts to standard User session requests. */
    clearAgentToken(): void {
        this.agentToken = null;
    }

    /** Check if the SDK is currently mocking requests as an AI Agent. */
    isAgentMode(): boolean {
        return this.agentToken !== null;
    }

    /** List previously provisioned active Agent tokens. */
    async listAgentTokens(): Promise<AgentTokenSummary[]> {
        return this.client.get('/api/v1/auth/ai/tokens/');
    }

    /** Fetch the status and configuration of a specific AgentToken. */
    async getAgentToken(tokenId: number): Promise<AgentTokenSummary> {
        return this.client.get(`/api/v1/auth/ai/tokens/${tokenId}/`);
    }

    /** Irreversibly revoke a targeted AgentToken from acting upon the Tenant. */
    async revokeAgentToken(tokenId: number): Promise<{ status: 'revoked' }> {
        return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/revoke/`);
    }

    /** Temporarily freeze an AgentToken by forcibly closing its Circuit Breaker. */
    async suspendAgentToken(tokenId: number): Promise<{ status: 'suspended' }> {
        return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/suspend/`);
    }

    /** Emergency kill-switch to wipe all operational Agent Tokens. */
    async revokeAllAgentTokens(): Promise<{ status: 'revoked'; count: number }> {
        return this.client.post('/api/v1/auth/ai/tokens/revoke-all/');
    }

    // ─── Circuit Breaker ───

    /** Satisfy an Agent's Dead-Man's switch heartbeat requirement to prevent suspension. */
    async sendHeartbeat(tokenId: number): Promise<{ status: 'ok' }> {
        return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/heartbeat/`);
    }

    // ─── Human in the Loop (HITL) ───

    /** List intercepted HTTP 202 actions waiting for Human interaction / approval. */
    async listPendingActions(): Promise<AgentPendingAction[]> {
        return this.client.get('/api/v1/auth/ai/pending-actions/');
    }

    /** Complete a pending HITL authorization to finally flush the Agent action to backend systems. */
    async confirmPendingAction(confirmationToken: string): Promise<{ status: 'confirmed' }> {
        return this.client.post('/api/v1/auth/ai/pending-actions/confirm/', { token: confirmationToken });
    }

    /** Block an Agent action permanently. */
    async denyPendingAction(confirmationToken: string): Promise<{ status: 'denied' }> {
        return this.client.post('/api/v1/auth/ai/pending-actions/deny/', { token: confirmationToken });
    }

    // ─── Traceability and Budget ───

    /** Start piping the `X-Prompt-Trace-ID` custom header outwards for tracing logs against LLM inputs. */
    setTraceId(traceId: string): void {
        this.traceId = traceId;
    }

    /** Disable trace forwarding context. */
    clearTraceId(): void {
        this.traceId = null;
    }

    /** 
     * Report consumption costs associated with a backend invocation back to Tenxyte for strict circuit budgeting.
     * @param tokenId - AgentToken evaluating ID.
     * @param usage - Sunk token costs or explicit USD derivations.
     */
    async reportUsage(tokenId: number, usage: {
        cost_usd: number;
        prompt_tokens: number;
        completion_tokens: number;
    }): Promise<{ status: 'ok' } | { error: 'Budget exceeded'; status: 'suspended' }> {
        return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/report-usage/`, usage);
    }
}
