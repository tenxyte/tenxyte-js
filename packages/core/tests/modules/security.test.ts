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
        await security.requestOtp('email');
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/otp/request/', {
            method: 'POST',
            body: { type: 'email_verification' },
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

    it('authenticateWebAuthn should POST to /api/v1/auth/webauthn/authenticate/begin/', async () => {
        const mockResponse = { publicKey: {} };
        vi.mocked(client.request).mockResolvedValueOnce(mockResponse);
        // We mock navigator to stop the promise from throwing regarding missing credentials API
        vi.stubGlobal('navigator', {
            credentials: {
                get: vi.fn(),
            }
        });

        try {
            await security.authenticateWebAuthn('user@example.com');
        } catch (e) { /* expected to throw because navigator mock returns undefined */ }

        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/webauthn/authenticate/begin/', {
            method: 'POST',
            body: { email: 'user@example.com' },
        });

        vi.unstubAllGlobals();
    });

    it('deleteWebAuthnCredential should DELETE /api/v1/auth/webauthn/credentials/{credentialId}/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);
        await security.deleteWebAuthnCredential(123);
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/webauthn/credentials/123/', {
            method: 'DELETE',
            body: undefined,
        });
    });

    it('listWebAuthnCredentials should GET /api/v1/auth/webauthn/credentials/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ credentials: [], count: 0 });
        const result = await security.listWebAuthnCredentials();
        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/webauthn/credentials/', { method: 'GET' });
        expect(result.count).toBe(0);
    });

    it('registerWebAuthn should begin registration and handle navigator.credentials.create', async () => {
        // Step 1: Mock begin response
        const beginResponse = {
            publicKey: {
                challenge: 'Y2hhbGxlbmdl', // base64url of "challenge"
                user: { id: 'dXNlcg', name: 'user@test.com', displayName: 'User' },
                rp: { name: 'Test', id: 'test.com' },
                pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            },
        };
        vi.mocked(client.request).mockResolvedValueOnce(beginResponse);

        // Step 2: Mock complete response
        vi.mocked(client.request).mockResolvedValueOnce({ message: 'Credential registered' });

        // Mock navigator.credentials.create
        const mockRawId = new Uint8Array([1, 2, 3]).buffer;
        const mockAttObj = new Uint8Array([4, 5, 6]).buffer;
        const mockClientData = new Uint8Array([7, 8, 9]).buffer;
        vi.stubGlobal('navigator', {
            credentials: {
                create: vi.fn().mockResolvedValue({
                    id: 'cred-id',
                    type: 'public-key',
                    rawId: mockRawId,
                    response: {
                        attestationObject: mockAttObj,
                        clientDataJSON: mockClientData,
                    },
                }),
            },
        });

        const result = await security.registerWebAuthn('My Laptop');

        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/webauthn/register/begin/', {
            method: 'POST',
            body: undefined,
        });
        expect(client.request).toHaveBeenCalledTimes(2);
        expect(navigator.credentials.create).toHaveBeenCalled();

        vi.unstubAllGlobals();
    });

    it('authenticateWebAuthn should begin authentication and handle navigator.credentials.get', async () => {
        // Step 1: Mock begin response
        const beginResponse = {
            publicKey: {
                challenge: 'Y2hhbGxlbmdl',
                allowCredentials: [{ id: 'Y3JlZA', type: 'public-key' }],
            },
        };
        vi.mocked(client.request).mockResolvedValueOnce(beginResponse);

        // Step 2: Mock complete response
        vi.mocked(client.request).mockResolvedValueOnce({
            access: 'acc',
            refresh: 'ref',
            user: { id: 1 },
            message: 'Authenticated',
            credential_used: 'cred-id',
        });

        // Mock navigator.credentials.get
        const mockRawId = new Uint8Array([1, 2, 3]).buffer;
        const mockAuthData = new Uint8Array([10, 11]).buffer;
        const mockClientData = new Uint8Array([12, 13]).buffer;
        const mockSignature = new Uint8Array([14, 15]).buffer;
        vi.stubGlobal('navigator', {
            credentials: {
                get: vi.fn().mockResolvedValue({
                    id: 'cred-id',
                    type: 'public-key',
                    rawId: mockRawId,
                    response: {
                        authenticatorData: mockAuthData,
                        clientDataJSON: mockClientData,
                        signature: mockSignature,
                        userHandle: null,
                    },
                }),
            },
        });

        const result = await security.authenticateWebAuthn('user@test.com');

        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/webauthn/authenticate/begin/', {
            method: 'POST',
            body: { email: 'user@test.com' },
        });
        expect(navigator.credentials.get).toHaveBeenCalled();
        expect(result.credential_used).toBe('cred-id');

        vi.unstubAllGlobals();
    });
});
