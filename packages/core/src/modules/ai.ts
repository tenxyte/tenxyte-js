import { TenxyteHttpClient } from '../http/client';
import { AgentTokenSummary, AgentPendingAction } from '../types';

export class AiModule {
    private agentToken: string | null = null;
    private traceId: string | null = null;

    constructor(private client: TenxyteHttpClient) {
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
                    console.debug('[Tenxyte AI] Received 202 Awaiting Approval:', data);
                } catch {
                    // Ignore parsing errors
                }
            } else if (response.status === 403) {
                const cloned = response.clone();
                try {
                    const data = await cloned.json();
                    if (data.code === 'BUDGET_EXCEEDED') {
                        console.warn('[Tenxyte AI] Network responded with Budget Exceeded for Agent.');
                    } else if (data.status === 'suspended') {
                        console.warn('[Tenxyte AI] Circuit breaker open for Agent.');
                    }
                } catch {
                    // Ignore parsing errors
                }
            }
            return response;
        });
    }

    // ─── AgentToken Lifecycle ───

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

    setAgentToken(token: string): void {
        this.agentToken = token;
    }

    clearAgentToken(): void {
        this.agentToken = null;
    }

    isAgentMode(): boolean {
        return this.agentToken !== null;
    }

    async listAgentTokens(): Promise<AgentTokenSummary[]> {
        return this.client.get('/api/v1/auth/ai/tokens/');
    }

    async getAgentToken(tokenId: number): Promise<AgentTokenSummary> {
        return this.client.get(`/api/v1/auth/ai/tokens/${tokenId}/`);
    }

    async revokeAgentToken(tokenId: number): Promise<{ status: 'revoked' }> {
        return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/revoke/`);
    }

    async suspendAgentToken(tokenId: number): Promise<{ status: 'suspended' }> {
        return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/suspend/`);
    }

    async revokeAllAgentTokens(): Promise<{ status: 'revoked'; count: number }> {
        return this.client.post('/api/v1/auth/ai/tokens/revoke-all/');
    }

    // ─── Circuit Breaker ───

    async sendHeartbeat(tokenId: number): Promise<{ status: 'ok' }> {
        return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/heartbeat/`);
    }

    // ─── Human in the Loop (HITL) ───

    async listPendingActions(): Promise<AgentPendingAction[]> {
        return this.client.get('/api/v1/auth/ai/pending-actions/');
    }

    async confirmPendingAction(confirmationToken: string): Promise<{ status: 'confirmed' }> {
        return this.client.post('/api/v1/auth/ai/pending-actions/confirm/', { token: confirmationToken });
    }

    async denyPendingAction(confirmationToken: string): Promise<{ status: 'denied' }> {
        return this.client.post('/api/v1/auth/ai/pending-actions/deny/', { token: confirmationToken });
    }

    // ─── Traceability and Budget ───

    setTraceId(traceId: string): void {
        this.traceId = traceId;
    }

    clearTraceId(): void {
        this.traceId = null;
    }

    async reportUsage(tokenId: number, usage: {
        cost_usd: number;
        prompt_tokens: number;
        completion_tokens: number;
    }): Promise<{ status: 'ok' } | { error: 'Budget exceeded'; status: 'suspended' }> {
        return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/report-usage/`, usage);
    }
}
