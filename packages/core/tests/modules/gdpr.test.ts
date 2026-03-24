import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GdprModule } from '../../src/modules/gdpr';
import { TenxyteHttpClient } from '../../src/http/client';

describe('GdprModule', () => {
    let client: TenxyteHttpClient;
    let gdpr: GdprModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        gdpr = new GdprModule(client);
        vi.spyOn(client, 'request').mockImplementation(async () => ({}));
    });

    // ─── User-facing ───

    describe('User-facing', () => {
        it('requestAccountDeletion should POST /api/v1/auth/request-account-deletion/', async () => {
            const data = { password: 'secret', otp_code: '123456', reason: 'privacy' };
            vi.mocked(client.request).mockResolvedValueOnce({ message: 'Request created', deletion_request_id: 1 });
            const result = await gdpr.requestAccountDeletion(data);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/request-account-deletion/', {
                method: 'POST',
                body: data,
            });
            expect(result.deletion_request_id).toBe(1);
        });

        it('confirmAccountDeletion should POST /api/v1/auth/confirm-account-deletion/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ message: 'Confirmed', deletion_confirmed: true });
            const result = await gdpr.confirmAccountDeletion('tok_abc');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/confirm-account-deletion/', {
                method: 'POST',
                body: { token: 'tok_abc' },
            });
            expect(result.deletion_confirmed).toBe(true);
        });

        it('cancelAccountDeletion should POST /api/v1/auth/cancel-account-deletion/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ message: 'Cancelled', account_reactivated: true });
            const result = await gdpr.cancelAccountDeletion('mypassword');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/cancel-account-deletion/', {
                method: 'POST',
                body: { password: 'mypassword' },
            });
            expect(result.account_reactivated).toBe(true);
        });

        it('getAccountDeletionStatus should GET /api/v1/auth/account-deletion-status/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ status: 'pending' });
            const result = await gdpr.getAccountDeletionStatus();
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/account-deletion-status/', { method: 'GET' });
            expect(result.status).toBe('pending');
        });

        it('exportUserData should POST /api/v1/auth/export-user-data/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ user_info: { id: 1 }, roles: [], permissions: [] });
            const result = await gdpr.exportUserData('mypassword');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/export-user-data/', {
                method: 'POST',
                body: { password: 'mypassword' },
            });
            expect(result.user_info).toEqual({ id: 1 });
        });
    });

    // ─── Admin-facing ───

    describe('Admin-facing', () => {
        it('listDeletionRequests should GET /api/v1/auth/admin/deletion-requests/ with params', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ count: 1, results: [{ id: '1' }] });
            const result = await gdpr.listDeletionRequests({ status: 'pending', page: 1 });
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/deletion-requests/', {
                method: 'GET',
                params: { status: 'pending', page: 1 },
            });
            expect(result.count).toBe(1);
        });

        it('getDeletionRequest should GET /api/v1/auth/admin/deletion-requests/:id/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ id: 'dr-1', status: 'confirmed' });
            const result = await gdpr.getDeletionRequest('dr-1');
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/deletion-requests/dr-1/', { method: 'GET' });
            expect(result.status).toBe('confirmed');
        });

        it('processDeletionRequest should POST /api/v1/auth/admin/deletion-requests/:id/process/', async () => {
            const data = { confirmation: 'PERMANENTLY DELETE', admin_notes: 'Approved' };
            vi.mocked(client.request).mockResolvedValueOnce({ message: 'Processed', deletion_completed: true });
            const result = await gdpr.processDeletionRequest('dr-1', data);
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/deletion-requests/dr-1/process/', {
                method: 'POST',
                body: data,
            });
            expect(result.deletion_completed).toBe(true);
        });

        it('processExpiredDeletions should POST /api/v1/auth/admin/deletion-requests/process-expired/', async () => {
            vi.mocked(client.request).mockResolvedValueOnce({ message: 'Done', processed_count: 3, failed_count: 0 });
            const result = await gdpr.processExpiredDeletions();
            expect(client.request).toHaveBeenCalledWith('/api/v1/auth/admin/deletion-requests/process-expired/', {
                method: 'POST',
                body: undefined,
            });
            expect(result.processed_count).toBe(3);
        });
    });
});
