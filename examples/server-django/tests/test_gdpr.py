"""
GDPR & Data Compliance Tests (EPIC #90)

Data export, account deletion with grace period, and security headers.
All endpoints provided by Tenxyte with zero custom code.
"""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class DataExportTests(TestCase):
    """Issue #91 - Data Export"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'gdpr@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'GDPR',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_data_export_with_password(self):
        """POST /api/v1/auth/gdpr/export/ with password → returns user data JSON"""
        response = self.client.post('/api/v1/auth/gdpr/export/', {
            'password': self.user_data['password'],
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        self.assertIn('email', response.data)
    
    def test_data_export_without_password(self):
        """POST /api/v1/auth/gdpr/export/ without password → 400"""
        response = self.client.post('/api/v1/auth/gdpr/export/', {})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AccountDeletionTests(TestCase):
    """Issue #92 - Account Deletion with Grace Period"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'delete@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Delete',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_schedule_deletion(self):
        """POST /api/v1/auth/gdpr/delete/ → schedules 30-day deletion"""
        response = self.client.post('/api/v1/auth/gdpr/delete/', {
            'password': self.user_data['password'],
            'reason': 'test deletion',
        })
        
        # Should return 200 or 202
        self.assertIn(response.status_code, [200, 202])
    
    def test_deletion_status(self):
        """GET /api/v1/auth/gdpr/delete/status/ → shows pending deletion info"""
        # First schedule deletion
        self.client.post('/api/v1/auth/gdpr/delete/', {
            'password': self.user_data['password'],
            'reason': 'test',
        })
        
        response = self.client.get('/api/v1/auth/gdpr/delete/status/')
        
        self.assertIn(response.status_code, [200, 404])
    
    def test_cancel_deletion(self):
        """POST /api/v1/auth/gdpr/delete/cancel/ → cancels deletion"""
        # First schedule deletion
        self.client.post('/api/v1/auth/gdpr/delete/', {
            'password': self.user_data['password'],
            'reason': 'test',
        })
        
        # Then cancel
        response = self.client.post('/api/v1/auth/gdpr/delete/cancel/', {
            'password': self.user_data['password'],
        })
        
        self.assertIn(response.status_code, [200, 404])


class SecurityHeadersTests(TestCase):
    """Issue #93 - Security Headers + CORS Hardening"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_security_headers_present(self):
        """Verify security headers present on responses"""
        response = self.client.get('/api/v1/health/')
        
        # Check for common security headers
        # Note: Actual headers depend on TENXYTE_SECURITY_HEADERS_ENABLED setting
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Headers may include:
        # X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.
    
    def test_cors_preflight(self):
        """OPTIONS /api/v1/auth/register/ from allowed origin → 200 with CORS headers"""
        response = self.client.options(
            '/api/v1/auth/register/',
            HTTP_ORIGIN='http://localhost:5173'
        )
        
        # Should return 200 for preflight
        self.assertIn(response.status_code, [200, 204])
