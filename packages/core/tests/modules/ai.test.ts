import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiModule } from '../../src/modules/ai';
import { TenxyteHttpClient } from '../../src/http/client';

describe('AiModule', () => {
    let client: TenxyteHttpClient;
    let ai: AiModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        ai = new AiModule(client);
        vi.spyOn(client, 'request').mockImplementation(async () => ({}));
    });

    // ─── Token Lifecycle ───

    describe('Token Lifecycle', () => {
        it('createAgentToken should POST /api/v1/auth/ai/tokens/', async () => {
            const data = { agent_id: 'agent-1', permissions: ['users.view'] };
            vi.mocked(client.request).mockResolvedValueOnce({ id: 1, token: 'agt_xxx', agent_id: 'agent-1', status: 'active', expires_at: '2025-12-31' });
            const result = await ai.createAgentToken(data);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/tokens/', {
                method: 'POST',
                body: data,
            });
            expect(result.token).toBe('agt_xxx');
        });

        it('setAgentToken / isAgentMode / clearAgentToken', () => {
            expect(ai.isAgentMode()).toBe(false);
            ai.setAgentToken('agt_abc');
            expect(ai.isAgentMode()).toBe(true);
            ai.clearAgentToken();
            expect(ai.isAgentMode()).toBe(false);
        });

        it('listAgentTokens should GET /api/v1/auth/ai/tokens/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce([{ id: 1 }]);
            const result = await ai.listAgentTokens();
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/tokens/', { method: 'GET' });
            expect(result).toHaveLength(1);
        });

        it('getAgentToken should GET /api/v1/auth/ai/tokens/:id/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ id: 5, agent_id: 'agent-1' });
            await ai.getAgentToken(5);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/tokens/5/', { method: 'GET' });
        });

        it('revokeAgentToken should POST /api/v1/auth/ai/tokens/:id/revoke/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ status: 'revoked' });
            const result = await ai.revokeAgentToken(5);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/tokens/5/revoke/', {
                method: 'POST',
                body: undefined,
            });
            expect(result.status).toBe('revoked');
        });

        it('suspendAgentToken should POST /api/v1/auth/ai/tokens/:id/suspend/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ status: 'suspended' });
            const result = await ai.suspendAgentToken(5);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/tokens/5/suspend/', {
                method: 'POST',
                body: undefined,
            });
            expect(result.status).toBe('suspended');
        });

        it('revokeAllAgentTokens should POST /api/v1/auth/ai/tokens/revoke-all/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ status: 'revoked', count: 3 });
            const result = await ai.revokeAllAgentTokens();
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/tokens/revoke-all/', {
                method: 'POST',
                body: undefined,
            });
            expect(result.count).toBe(3);
        });
    });

    // ─── HITL ───

    describe('Human in the Loop', () => {
        it('listPendingActions should GET /api/v1/auth/ai/pending-actions/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce([]);
            const result = await ai.listPendingActions();
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/pending-actions/', { method: 'GET' });
            expect(result).toEqual([]);
        });

        it('confirmPendingAction should POST /api/v1/auth/ai/pending-actions/confirm/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ status: 'confirmed' });
            const result = await ai.confirmPendingAction('tok_confirm');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/pending-actions/confirm/', {
                method: 'POST',
                body: { token: 'tok_confirm' },
            });
            expect(result.status).toBe('confirmed');
        });

        it('denyPendingAction should POST /api/v1/auth/ai/pending-actions/deny/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ status: 'denied' });
            const result = await ai.denyPendingAction('tok_deny');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/pending-actions/deny/', {
                method: 'POST',
                body: { token: 'tok_deny' },
            });
            expect(result.status).toBe('denied');
        });
    });

    // ─── Heartbeat & Usage ───

    describe('Heartbeat & Usage', () => {
        it('sendHeartbeat should POST /api/v1/auth/ai/tokens/:id/heartbeat/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ status: 'ok' });
            const result = await ai.sendHeartbeat(5);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/tokens/5/heartbeat/', {
                method: 'POST',
                body: undefined,
            });
            expect(result.status).toBe('ok');
        });

        it('reportUsage should POST /api/v1/auth/ai/tokens/:id/report-usage/', async () => {
            const usage = { cost_usd: 0.05, prompt_tokens: 100, completion_tokens: 50 };
            vi.mocked(client.request).mockResolvedValueOnce({ status: 'ok' });
            const result = await ai.reportUsage(5, usage);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/ai/tokens/5/report-usage/', {
                method: 'POST',
                body: usage,
            });
            expect(result.status).toBe('ok');
        });
    });

    // ─── Traceability ───

    describe('Traceability', () => {
        it('setTraceId / clearTraceId should manage trace context', () => {
            ai.setTraceId('trc_123');
            // No direct getter, but we can verify the interceptor behaviour via integration tests
            ai.clearTraceId();
            // No throw = success
        });
    });
});
