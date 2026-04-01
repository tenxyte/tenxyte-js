"""
Authentication & Sessions Tests (EPIC #70)

All endpoints are provided by Tenxyte with zero custom code.
These tests verify the configuration is correct.
"""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class EmailAuthTests(TestCase):
    """Issue #71 - Email Registration & Login"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'test@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Test',
            'last_name': 'User',
        }
    
    def test_register(self):
        """POST /api/v1/auth/register/ → 201 with user object"""
        response = self.client.post('/api/v1/auth/register/', self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['email'], self.user_data['email'])
    
    def test_login_email(self):
        """POST /api/v1/auth/login/email/ → 200 with access_token + refresh_token"""
        self.client.post('/api/v1/auth/register/', self.user_data)
        
        response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', response.data)
        self.assertIn('refresh_token', response.data)
    
    def test_me_endpoint(self):
        """GET /api/v1/auth/me/ with Authorization: Bearer <token> → 200"""
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        
        token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user_data['email'])
    
    def test_token_refresh(self):
        """POST /api/v1/auth/token/refresh/ → new access_token"""
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        
        refresh_token = login_response.data['refresh_token']
        response = self.client.post('/api/v1/auth/token/refresh/', {
            'refresh_token': refresh_token,
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', response.data)


class MagicLinkTests(TestCase):
    """Issue #72 - Magic Link (Passwordless)"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_magic_link_request(self):
        """POST /api/v1/auth/magic-link/request/ → console prints magic link URL"""
        response = self.client.post('/api/v1/auth/magic-link/request/', {
            'email': 'user@example.com',
        })
        
        # Magic link is sent to console in dev mode
        self.assertIn(response.status_code, [200, 201, 202])


class JWTRefreshLogoutTests(TestCase):
    """Issue #74 - JWT Refresh + Logout / Logout All"""
    
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
        self.refresh_token = login_response.data['refresh_token']
    
    def test_logout(self):
        """POST /api/v1/auth/logout/ → access token blacklisted"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.post('/api/v1/auth/logout/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Subsequent request should return 401
        me_response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(me_response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_all(self):
        """POST /api/v1/auth/logout/all/ → all refresh tokens revoked"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.post('/api/v1/auth/logout/all/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
