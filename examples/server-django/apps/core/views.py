from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint for monitoring and load balancers.
    """
    return Response({
        'status': 'healthy',
        'service': 'tenxyte-django-server',
    }, status=status.HTTP_200_OK)
