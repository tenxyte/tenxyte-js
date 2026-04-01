# Tenxyte Django Server Example

Production-ready Django API backend serving the vanilla-ts client, powered by Tenxyte + MongoDB.

## Overview

This server is a thin Django + DRF project. Almost all endpoints (auth, RBAC, organizations, AIRS, GDPR) are provided out-of-the-box by Tenxyte — no custom views are needed for Tenxyte features.

## Technology Stack

- **Language**: Python 3.12+
- **Framework**: Django 5.1 + Django REST Framework
- **Auth SDK**: `tenxyte[mongodb,webauthn]`
- **Database**: MongoDB 7 via `django-mongodb-backend`
- **Task Queue**: Celery 5 + Redis
- **Container**: Docker + Docker Compose v2
- **API Docs**: drf-spectacular (Swagger + ReDoc)

## Quick Start

### 1. Prerequisites

- Docker & Docker Compose v2
- Python 3.12+ (for local development without Docker)

### 2. Setup

```bash
# Clone and navigate
cd examples/server-django

# Copy environment file
cp .env.example .env

# Start all services (MongoDB, Redis, Django, Celery Worker, Celery Beat)
docker-compose up
```

The server will be available at `http://localhost:8000`.

### 3. Initialize Tenxyte

Run the quickstart command to migrate, seed roles, and create the first Application:

```bash
docker-compose exec server python manage.py tenxyte_quickstart --app-name "Vanilla TS Example"
```

**Save the displayed credentials** (`X-Access-Key` and `X-Access-Secret`) — you'll need them in the vanilla-ts client `.env`.

### 4. Create Superuser

```bash
docker-compose exec server python manage.py createsuperuser
```

### 5. Connect Vanilla-TS Client

Update `examples/vanilla-ts/.env`:

```env
VITE_TENXYTE_BASE_URL=http://localhost:8000
VITE_TENXYTE_ACCESS_KEY=<X-Access-Key from quickstart>
VITE_TENXYTE_ACCESS_SECRET=<X-Access-Secret from quickstart>
```

Start the vanilla-ts client:

```bash
cd examples/vanilla-ts
pnpm install
pnpm dev
```

Navigate to `http://localhost:5173` and register/login.

## API Documentation

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

## Project Structure

```
server-django/
├── server/                 # Django project root
│   ├── settings.py        # Configuration + Tenxyte bootstrap
│   ├── urls.py            # URL routing (Tenxyte + health + docs)
│   ├── celery.py          # Celery app configuration
│   ├── wsgi.py            # WSGI entry point
│   └── asgi.py            # ASGI entry point
├── apps/
│   └── core/              # Custom app (health endpoint, future views)
│       ├── views.py       # Health check view
│       ├── urls.py        # Core URL patterns
│       └── tasks.py       # Celery tasks
├── Dockerfile             # Production-ready image
├── docker-compose.yml     # 5 services (MongoDB, Redis, Server, Worker, Beat)
├── requirements.txt       # Python dependencies
├── .env.example           # Environment template
└── README.md              # This file
```

## Available Endpoints

All Tenxyte endpoints are automatically wired via `tenxyte.urls`:

| Category | Endpoints |
|---|---|
| **Auth** | `/api/v1/auth/register/`, `/api/v1/auth/login/email/`, `/api/v1/auth/refresh/`, `/api/v1/auth/logout/`, `/api/v1/auth/magic-link/`, `/api/v1/auth/social/` |
| **Security** | `/api/v1/security/2fa/`, `/api/v1/security/otp/`, `/api/v1/security/webauthn/`, `/api/v1/security/password/` |
| **RBAC** | `/api/v1/rbac/roles/`, `/api/v1/rbac/permissions/`, `/api/v1/rbac/user-roles/` |
| **User** | `/api/v1/user/profile/`, `/api/v1/user/avatar/` |
| **Organizations** | `/api/v1/organizations/`, `/api/v1/organizations/{slug}/members/`, `/api/v1/organizations/{slug}/invitations/` |
| **AIRS** | `/api/v1/ai/agent-tokens/`, `/api/v1/ai/hitl/`, `/api/v1/ai/heartbeat/`, `/api/v1/ai/usage/` |
| **Admin** | `/api/v1/admin/audit-logs/`, `/api/v1/admin/login-attempts/`, `/api/v1/admin/blacklisted-tokens/` |
| **GDPR** | `/api/v1/gdpr/account-deletion/`, `/api/v1/gdpr/data-export/` |
| **Dashboard** | `/api/v1/dashboard/stats/` |
| **Health** | `/health/` |

## Configuration

All Tenxyte configuration is in `server/settings.py`:

```python
# Tenxyte Configuration
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
```

## Development

### Local Development (without Docker)

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run MongoDB and Redis locally or via Docker
docker-compose up mongodb redis

# Update .env with local MongoDB URI
# MONGODB_URI=mongodb://localhost:27017

# Run migrations and quickstart
python manage.py tenxyte_quickstart --app-name "Vanilla TS Example"

# Run development server
python manage.py runserver

# In separate terminals:
celery -A server worker -l info
celery -A server beat -l info
```

### Running Tests

```bash
docker-compose exec server python manage.py test
```

## Production Deployment

1. Set `DEBUG=False` in `.env`
2. Generate a strong `SECRET_KEY` and `TENXYTE_JWT_SECRET_KEY`
3. Set `TENXYTE_SECURE_MODE=production`
4. Configure a production-grade MongoDB instance
5. Use a managed Redis service or Redis cluster
6. Deploy with Gunicorn (already configured in Dockerfile)
7. Set up a reverse proxy (Nginx, Traefik) with TLS
8. Configure proper CORS origins in `TENXYTE_CORS_ALLOWED_ORIGINS`

## Troubleshooting

### MongoDB Connection Error

Ensure MongoDB is running and healthy:

```bash
docker-compose ps mongodb
docker-compose logs mongodb
```

### Celery Tasks Not Running

Check worker and beat logs:

```bash
docker-compose logs worker
docker-compose logs beat
```

### CORS Errors from Frontend

Verify `TENXYTE_CORS_ALLOWED_ORIGINS` includes your frontend URL and `TENXYTE_CORS_ALLOW_CREDENTIALS = True`.

## License

MIT — see root LICENSE file.
