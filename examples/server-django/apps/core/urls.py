from django.urls import path
from . import views

urlpatterns = [
    path('', views.health_check, name='health_check'),
    path('org-info/', views.org_info, name='org_info'),
    path('sensitive-action/', views.sensitive_action, name='sensitive_action'),
]
