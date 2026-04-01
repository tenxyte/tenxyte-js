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
