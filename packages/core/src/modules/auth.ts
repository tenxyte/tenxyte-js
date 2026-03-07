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
     * Authenticate user with email and password
     */
    async loginWithEmail(
        data: GeneratedSchema['LoginEmail'],
    ): Promise<TokenPair> {
        return this.client.post<TokenPair>('/api/v1/auth/login/email/', data);
    }

    /**
     * Authenticate user with international phone number and password
     */
    async loginWithPhone(
        data: GeneratedSchema['LoginPhone'],
    ): Promise<TokenPair> {
        return this.client.post<TokenPair>('/api/v1/auth/login/phone/', data);
    }

    /**
     * Register a new user
     */
    async register(data: RegisterRequest): Promise<any> {
        return this.client.post<any>('/api/v1/auth/register/', data);
    }

    /**
     * Logout from the current session
     */
    async logout(refreshToken: string): Promise<void> {
        return this.client.post<void>('/api/v1/auth/logout/', { refresh_token: refreshToken });
    }

    /**
     * Logout from all sessions (revokes all refresh tokens)
     */
    async logoutAll(): Promise<void> {
        return this.client.post<void>('/api/v1/auth/logout/all/');
    }

    /**
     * Request a magic link for sign-in
     */
    async requestMagicLink(data: MagicLinkRequest): Promise<void> {
        return this.client.post<void>('/api/v1/auth/magic-link/request/', data);
    }

    /**
     * Verify a magic link token
     */
    async verifyMagicLink(token: string): Promise<TokenPair> {
        return this.client.get<TokenPair>(`/api/v1/auth/magic-link/verify/`, { params: { token } });
    }

    /**
     * Perform OAuth2 Social Authentication (e.g. Google, GitHub)
     */
    async loginWithSocial(provider: 'google' | 'github' | 'microsoft' | 'facebook', data: SocialLoginRequest): Promise<TokenPair> {
        return this.client.post<TokenPair>(`/api/v1/auth/social/${provider}/`, data);
    }

    /**
     * Handle Social Auth Callback (authorization code flow)
     */
    async handleSocialCallback(provider: 'google' | 'github' | 'microsoft' | 'facebook', code: string, redirectUri: string): Promise<TokenPair> {
        return this.client.get<TokenPair>(`/api/v1/auth/social/${provider}/callback/`, {
            params: { code, redirect_uri: redirectUri },
        });
    }
}
