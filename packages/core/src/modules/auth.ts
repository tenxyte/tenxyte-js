import { TenxyteHttpClient } from '../http/client';
import { TokenPair, GeneratedSchema } from '../types';

export interface LoginEmailOptions {
    totp_code?: string;
}

export interface LoginPhoneOptions {
    totp_code?: string;
}

export type RegisterRequest = any;

export interface MagicLinkRequest {
    email: string;
}

export interface SocialLoginRequest {
    access_token?: string;
    authorization_code?: string;
    id_token?: string;
}

export class AuthModule {
    constructor(private client: TenxyteHttpClient) { }

    /**
     * Authenticate a user with their email and password.
     * @param data - The login credentials and optional TOTP code if 2FA is required.
     * @returns A pair of Access and Refresh tokens upon successful authentication.
     * @throws {TenxyteError} If credentials are invalid, or if `2FA_REQUIRED` without a valid `totp_code`.
     */
    async loginWithEmail(
        data: GeneratedSchema['LoginEmail'],
    ): Promise<TokenPair> {
        return this.client.post<TokenPair>('/api/v1/auth/login/email/', data);
    }

    /**
     * Authenticate a user with an international phone number and password.
     * @param data - The login credentials and optional TOTP code if 2FA is required.
     * @returns A pair of Access and Refresh tokens.
     */
    async loginWithPhone(
        data: GeneratedSchema['LoginPhone'],
    ): Promise<TokenPair> {
        return this.client.post<TokenPair>('/api/v1/auth/login/phone/', data);
    }

    /**
     * Registers a new user account.
     * @param data - The registration details (email, password, etc.).
     * @returns The registered user data or a confirmation message.
     */
    async register(data: RegisterRequest): Promise<any> {
        return this.client.post<any>('/api/v1/auth/register/', data);
    }

    /**
     * Logout from the current session.
     * Informs the backend to immediately revoke the specified refresh token.
     * @param refreshToken - The refresh token to revoke.
     */
    async logout(refreshToken: string): Promise<void> {
        return this.client.post<void>('/api/v1/auth/logout/', { refresh_token: refreshToken });
    }

    /**
     * Logout from all sessions across all devices.
     * Revokes all refresh tokens currently assigned to the user.
     */
    async logoutAll(): Promise<void> {
        return this.client.post<void>('/api/v1/auth/logout/all/');
    }

    /**
     * Request a Magic Link for passwordless sign-in.
     * @param data - The email to send the logic link to.
     */
    async requestMagicLink(data: MagicLinkRequest): Promise<void> {
        return this.client.post<void>('/api/v1/auth/magic-link/request/', data);
    }

    /**
     * Verifies a magic link token extracted from the URL.
     * @param token - The cryptographic token received via email.
     * @returns A session token pair if the token is valid and unexpired.
     */
    async verifyMagicLink(token: string): Promise<TokenPair> {
        return this.client.get<TokenPair>(`/api/v1/auth/magic-link/verify/`, { params: { token } });
    }

    /**
     * Submits OAuth2 Social Authentication payloads to the backend.
     * Can be used with native mobile SDK tokens (like Apple Sign-In JWTs).
     * @param provider - The OAuth provider ('google', 'github', etc.)
     * @param data - The OAuth tokens (access_token, id_token, etc.)
     * @returns An active session token pair.
     */
    async loginWithSocial(provider: 'google' | 'github' | 'microsoft' | 'facebook', data: SocialLoginRequest): Promise<TokenPair> {
        return this.client.post<TokenPair>(`/api/v1/auth/social/${provider}/`, data);
    }

    /**
     * Handle Social Auth Callbacks (Authorization Code flow).
     * @param provider - The OAuth provider ('google', 'github', etc.)
     * @param code - The authorization code retrieved from the query string parameters.
     * @param redirectUri - The original redirect URI that was requested.
     * @returns An active session token pair after successful code exchange.
     */
    async handleSocialCallback(provider: 'google' | 'github' | 'microsoft' | 'facebook', code: string, redirectUri: string): Promise<TokenPair> {
        return this.client.get<TokenPair>(`/api/v1/auth/social/${provider}/callback/`, {
            params: { code, redirect_uri: redirectUri },
        });
    }
}
