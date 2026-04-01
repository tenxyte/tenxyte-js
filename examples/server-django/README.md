# Tenxyte Django Server Example

Production-ready Django API backend serving the vanilla-ts client, powered by Tenxyte + MongoDB.

## Technology Stack

- **Python 3.12+** / Django 5.1 / Django REST Framework
- **tenxyte\[mongodb,webauthn]** — auth, RBAC, orgs, AIRS, GDPR (zero custom code)
- **MongoDB 7** via django-mongodb-backend
- **Celery 5** + Redis (task queue + periodic jobs)
- **Docker Compose** — 5 services (MongoDB, Redis, Server, Worker, Beat)
- **drf-spectacular** — Swagger UI + ReDoc

## Quick Start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start all services
docker-compose up

# 3. Bootstrap Tenxyte (migrate + seed 4 roles + 47 permissions + create Application)
docker-compose exec server python manage.py tenxyte_quickstart --app-name "Vanilla TS Example"

# 4. Create superuser
docker-compose exec server python manage.py createsuperuser
```

**Save the `X-Access-Key` and `X-Access-Secret`** displayed by `tenxyte_quickstart` — copy them into the vanilla-ts `.env`.

The server is now available at **http://localhost:8000**.

## Local Dev (without Docker)

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start infra only
docker-compose up -d mongodb redis

# Update .env: MONGODB_URI=mongodb://localhost:27017

# Bootstrap + run
python manage.py tenxyte_quickstart --app-name "Vanilla TS Example"
python manage.py runserver

# In separate terminals:
celery -A server worker -l info
celery -A server beat -l info
```

## Connecting the Vanilla-TS Client

Update `examples/vanilla-ts/.env`:

```env
VITE_TENXYTE_BASE_URL=http://localhost:8000
VITE_TENXYTE_ACCESS_KEY=<X-Access-Key from quickstart>
VITE_TENXYTE_ACCESS_SECRET=<X-Access-Secret from quickstart>
```

Then:

```bash
cd examples/vanilla-ts && pnpm install && pnpm dev
```

Navigate to `http://localhost:5173` and register/login.

## Endpoints Overview

All Tenxyte endpoints are wired via `include(tenxyte.urls)`:

| Category | Key Endpoints |
|---|---|
| **Auth** | `POST /api/v1/auth/register/`, `/login/email/`, `/token/refresh/`, `/logout/`, `/magic-link/request/`, `/social/google/` |
| **Security** | `/api/v1/auth/2fa/setup/`, `/otp/request/`, `/webauthn/register/begin/`, `/password/change/` |
| **RBAC** | `GET /api/v1/auth/roles/`, `/permissions/`, `/me/roles/` |
| **Organizations** | `POST /api/v1/auth/organizations/`, `GET /organizations/list/`, `/members/`, `/invitations/` |
| **Admin** | `GET /api/v1/auth/dashboard/stats/`, `/audit-logs/`, `/tokens/`, `/applications/` |
| **GDPR** | `POST /api/v1/auth/gdpr/export/`, `/gdpr/delete/`, `GET /gdpr/delete/status/` |
| **AIRS** | `POST /api/v1/auth/ai/tokens/`, `/ai/tokens/{id}/heartbeat/`, `GET /ai/pending-actions/` |
| **Health** | `GET /api/v1/health/` (public, no auth) |
| **Docs** | `GET /api/v1/docs/` (Swagger), `/api/v1/docs/redoc/` (ReDoc) |

## Bootstrap Commands

| Command | Description |
|---|---|
| `python manage.py tenxyte_quickstart --app-name "..."` | Migrate + seed roles/permissions + create Application (outputs credentials) |
| `python manage.py createsuperuser` | Create admin user |
| `python manage.py tenxyte_cleanup` | Purge expired tokens, audit logs older than 90 days |
| `python manage.py tenxyte_cleanup --dry-run` | Preview cleanup without executing |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DEBUG` | `True` | Set `False` in production |
| `SECRET_KEY` | dev key | Django secret key |
| `TENXYTE_JWT_SECRET_KEY` | (auto) | JWT signing key; **required in production** |
| `TENXYTE_SECURE_MODE` | `development` | `development` / `medium` / `robust` |
| `TENXYTE_MAGIC_LINK_BASE_URL` | `http://localhost:5173` | Frontend URL for magic link redirects |
| `MONGODB_URI` | `mongodb://mongodb:27017` | MongoDB connection string |
| `MONGODB_DB` | `tenxyte_db` | Database name |
| `REDIS_URL` | `redis://redis:6379/0` | Celery broker + result backend |
| `DJANGO_BASE_URL` | `http://localhost:8000` | Public server URL |
| `GOOGLE_CLIENT_ID` | (empty) | Google OAuth2 client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | (empty) | Google OAuth2 client secret (optional) |

## Project Structure

```
server-django/
├── server/                 # Django project root
│   ├── settings.py        # Configuration + Tenxyte bootstrap
│   ├── urls.py            # URL routing (Tenxyte + health + docs)
│   ├── celery.py          # Celery app configuration
│   ├── wsgi.py / asgi.py  # Entry points
│   └── __init__.py        # Celery app import
├── apps/core/
│   ├── views.py           # Health check + org-info + HITL demo views
│   ├── urls.py            # Core URL patterns
│   └── tasks.py           # Celery tasks (cleanup, example)
├── tests/                  # Test suite (auth, security, RBAC, orgs, admin, GDPR, AIRS)
├── docker-compose.yml     # 5 services (MongoDB, Redis, Server, Worker, Beat)
├── Dockerfile             # Production-ready image (Gunicorn)
├── requirements.txt       # Python dependencies
├── .env.example           # All env vars with inline comments
└── README.md              # This file
```

## Troubleshooting

- **MongoDB connection error** → `docker-compose ps mongodb` + `docker-compose logs mongodb`
- **Celery tasks not running** → `docker-compose logs worker` + `docker-compose logs beat`
- **CORS errors** → Verify `TENXYTE_CORS_ALLOWED_ORIGINS` includes your frontend URL

## License

MIT — see root LICENSE file.
