"""
Django settings for server project.
"""

from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')

DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'apps.core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'server.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'server.wsgi.application'

# MongoDB Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django_mongodb_backend',
        'NAME': config('MONGODB_DB', default='tenxyte_db'),
        'HOST': config('MONGODB_URI', default='mongodb://localhost:27017'),
    }
}

DEFAULT_AUTO_FIELD = 'django_mongodb_backend.fields.ObjectIdAutoField'

# Disable incompatible migrations for MongoDB
MIGRATION_MODULES = {
    'contenttypes': None,
    'auth': None,
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = 'static/'

# Celery Configuration
CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# DRF Configuration
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# DRF Spectacular Configuration
SPECTACULAR_SETTINGS = {
    'TITLE': 'Tenxyte Django Server Example API',
    'DESCRIPTION': 'Production-ready Django API backend powered by Tenxyte',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Tenxyte Configuration
import tenxyte

TENXYTE_JWT_SECRET_KEY = config('TENXYTE_JWT_SECRET_KEY', default=None)
TENXYTE_SHORTCUT_SECURE_MODE = config('TENXYTE_SECURE_MODE', default='development')
TENXYTE_ORGANIZATIONS_ENABLED = True
TENXYTE_AUDIT_LOGGING_ENABLED = True
TENXYTE_MAGIC_LINK_ENABLED = True
TENXYTE_WEBAUTHN_ENABLED = True
TENXYTE_BREACH_CHECK_ENABLED = True
TENXYTE_AIRS_ENABLED = True
TENXYTE_AIRS_BUDGET_TRACKING_ENABLED = True
TENXYTE_AIRS_REDACT_PII = True
TENXYTE_TOTP_ISSUER = 'TenxyteExample'
TENXYTE_EMAIL_BACKEND = 'tenxyte.backends.email.ConsoleBackend'

# CORS Configuration
TENXYTE_CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
TENXYTE_CORS_ALLOW_CREDENTIALS = True
TENXYTE_MAGIC_LINK_BASE_URL = config('TENXYTE_MAGIC_LINK_BASE_URL', default='http://localhost:5173')

# Bootstrap Tenxyte (must be at the end)
tenxyte.setup(globals())
