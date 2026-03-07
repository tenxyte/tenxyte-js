import { TenxyteHttpClient } from '../http/client';
import { TokenPair } from '../types';

export interface OtpRequestParams {
    email?: string;
    phone_country_code?: string;
    phone_number?: string;
    type: 'email_verification' | 'phone_verification' | 'password_reset';
}

export interface VerifyOtpEmailParams {
    email: string;
    code: string;
}

export interface VerifyOtpPhoneParams {
    phone_country_code: string;
    phone_number: string;
    code: string;
}

export interface Setup2FAResponse {
    qr_code_url: string;
    secret: string;
    backup_codes: string[];
}

export interface WebAuthnRegisterBeginResponse {
    publicKey: any; // CredentialCreationOptions
}

export interface WebAuthnAuthenticateBeginResponse {
    publicKey: any; // CredentialRequestOptions
}

export class SecurityModule {
    constructor(private client: TenxyteHttpClient) { }

    // --- OTP Verification --- //

    async requestOtp(data: OtpRequestParams): Promise<void> {
        return this.client.post<void>('/api/v1/auth/otp/request/', data);
    }

    async verifyOtpEmail(data: VerifyOtpEmailParams): Promise<void> {
        return this.client.post<void>('/api/v1/auth/otp/verify/email/', data);
    }

    async verifyOtpPhone(data: VerifyOtpPhoneParams): Promise<void> {
        return this.client.post<void>('/api/v1/auth/otp/verify/phone/', data);
    }

    // --- TOTP / 2FA --- //

    async get2FAStatus(): Promise<{ is_enabled: boolean; backup_codes_remaining: number }> {
        return this.client.get('/api/v1/auth/2fa/status/');
    }

    async setup2FA(): Promise<Setup2FAResponse> {
        return this.client.post<Setup2FAResponse>('/api/v1/auth/2fa/setup/');
    }

    async confirm2FA(totp_code: string): Promise<void> {
        return this.client.post<void>('/api/v1/auth/2fa/confirm/', { totp_code });
    }

    async disable2FA(totp_code: string, password?: string): Promise<void> {
        return this.client.post<void>('/api/v1/auth/2fa/disable/', { totp_code, password });
    }

    async regenerateBackupCodes(totp_code: string): Promise<{ backup_codes: string[] }> {
        return this.client.post('/api/v1/auth/2fa/backup-codes/', { totp_code });
    }

    // --- Password Management --- //

    async resetPasswordRequest(data: { email?: string; phone_country_code?: string; phone_number?: string }): Promise<void> {
        return this.client.post<void>('/api/v1/auth/password/reset/request/', data);
    }

    async resetPasswordConfirm(data: { otp_code: string; new_password: string; email?: string; phone_country_code?: string; phone_number?: string }): Promise<void> {
        return this.client.post<void>('/api/v1/auth/password/reset/confirm/', data);
    }

    async changePassword(data: { current_password: string; new_password: string }): Promise<void> {
        return this.client.post<void>('/api/v1/auth/password/change/', data);
    }

    async checkPasswordStrength(data: { password: string; email?: string }): Promise<{ score: number; feedback: string[] }> {
        return this.client.post('/api/v1/auth/password/strength/', data);
    }

    async getPasswordRequirements(): Promise<any> {
        return this.client.get('/api/v1/auth/password/requirements/');
    }

    // --- WebAuthn / Passkeys --- //

    async registerWebAuthnBegin(): Promise<WebAuthnRegisterBeginResponse> {
        return this.client.post<WebAuthnRegisterBeginResponse>('/api/v1/auth/webauthn/register/begin/');
    }

    async registerWebAuthnComplete(data: any): Promise<void> {
        return this.client.post<void>('/api/v1/auth/webauthn/register/complete/', data);
    }

    async authenticateWebAuthnBegin(data?: { email?: string }): Promise<WebAuthnAuthenticateBeginResponse> {
        return this.client.post<WebAuthnAuthenticateBeginResponse>('/api/v1/auth/webauthn/authenticate/begin/', data || {});
    }

    async authenticateWebAuthnComplete(data: any): Promise<TokenPair> {
        return this.client.post<TokenPair>('/api/v1/auth/webauthn/authenticate/complete/', data);
    }

    async listWebAuthnCredentials(): Promise<any[]> {
        return this.client.get<any[]>('/api/v1/auth/webauthn/credentials/');
    }

    async deleteWebAuthnCredential(credentialId: string): Promise<void> {
        return this.client.delete<void>(`/api/v1/auth/webauthn/credentials/${credentialId}/`);
    }
}
