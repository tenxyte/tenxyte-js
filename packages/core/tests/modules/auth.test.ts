import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthModule } from '../../src/modules/auth';
import { TenxyteHttpClient } from '../../src/http/client';

describe('AuthModule', () => {
    let client: TenxyteHttpClient;
    let auth: AuthModule;

    beforeEach(() => {
        client = new TenxyteHttpClient({ baseUrl: 'http://localhost:8000' });
        auth = new AuthModule(client);

        // Mock the underlying request method
        vi.spyOn(client, 'request').mockImplementation(async () => {
            return {};
        });
    });

    it('loginWithEmail should POST to /api/v1/auth/login/email/', async () => {
        const mockResponse = { access_token: 'acc', refresh_token: 'ref', token_type: 'Bearer', expires_in: 3600, device_summary: null };
        vi.mocked(client.request).mockResolvedValueOnce(mockResponse);

        const data = { email: 'test@example.com', password: 'password123' };
        const result = await auth.loginWithEmail(data);

        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/login/email/', {
            method: 'POST',
            body: data,
        });
        expect(result).toEqual(mockResponse);
    });

    it('logout should POST to /api/v1/auth/logout/ with refresh_token', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);

        await auth.logout('some_refresh_token');

        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/logout/', {
            method: 'POST',
            body: { refresh_token: 'some_refresh_token' },
        });
    });

    it('requestMagicLink should POST to /api/v1/auth/magic-link/request/', async () => {
        vi.mocked(client.request).mockResolvedValueOnce(undefined);

        const data = { email: 'magic@example.com' };
        await auth.requestMagicLink(data);

        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/magic-link/request/', {
            method: 'POST',
            body: data,
        });
    });

    it('verifyMagicLink should GET from /api/v1/auth/magic-link/verify/ with token in query', async () => {
        const mockResponse = { access_token: 'acc' };
        vi.mocked(client.request).mockResolvedValueOnce(mockResponse);

        const result = await auth.verifyMagicLink('magic_token_123');

        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/magic-link/verify/', {
            method: 'GET',
            params: { token: 'magic_token_123' },
        });
        expect(result).toEqual(mockResponse);
    });

    it('loginWithSocial should POST to /api/v1/auth/social/:provider/', async () => {
        const mockResponse = { access_token: 'acc' };
        vi.mocked(client.request).mockResolvedValueOnce(mockResponse);

        const data = { access_token: 'google_token' };
        const result = await auth.loginWithSocial('google', data);

        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/social/google/', {
            method: 'POST',
            body: data,
        });
        expect(result).toEqual(mockResponse);
    });

    it('handleSocialCallback should GET from callback endpoint with correct params', async () => {
        vi.mocked(client.request).mockResolvedValueOnce({ access_token: 'acc' });

        await auth.handleSocialCallback('github', 'auth_code', 'http://localhost/callback');

        expect(client.request).toHaveBeenCalledWith('/api/v1/auth/social/github/callback/', {
            method: 'GET',
            params: { code: 'auth_code', redirect_uri: 'http://localhost/callback' },
        });
    });
});
