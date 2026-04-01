# Server Django Tests

Automated tests for EPICs #70 (Authentication & Sessions), #75 (Security), and #80 (RBAC & Organizations).

## Running Tests

### With Docker Compose

```bash
docker-compose exec server pytest
```

### Local Development

```bash
# Ensure MongoDB and Redis are running
docker-compose up -d mongodb redis

# Activate virtual environment
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::EmailAuthTests::test_register

# Run with coverage
pytest --cov=apps --cov=server
```

## Test Coverage

### EPIC #70 — Authentication & Sessions

**Issue #71** — Email Registration & Login
- ✅ `test_register` — POST /api/v1/auth/register/
- ✅ `test_login_email` — POST /api/v1/auth/login/email/
- ✅ `test_me_endpoint` — GET /api/v1/auth/me/
- ✅ `test_token_refresh` — POST /api/v1/auth/token/refresh/

**Issue #72** — Magic Link (Passwordless)
- ✅ `test_magic_link_request` — POST /api/v1/auth/magic-link/request/

**Issue #73** — Google OAuth2 (PKCE)
- ✅ `test_google_oauth_endpoint_exists` — POST /api/v1/auth/social/google/ (endpoint verification)

**Issue #74** — JWT Refresh + Logout
- ✅ `test_logout` — POST /api/v1/auth/logout/
- ✅ `test_logout_all` — POST /api/v1/auth/logout/all/

### EPIC #75 — Security

**Issue #76** — TOTP 2FA
- ✅ `test_2fa_setup` — POST /api/v1/auth/2fa/setup/
- ✅ `test_backup_codes` — GET /api/v1/auth/2fa/backup-codes/

**Issue #77** — OTP (Email Verification)
- ✅ `test_otp_request` — POST /api/v1/auth/otp/request/

**Issue #78** — Passkeys / WebAuthn (FIDO2)
- ✅ `test_webauthn_register_begin` — POST /api/v1/auth/webauthn/register/begin/
- ✅ `test_webauthn_authenticate_begin` — POST /api/v1/auth/webauthn/authenticate/begin/

**Issue #79** — Password Management
- ✅ `test_password_change` — POST /api/v1/auth/password/change/
- ✅ `test_breach_check_rejects_weak_password` — Breach check validation
- ✅ `test_password_reset_request` — POST /api/v1/auth/password/reset/request/

### EPIC #80 — RBAC & Organizations

**Issue #81** — Global RBAC Seeding
- ✅ `test_list_permissions` — GET /api/v1/auth/permissions/
- ✅ `test_list_roles` — GET /api/v1/auth/roles/
- ✅ `test_get_my_roles` — GET /api/v1/auth/me/roles/

**Issue #82** — Organizations (B2B) Enable + Seed Org Roles
- ✅ `test_list_org_roles` — GET /api/v1/auth/org-roles/
- ✅ `test_create_organization` — POST /api/v1/auth/organizations/

**Issue #83** — Member Management & Invitations
- ✅ `test_list_my_organizations` — GET /api/v1/auth/organizations/list/
- ✅ `test_list_organization_members` — GET /api/v1/auth/organizations/members/
- ✅ `test_send_organization_invitation` — POST /api/v1/auth/organizations/invitations/

**Issue #84** — Org-Scoped RBAC on Custom Views
- ✅ `test_org_info_without_org_header` — GET /api/v1/org-info/ (missing header)
- ✅ `test_org_info_with_valid_org` — GET /api/v1/org-info/ (with X-Org-Slug)
- ✅ `test_org_info_with_invalid_org` — GET /api/v1/org-info/ (invalid org)

### EPIC #85 — Admin, Audit & Applications

**Issue #86** — Dashboard Stats
- ✅ `test_dashboard_stats` — GET /api/v1/auth/dashboard/stats/
- ✅ `test_security_stats` — GET /api/v1/auth/dashboard/security-stats/
- ✅ `test_dashboard_stats_with_compare` — GET /api/v1/auth/dashboard/stats/?compare=true

**Issue #87** — Audit Logs
- ✅ `test_list_audit_logs` — GET /api/v1/auth/audit-logs/
- ✅ `test_audit_logs_filter_by_action` — GET /api/v1/auth/audit-logs/?action=login_failed
- ✅ `test_audit_logs_ordering` — GET /api/v1/auth/audit-logs/?ordering=-created_at
- ✅ `test_audit_logs_pagination` — GET /api/v1/auth/audit-logs/?page=2

**Issue #88** — Token (Session) Management
- ✅ `test_list_tokens` — GET /api/v1/auth/tokens/

**Issue #89** — Applications CRUD (API Keys)
- ✅ `test_list_applications` — GET /api/v1/auth/applications/
- ✅ `test_create_application` — POST /api/v1/auth/applications/
- ✅ `test_patch_application` — PATCH /api/v1/auth/applications/{id}/

## Notes

- All endpoints are provided by Tenxyte with **zero custom code** (except Issue #84 demo view)
- Tests verify configuration is correct
- Magic links and password reset links are printed to console in development mode
- Google OAuth2 (Issue #73) requires manual testing with real Google credentials and browser
- WebAuthn (Issue #78) requires browser testing with HTTPS or localhost exception
- Org-scoped views require `X-Org-Slug` header and appropriate permissions
- Admin endpoints (dashboard, audit logs, tokens, applications) require specific permissions
