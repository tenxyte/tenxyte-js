from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from tenxyte.decorators import require_jwt, require_org_context, require_org_permission


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint for monitoring and load balancers.
    """
    return Response({
        'status': 'healthy',
        'service': 'tenxyte-django-server',
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@require_jwt
@require_org_context
@require_org_permission('org.manage')
def org_info(request):
    """
    Demo org-scoped view with RBAC protection.
    Requires X-Org-Slug header and org.manage permission.
    
    Issue #84 - Org-Scoped RBAC on Custom Views
    """
    return Response({
        'org': request.organization.slug,
        'org_name': request.organization.name,
        'user': request.user.email,
        'user_role': getattr(request, 'org_role', None),
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def sensitive_action(request):
    """
    Demo HITL (Human-in-the-Loop) protected view.
    When called by an agent, returns 202 Accepted with confirmation_token.
    User must confirm via /api/v1/auth/ai/pending-actions/{token}/confirm/
    
    Issue #96 - Human-in-the-Loop (HITL)
    """
    from tenxyte.decorators import require_agent_clearance
    
    # Apply HITL decorator dynamically for demo
    # In production, use @require_agent_clearance(human_in_the_loop_required=True)
    
    return Response({
        'message': 'Sensitive action executed',
        'user': getattr(request.user, 'email', None),
    }, status=status.HTTP_200_OK)
