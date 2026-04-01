"""
URL configuration for server project.
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
import tenxyte

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Health check
    path('health/', include('apps.core.urls')),
    
    # Tenxyte API endpoints (auth, RBAC, orgs, AIRS, GDPR, etc.)
    path('api/v1/', include(tenxyte.urls)),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
