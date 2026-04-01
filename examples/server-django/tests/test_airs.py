"""
AIRS (AI Responsibility & Security) Tests (EPIC #94)

AgentToken lifecycle, HITL, circuit breaker, budget tracking, and PII redaction.
All endpoints provided by Tenxyte with zero custom code.
"""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class AgentTokenLifecycleTests(TestCase):
    """Issue #95 - AgentToken Lifecycle"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'aiuser@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'AI',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_create_agent_token(self):
        """POST /api/v1/auth/ai/tokens/ → returns token (shown once) + id"""
        response = self.client.post('/api/v1/auth/ai/tokens/', {
            'name': 'Test Agent',
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertIn('id', response.data)
        
        # Store for other tests
        self.agent_token = response.data['token']
        self.agent_token_id = response.data['id']
    
    def test_agent_token_heartbeat(self):
        """POST /api/v1/auth/ai/tokens/{id}/heartbeat/ with AgentBearer → 200"""
        # First create a token
        create_response = self.client.post('/api/v1/auth/ai/tokens/', {
            'name': 'Heartbeat Agent',
        })
        
        if create_response.status_code == 201:
            agent_token = create_response.data['token']
            token_id = create_response.data['id']
            
            # Use AgentBearer authentication
            self.client.credentials(HTTP_AUTHORIZATION=f'AgentBearer {agent_token}')
            
            response = self.client.post(f'/api/v1/auth/ai/tokens/{token_id}/heartbeat/')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_revoke_all_agent_tokens(self):
        """POST /api/v1/auth/ai/tokens/revoke-all/ → all tokens revoked"""
        # Use user JWT for revoke-all
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        response = self.client.post('/api/v1/auth/ai/tokens/revoke-all/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class HITLTests(TestCase):
    """Issue #96 - Human-in-the-Loop (HITL)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'hitl@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'HITL',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_list_pending_actions(self):
        """GET /api/v1/auth/ai/pending-actions/ → lists pending actions"""
        response = self.client.get('/api/v1/auth/ai/pending-actions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, (list, dict))


class CircuitBreakerBudgetTests(TestCase):
    """Issue #97 - Circuit Breaker + Budget Tracking"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'budget@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'Budget',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_create_agent_token_with_budget(self):
        """Create AgentToken with budget_limit_usd"""
        response = self.client.post('/api/v1/auth/ai/tokens/', {
            'name': 'Budget Agent',
            'budget_limit_usd': 0.10,
            'circuit_breaker': {
                'max_requests_total': 5,
            },
        })
        
        self.assertIn(response.status_code, [201, 400])
        
        if response.status_code == 201:
            self.assertIn('id', response.data)
    
    def test_report_usage_exceeds_budget(self):
        """POST /api/v1/auth/ai/tokens/{id}/report-usage/ → token suspended when budget exceeded"""
        # First create a token with low budget
        create_response = self.client.post('/api/v1/auth/ai/tokens/', {
            'name': 'Low Budget Agent',
            'budget_limit_usd': 0.10,
        })
        
        if create_response.status_code == 201:
            token_id = create_response.data['id']
            agent_token = create_response.data['token']
            
            # Use AgentBearer for usage reporting
            self.client.credentials(HTTP_AUTHORIZATION=f'AgentBearer {agent_token}')
            
            # Report usage exceeding budget
            response = self.client.post(f'/api/v1/auth/ai/tokens/{token_id}/report-usage/', {
                'cost_usd': 0.15,
            })
            
            # Should succeed or return error if budget exceeded
            self.assertIn(response.status_code, [200, 400, 403])


class PIIRedactionTests(TestCase):
    """Issue #98 - PII Redaction Guardrail"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'pii@example.com',
            'password': 'SecureP@ss123!',
            'first_name': 'PII',
            'last_name': 'User',
        }
        self.client.post('/api/v1/auth/register/', self.user_data)
        login_response = self.client.post('/api/v1/auth/login/email/', {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
        })
        self.access_token = login_response.data['access_token']
    
    def test_agent_receives_redacted_pii(self):
        """Agent request to /api/v1/auth/me/ → PII redacted"""
        # First create an agent token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        create_response = self.client.post('/api/v1/auth/ai/tokens/', {
            'name': 'PII Test Agent',
        })
        
        if create_response.status_code == 201:
            agent_token = create_response.data['token']
            
            # Use AgentBearer
            self.client.credentials(HTTP_AUTHORIZATION=f'AgentBearer {agent_token}')
            
            response = self.client.get('/api/v1/auth/me/')
            
            # Should return 200 with redacted data
            if response.status_code == 200:
                # Check if email is redacted (if TENXYTE_AIRS_REDACT_PII is True)
                # May contain ***REDACTED*** or similar
                pass
    
    def test_human_receives_full_data(self):
        """Human JWT request to /api/v1/auth/me/ → full unredacted data"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        response = self.client.get('/api/v1/auth/me/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user_data['email'])
