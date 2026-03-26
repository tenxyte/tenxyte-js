import { TenxyteHttpClient } from '../http/client';
import { TokenPair, GeneratedSchema } from '../types';
import type { TenxyteStorage } from '../storage';

export interface LoginEmailOptions {
    totp_code?: string;
}

export interface LoginPhoneOptions {
    totp_code?: string;
}

export interface RegisterRequest {
    /** Email address (required unless phone-based registration). */
    email?: string | null;
    /** International phone country code (e.g. "+33"). */
    phone_country_code?: string | null;
    /** Phone number without country code. */
    phone_number?: string | null;
    /** Account password. */
    password: string;
    /** User's first name. */
    first_name?: string;
    /** User's last name. */
    last_name?: string;
    /** Username (if enabled by the backend). */
    username?: string;
    /** If true, the user is logged in immediately after registration (JWT tokens returned). */
    login?: boolean;
}

export interface MagicLinkRequest {
    email: string;
    /** URL used to build the verification link (required). */
    validation_url: string;
}

export interface SocialLoginRequest {
    access_token?: string;
    authorization_code?: string;
    id_token?: string;
    /** Authorization code for the code exchange flow. */
    code?: string;
    /** Redirect URI matching the one used in the authorization request. */
    redirect_uri?: string;
    /** PKCE code verifier (RFC 7636). Required if the authorization request included a code_challenge. */
    code_verifier?: string;
}

/** Response from the registration endpoint (may include tokens if `login: true`). */
export interface RegisterResponse {
    message?: string;
    user_id?: string;
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
}

/** Response from the magic link request endpoint. */
export interface MagicLinkResponse {
    message?: string;
    expires_in_minutes?: number;
    /** Masked email for security. */
    sent_to?: string;
}

export class AuthModule {
    constructor(
        private client: TenxyteHttpClient,
        private storage?: TenxyteStorage,
        private onTokens?: (accessToken: string, refreshToken?: string) => void,
        private onLogout?: () => void,
    ) { }

    private async clearTokens(): Promise<void> {
        if (this.storage) {
            await this.storage.removeItem('tx_access');
            await this.storage.removeItem('tx_refresh');
            this.onLogout?.();
        }
    }

    private async persistTokens(tokens: TokenPair): Promise<TokenPair> {
        if (this.storage) {
            await this.storage.setItem('tx_access', tokens.access_token);
            if (tokens.refresh_token) {
                await this.storage.setItem('tx_refresh', tokens.refresh_token);
            }
            this.onTokens?.(tokens.access_token, tokens.refresh_token);
        }
        return tokens;
    }

    /**
     * Authenticate a user with their email and password.
     * @param data - The login credentials and optional TOTP code if 2FA is required.
     * @returns A pair of Access and Refresh tokens upon successful authentication.
     * @throws {TenxyteError} If credentials are invalid, or if `2FA_REQUIRED` without a valid `totp_code`.
     */
    async loginWithEmail(
        data: GeneratedSchema['LoginEmail'],
    ): Promise<TokenPair> {
        const tokens = await this.client.post<TokenPair>('/api/v1/auth/login/email/', data);
        return this.persistTokens(tokens);
    }

    /**
     * Authenticate a user with an international phone number and password.
     * @param data - The login credentials and optional TOTP code if 2FA is required.
     * @returns A pair of Access and Refresh tokens.
     */
    async loginWithPhone(
        data: GeneratedSchema['LoginPhone'],
    ): Promise<TokenPair> {
        const tokens = await this.client.post<TokenPair>('/api/v1/auth/login/phone/', data);
        return this.persistTokens(tokens);
    }

    /**
     * Registers a new user account.
     * @param data - The registration details (email, password, etc.).
     * @returns The registered user data or a confirmation message.
     */
    async register(data: RegisterRequest): Promise<RegisterResponse> {
        const result = await this.client.post<RegisterResponse>('/api/v1/auth/register/', data);
        if (result?.access_token) {
            await this.persistTokens(result as TokenPair);
        }
        return result;
    }

    /**
     * Logout from the current session.
     * Informs the backend to immediately revoke the specified refresh token.
     * When cookie mode is enabled, the refresh token parameter is optional —
     * the server reads it from the HttpOnly cookie and clears it via Set-Cookie.
     * @param refreshToken - The refresh token to revoke (optional in cookie mode).
     */
    async logout(refreshToken?: string): Promise<void> {
        const body: Record<string, string> = {};
        if (refreshToken) {
            body.refresh_token = refreshToken;
        }
        await this.client.post<void>('/api/v1/auth/logout/', body);
        await this.clearTokens();
    }

    /**
     * Logout from all sessions across all devices.
     * Revokes all refresh tokens currently assigned to the user.
     */
    async logoutAll(): Promise<void> {
        await this.client.post<void>('/api/v1/auth/logout/all/');
        await this.clearTokens();
    }

    /**
     * Manually refresh the access token using a valid refresh token.
     * The refresh token is automatically rotated for improved security.
     * When cookie mode is enabled, the refresh token parameter is optional —
     * the server reads it from the HttpOnly cookie.
     * @param refreshToken - The current refresh token (optional in cookie mode).
     * @returns A new token pair (access + rotated refresh).
     */
    async refreshToken(refreshToken?: string): Promise<TokenPair> {
        const body: Record<string, string> = {};
        if (refreshToken) {
            body.refresh_token = refreshToken;
        }
        const tokens = await this.client.post<TokenPair>('/api/v1/auth/refresh/', body);
        return this.persistTokens(tokens);
    }

    /**
     * Request a Magic Link for passwordless sign-in.
     * @param data - The email to send the logic link to.
     */
    async requestMagicLink(data: MagicLinkRequest): Promise<MagicLinkResponse> {
        return this.client.post<MagicLinkResponse>('/api/v1/auth/magic-link/request/', data);
    }

    /**
     * Verifies a magic link token extracted from the URL.
     * @param token - The cryptographic token received via email.
     * @returns A session token pair if the token is valid and unexpired.
     */
    async verifyMagicLink(token: string): Promise<TokenPair> {
        const tokens = await this.client.get<TokenPair>(`/api/v1/auth/magic-link/verify/`, { params: { token } });
        return this.persistTokens(tokens);
    }

    /**
     * Submits OAuth2 Social Authentication payloads to the backend.
     * Can be used with native mobile SDK tokens (like Apple Sign-In JWTs).
     * @param provider - The OAuth provider ('google', 'github', etc.)
     * @param data - The OAuth tokens (access_token, id_token, etc.)
     * @returns An active session token pair.
     */
    async loginWithSocial(provider: 'google' | 'github' | 'microsoft' | 'facebook', data: SocialLoginRequest): Promise<TokenPair> {
        const tokens = await this.client.post<TokenPair>(`/api/v1/auth/social/${provider}/`, data);
        return this.persistTokens(tokens);
    }

    /**
     * Handle Social Auth Callbacks (Authorization Code flow).
     * @param provider - The OAuth provider ('google', 'github', etc.)
     * @param code - The authorization code retrieved from the query string parameters.
     * @param redirectUri - The original redirect URI that was requested.
     * @param codeVerifier - Optional PKCE code verifier (RFC 7636).
     * @returns An active session token pair after successful code exchange.
     */
    async handleSocialCallback(
        provider: 'google' | 'github' | 'microsoft' | 'facebook',
        code: string,
        redirectUri: string,
        codeVerifier?: string,
    ): Promise<TokenPair> {
        const params: Record<string, string> = { code, redirect_uri: redirectUri };
        if (codeVerifier) {
            params.code_verifier = codeVerifier;
        }
        const tokens = await this.client.get<TokenPair>(`/api/v1/auth/social/${provider}/callback/`, {
            params,
        });
        return this.persistTokens(tokens);
    }
}
