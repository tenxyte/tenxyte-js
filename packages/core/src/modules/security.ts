import { TenxyteHttpClient } from '../http/client';
import { TenxyteUser, TokenPair } from '../types';
import { base64urlToBuffer, bufferToBase64url } from '../utils/base64url';

export class SecurityModule {
    constructor(private client: TenxyteHttpClient) { }

    // ─── 2FA (TOTP) Management ───

    async get2FAStatus(): Promise<{ is_enabled: boolean; backup_codes_remaining: number }> {
        return this.client.get('/api/v1/auth/2fa/status/');
    }

    async setup2FA(): Promise<{
        message: string;
        secret: string;
        manual_entry_key: string;
        qr_code: string;
        provisioning_uri: string;
        backup_codes: string[];
        warning: string;
    }> {
        return this.client.post('/api/v1/auth/2fa/setup/');
    }

    async confirm2FA(totpCode: string): Promise<{
        message: string;
        is_enabled: boolean;
        enabled_at: string;
    }> {
        return this.client.post('/api/v1/auth/2fa/confirm/', { totp_code: totpCode });
    }

    async disable2FA(totpCode: string, password?: string): Promise<{
        message: string;
        is_enabled: boolean;
        disabled_at: string;
        backup_codes_invalidated: boolean;
    }> {
        return this.client.post('/api/v1/auth/2fa/disable/', { totp_code: totpCode, password });
    }

    async regenerateBackupCodes(totpCode: string): Promise<{
        message: string;
        backup_codes: string[];
        codes_count: number;
        generated_at?: string;
        warning: string;
    }> {
        return this.client.post('/api/v1/auth/2fa/backup-codes/', { totp_code: totpCode });
    }

    // ─── Verification OTP (Email / Phone) ───

    async requestOtp(type: 'email' | 'phone'): Promise<{
        message: string;
        otp_id: number;
        expires_at: string;
        channel: 'email' | 'phone';
        masked_recipient: string;
    }> {
        return this.client.post('/api/v1/auth/otp/request/', { type: type === 'email' ? 'email_verification' : 'phone_verification' });
    }

    async verifyOtpEmail(code: string): Promise<{
        message: string;
        email_verified: boolean;
        verified_at: string;
    }> {
        return this.client.post('/api/v1/auth/otp/verify/email/', { code });
    }

    async verifyOtpPhone(code: string): Promise<{
        message: string;
        phone_verified: boolean;
        verified_at: string;
        phone_number: string;
    }> {
        return this.client.post('/api/v1/auth/otp/verify/phone/', { code });
    }

    // ─── Password Sub-module ───

    async resetPasswordRequest(target: { email: string } | { phone_country_code: string; phone_number: string }): Promise<{ message: string }> {
        return this.client.post('/api/v1/auth/password/reset/request/', target);
    }

    async resetPasswordConfirm(data: {
        email?: string;
        phone_country_code?: string;
        phone_number?: string;
        otp_code: string;
        new_password: string;
        confirm_password: string;
    }): Promise<{ message: string }> {
        return this.client.post('/api/v1/auth/password/reset/confirm/', data);
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        return this.client.post('/api/v1/auth/password/change/', {
            current_password: currentPassword,
            new_password: newPassword,
        });
    }

    async checkPasswordStrength(password: string, email?: string): Promise<{
        score: number;
        strength: string;
        is_valid: boolean;
        errors: string[];
        requirements: {
            min_length: number;
            require_lowercase: boolean;
            require_uppercase: boolean;
            require_numbers: boolean;
            require_special: boolean;
        };
    }> {
        return this.client.post('/api/v1/auth/password/strength/', { password, email });
    }

    async getPasswordRequirements(): Promise<{
        requirements: Record<string, boolean | number>;
        min_length: number;
        max_length: number;
    }> {
        return this.client.get('/api/v1/auth/password/requirements/');
    }

    // ─── WebAuthn / Passkeys (FIDO2) ───

    async registerWebAuthn(deviceName?: string): Promise<{
        message: string;
        credential: {
            id: number;
            device_name: string;
            created_at: string;
        };
    }> {
        // 1. Begin registration
        const optionsResponse = await this.client.post<any>('/api/v1/auth/webauthn/register/begin/');

        // 2. Map options for the browser
        const publicKeyOpts = optionsResponse.publicKey;
        publicKeyOpts.challenge = base64urlToBuffer(publicKeyOpts.challenge);
        publicKeyOpts.user.id = base64urlToBuffer(publicKeyOpts.user.id);
        if (publicKeyOpts.excludeCredentials) {
            publicKeyOpts.excludeCredentials.forEach((cred: any) => {
                cred.id = base64urlToBuffer(cred.id);
            });
        }

        // 3. Request credential creation from the Authenticator
        const cred = await navigator.credentials.create({ publicKey: publicKeyOpts }) as PublicKeyCredential;
        if (!cred) {
            throw new Error('WebAuthn registration was aborted or failed.');
        }

        const response = cred.response as AuthenticatorAttestationResponse;

        // 4. Complete registration on the backend
        const completionPayload = {
            device_name: deviceName,
            credential: {
                id: cred.id,
                type: cred.type,
                rawId: bufferToBase64url(cred.rawId),
                response: {
                    attestationObject: bufferToBase64url(response.attestationObject),
                    clientDataJSON: bufferToBase64url(response.clientDataJSON),
                },
            },
        };

        return this.client.post('/api/v1/auth/webauthn/register/complete/', completionPayload);
    }

    async authenticateWebAuthn(email?: string): Promise<{
        access: string;
        refresh: string;
        user: TenxyteUser;
        message: string;
        credential_used: string;
    }> {
        // 1. Begin authentication
        const optionsResponse = await this.client.post<any>('/api/v1/auth/webauthn/authenticate/begin/', email ? { email } : {});

        // 2. Map options for the browser
        const publicKeyOpts = optionsResponse.publicKey;
        publicKeyOpts.challenge = base64urlToBuffer(publicKeyOpts.challenge);
        if (publicKeyOpts.allowCredentials) {
            publicKeyOpts.allowCredentials.forEach((cred: any) => {
                cred.id = base64urlToBuffer(cred.id);
            });
        }

        // 3. Request assertion from the Authenticator
        const cred = await navigator.credentials.get({ publicKey: publicKeyOpts }) as PublicKeyCredential;
        if (!cred) {
            throw new Error('WebAuthn authentication was aborted or failed.');
        }

        const response = cred.response as AuthenticatorAssertionResponse;

        // 4. Complete authentication on the backend
        const completionPayload = {
            credential: {
                id: cred.id,
                type: cred.type,
                rawId: bufferToBase64url(cred.rawId),
                response: {
                    authenticatorData: bufferToBase64url(response.authenticatorData),
                    clientDataJSON: bufferToBase64url(response.clientDataJSON),
                    signature: bufferToBase64url(response.signature),
                    userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
                },
            },
        };

        return this.client.post('/api/v1/auth/webauthn/authenticate/complete/', completionPayload);
    }

    async listWebAuthnCredentials(): Promise<{
        credentials: Array<{
            id: number;
            device_name: string;
            created_at: string;
            last_used_at: string | null;
            authenticator_type: string;
            is_resident_key: boolean;
        }>;
        count: number;
    }> {
        return this.client.get('/api/v1/auth/webauthn/credentials/');
    }

    async deleteWebAuthnCredential(credentialId: number): Promise<void> {
        return this.client.delete(`/api/v1/auth/webauthn/credentials/${credentialId}/`);
    }
}
