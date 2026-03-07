import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityModule } from '../../src/modules/security';
import { TenxyteHttpClient } from '../../src/http/client';

describe('SecurityModule', () => {
    let client: TenxyteHttpClient;
    let security: SecurityModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        security = new SecurityModule(client);
        vi.spyOn(client, 'request').mockImplementation(async () => {
            return {};
        });
    });

    it('requestOtp should POST to /api/v1/auth/otp/request/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);
        const data = { email: 'test@example.com', type: 'email_verification' as const };
        await security.requestOtp(data);
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/otp/request/', {
            method: 'POST',
            body: data,
        });
    });

    it('setup2FA should POST to /api/v1/auth/2fa/setup/', async () => {
        const mockResponse = { secret: 'secret_key', qr_code_url: 'url', backup_codes: ['123'] };
        vi.mocked(client.request).mockResolvedValueOnce(mockResponse);

        const result = await security.setup2FA();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/2fa/setup/', {
            method: 'POST',
            body: undefined
        });
        expect(result).toEqual(mockResponse);
    });

    it('confirm2FA should POST to /api/v1/auth/2fa/confirm/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);
        await security.confirm2FA('123456');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/2fa/confirm/', {
            method: 'POST',
            body: { totp_code: '123456' },
        });
    });

    it('resetPasswordRequest should POST to /api/v1/auth/password/reset/request/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);
        await security.resetPasswordRequest({ email: 'hello@example.com' });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/password/reset/request/', {
            method: 'POST',
            body: { email: 'hello@example.com' },
        });
    });

    it('authenticateWebAuthnBegin should POST to /api/v1/auth/webauthn/authenticate/begin/', async () => {
        const mockResponse = { publicKey: {} };
        vi.mocked(client.request).mockResolvedValueOnce(mockResponse);
        const result = await security.authenticateWebAuthnBegin({ email: 'user@example.com' });
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/webauthn/authenticate/begin/', {
            method: 'POST',
            body: { email: 'user@example.com' },
        });
        expect(result).toEqual(mockResponse);
    });

    it('deleteWebAuthnCredential should DELETE /api/v1/auth/webauthn/credentials/{credentialId}/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);
        await security.deleteWebAuthnCredential('cred_123');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/webauthn/credentials/cred_123/', {
            method: 'DELETE',
        });
    });
});
