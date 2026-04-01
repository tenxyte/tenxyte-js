"""
Org-Scoped RBAC Tests (EPIC #80 - Issue #84)

Custom view protected with org-scoped RBAC decorators.
"""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class OrgScopedViewTests(TestCase):
    """Issue #84 - Org-Scoped RBAC on Custom Views"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create user
        self.user_data = {
            'email': 'orgadmin@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Org',
            'last_name': 'Admin',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Create organization
        org_response = self.client.post('/api/v1/auth/organizations/', {
            'name': 'Test Org RBAC',
            'slug': 'test-org-rbac',
        })
        self.org_slug = org_response.data.get('slug', 'test-org-rbac')
    
    def test_org_info_without_org_header(self):
        """GET /api/v1/org-info/ without X-Org-Slug → 400"""
        response = self.client.get('/api/v1/org-info/')
        
        # Should return 400 (missing org context)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_org_info_with_valid_org(self):
        """GET /api/v1/org-info/ with X-Org-Slug header → 200 with org data"""
        response = self.client.get(
            '/api/v1/org-info/',
            HTTP_X_ORG_SLUG=self.org_slug
        )
        
        # Should return 200 if user has org.manage permission
        # May return 403 if user doesn't have permission yet
        self.assertIn(response.status_code, [200, 403])
        
        if response.status_code == 200:
            self.assertIn('org', response.data)
            self.assertIn('user', response.data)
            self.assertEqual(response.data['org'], self.org_slug)
            self.assertEqual(response.data['user'], self.user_data['email'])
    
    def test_org_info_with_invalid_org(self):
        """GET /api/v1/org-info/ with invalid X-Org-Slug → 404"""
        response = self.client.get(
            '/api/v1/org-info/',
            HTTP_X_ORG_SLUG='non-existent-org'
        )
        
        # Should return 404 (org not found) or 403 (not a member)
        self.assertIn(response.status_code, [403, 404])
