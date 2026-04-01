"""
Organizations Tests (EPIC #80 - Issues #82-83)

B2B multi-tenancy with organizations, members, and invitations.
All endpoints provided by Tenxyte with zero custom code.
"""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class OrganizationsConfigTests(TestCase):
    """Issue #82 - Organizations (B2B) Enable + Seed Org Roles"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'orgowner@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Org',
            'last_name': 'Owner',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_list_org_roles(self):
        """GET /api/v1/auth/org-roles/ → default org roles listed"""
        response = self.client.get('/api/v1/auth/org-roles/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
    
    def test_create_organization(self):
        """POST /api/v1/auth/organizations/ → create org, returns 201 with slug"""
        response = self.client.post('/api/v1/auth/organizations/', {
            'name': 'Test Organization',
            'slug': 'test-org',
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('slug', response.data)
        self.assertEqual(response.data['slug'], 'test-org')


class MemberManagementTests(TestCase):
    """Issue #83 - Member Management & Invitations"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create owner user
        self.owner_data = {
            'email': 'owner@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Owner',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.owner_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.owner_data['email'],
            'password': self.owner_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Create organization
        org_response = self.client.post('/api/v1/auth/organizations/', {
            'name': 'Test Org',
            'slug': 'test-org-members',
        })
        self.org_slug = org_response.data['slug']
    
    def test_list_my_organizations(self):
        """GET /api/v1/auth/organizations/list/ → lists orgs for current user"""
        response = self.client.get('/api/v1/auth/organizations/list/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        
        # Should contain the org we just created
        org_slugs = [org.get('slug') for org in response.data if isinstance(org, dict)]
        self.assertIn(self.org_slug, org_slugs)
    
    def test_list_organization_members(self):
        """GET /api/v1/auth/organizations/members/ with X-Org-Slug header → member list"""
        response = self.client.get(
            '/api/v1/auth/organizations/members/',
            HTTP_X_ORG_SLUG=self.org_slug
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, (list, dict))
    
    def test_send_organization_invitation(self):
        """POST /api/v1/auth/organizations/invitations/ → invitation email to console"""
        response = self.client.post(
            '/api/v1/auth/organizations/invitations/',
            {
                'email': 'newmember@example.com',
                'role': 'member',
            },
            HTTP_X_ORG_SLUG=self.org_slug
        )
        
        # Should return 201 or 200 depending on implementation
        self.assertIn(response.status_code, [200, 201, 202])
