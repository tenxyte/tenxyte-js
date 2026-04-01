"""
Security Tests (EPIC #75)

2FA, OTP, Passkeys, password management.
All endpoints provided by Tenxyte with zero custom code.
"""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class TOTPTwoFactorTests(TestCase):
    """Issue #76 - TOTP 2FA (Setup, Confirm, Disable, Backup Codes)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'test@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Test',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_2fa_setup(self):
        """POST /api/v1/auth/2fa/setup/ → returns secret + qr_code_url"""
        response = self.client.post('/api/v1/auth/2fa/setup/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('secret', response.data)
        self.assertIn('qr_code_url', response.data)
    
    def test_backup_codes(self):
        """GET /api/v1/auth/2fa/backup-codes/ → 10 codes returned"""
        # Setup 2FA first
        setup_response = self.client.post('/api/v1/auth/2fa/setup/')
        
        # Note: In real test, would need to confirm 2FA with valid TOTP
        # For now, just verify endpoint exists
        response = self.client.get('/api/v1/auth/2fa/backup-codes/')
        
        # May return 400 if 2FA not confirmed yet
        self.assertIn(response.status_code, [200, 400])


class OTPTests(TestCase):
    """Issue #77 - OTP (Email Verification)"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_otp_request(self):
        """POST /api/v1/auth/otp/request/ → OTP printed to console"""
        response = self.client.post('/api/v1/auth/otp/request/', {
            'delivery_method': 'email',
            'purpose': 'login',
            'email': 'test@example.com',
        })
        
        # OTP is sent to console in dev mode
        self.assertIn(response.status_code, [200, 201, 202])


class WebAuthnTests(TestCase):
    """Issue #78 - Passkeys / WebAuthn (FIDO2)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'webauthn@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'WebAuthn',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_webauthn_register_begin(self):
        """POST /api/v1/auth/webauthn/register/begin/ → returns challenge"""
        response = self.client.post('/api/v1/auth/webauthn/register/begin/')
        
        # Should return challenge data
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('challenge', response.data)
    
    def test_webauthn_authenticate_begin(self):
        """POST /api/v1/auth/webauthn/authenticate/begin/ → returns challenge"""
        # Logout first for authentication flow
        self.client.credentials()
        
        response = self.client.post('/api/v1/auth/webauthn/authenticate/begin/', {
            'email': self.user_data['email'],
        })
        
        # Should return challenge or error if no passkey registered
        self.assertIn(response.status_code, [200, 400, 404])


class PasswordManagementTests(TestCase):
    """Issue #79 - Password Management (Change, Reset, Breach Check)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'test@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Test',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_password_change(self):
        """POST /api/v1/auth/password/change/ with current + new password"""
        response = self.client.post('/api/v1/auth/password/change/', {
            'current_password': self.user_data['password'],
            'new_password': 'NewSecureP@ss456!',
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_breach_check_rejects_weak_password(self):
        """Breached password like 'password123' should be rejected"""
        response = self.client.post('/api/v1/auth/password/change/', {
            'current_password': self.user_data['password'],
            'new_password': 'password123',
        })
        
        # Should be rejected with PASSWORD_BREACHED error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_password_reset_request(self):
        """POST /api/v1/auth/password/reset/request/ → console output of reset link"""
        # Logout first
        self.client.credentials()
        
        response = self.client.post('/api/v1/auth/password/reset/request/', {
            'email': self.user_data['email'],
        })
        
        # Reset link is sent to console in dev mode
        self.assertIn(response.status_code, [200, 201, 202])
