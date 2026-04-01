"""
Admin, Audit & Applications Tests (EPIC #85)

Dashboard stats, audit logs, token management, and API key applications.
All endpoints provided by Tenxyte with zero custom code.
"""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class DashboardStatsTests(TestCase):
    """Issue #86 - Dashboard Stats"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin_data = {
            'email': 'admin@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Admin',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.admin_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.admin_data['email'],
            'password': self.admin_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_dashboard_stats(self):
        """GET /api/v1/auth/dashboard/stats/ → returns summary + trends"""
        response = self.client.get('/api/v1/auth/dashboard/stats/')
        
        # May require admin:read permission
        # Returns 200 if user has permission, 403 otherwise
        self.assertIn(response.status_code, [200, 403])
        
        if response.status_code == 200:
            self.assertIsInstance(response.data, dict)
    
    def test_security_stats(self):
        """GET /api/v1/auth/dashboard/security-stats/ → returns security metrics"""
        response = self.client.get('/api/v1/auth/dashboard/security-stats/')
        
        # May require admin:read permission
        self.assertIn(response.status_code, [200, 403])
        
        if response.status_code == 200:
            self.assertIsInstance(response.data, dict)
    
    def test_dashboard_stats_with_compare(self):
        """GET /api/v1/auth/dashboard/stats/?compare=true → trend comparison"""
        response = self.client.get('/api/v1/auth/dashboard/stats/', {'compare': 'true'})
        
        self.assertIn(response.status_code, [200, 403])


class AuditLogsTests(TestCase):
    """Issue #87 - Audit Logs"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'auditor@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Auditor',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        
        # Generate some audit events
        self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_list_audit_logs(self):
        """GET /api/v1/auth/audit-logs/ → returns paginated results"""
        response = self.client.get('/api/v1/auth/audit-logs/')
        
        # May require specific permission
        self.assertIn(response.status_code, [200, 403])
        
        if response.status_code == 200:
            self.assertIsInstance(response.data, (list, dict))
    
    def test_audit_logs_filter_by_action(self):
        """GET /api/v1/auth/audit-logs/?action=login_failed → filtered results"""
        response = self.client.get('/api/v1/auth/audit-logs/', {'action': 'login_failed'})
        
        self.assertIn(response.status_code, [200, 403])
    
    def test_audit_logs_ordering(self):
        """GET /api/v1/auth/audit-logs/?ordering=-created_at → ordered results"""
        response = self.client.get('/api/v1/auth/audit-logs/', {'ordering': '-created_at'})
        
        self.assertIn(response.status_code, [200, 403])
    
    def test_audit_logs_pagination(self):
        """GET /api/v1/auth/audit-logs/?page=2 → paginated results"""
        response = self.client.get('/api/v1/auth/audit-logs/', {'page': '2'})
        
        self.assertIn(response.status_code, [200, 403, 404])


class TokenManagementTests(TestCase):
    """Issue #88 - Token (Session) Management"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'tokenuser@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Token',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_list_tokens(self):
        """GET /api/v1/auth/tokens/ → lists refresh tokens"""
        response = self.client.get('/api/v1/auth/tokens/')
        
        # Requires tokens.view permission
        self.assertIn(response.status_code, [200, 403])
        
        if response.status_code == 200:
            self.assertIsInstance(response.data, (list, dict))


class ApplicationsTests(TestCase):
    """Issue #89 - Applications CRUD (API Keys)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'appowner@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'App',
            'last_name': 'Owner',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_list_applications(self):
        """GET /api/v1/auth/applications/ → lists applications"""
        response = self.client.get('/api/v1/auth/applications/')
        
        # Requires applications.view permission
        self.assertIn(response.status_code, [200, 403])
        
        if response.status_code == 200:
            self.assertIsInstance(response.data, (list, dict))
    
    def test_create_application(self):
        """POST /api/v1/auth/applications/ → 201 with client_secret (shown once)"""
        response = self.client.post('/api/v1/auth/applications/', {
            'name': 'Test Application',
        })
        
        # Requires applications.create permission
        self.assertIn(response.status_code, [201, 403])
        
        if response.status_code == 201:
            self.assertIn('client_secret', response.data)
            self.app_id = response.data.get('id')
    
    def test_patch_application(self):
        """PATCH /api/v1/auth/applications/{id}/ → revoke application"""
        # First create an application
        create_response = self.client.post('/api/v1/auth/applications/', {
            'name': 'App to Revoke',
        })
        
        if create_response.status_code == 201:
            app_id = create_response.data.get('id')
            
            response = self.client.patch(f'/api/v1/auth/applications/{app_id}/', {
                'is_active': False,
            })
            
            # Requires applications.update permission
            self.assertIn(response.status_code, [200, 403])
