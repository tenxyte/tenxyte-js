"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AuthModule: () => AuthModule,
  RbacModule: () => RbacModule,
  SecurityModule: () => SecurityModule,
  TenxyteClient: () => TenxyteClient,
  TenxyteHttpClient: () => TenxyteHttpClient,
  UserModule: () => UserModule
});
module.exports = __toCommonJS(index_exports);

// src/http/client.ts
var TenxyteHttpClient = class {
  baseUrl;
  defaultHeaders;
  // Interceptors
  requestInterceptors = [];
  responseInterceptors = [];
  constructor(options) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers
    };
  }
  // Interceptor Registration
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }
  /**
   * Main request method wrapping fetch
   */
  async request(endpoint, config = {}) {
    const urlStr = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    let urlObj = new URL(urlStr);
    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== void 0 && value !== null) {
          urlObj.searchParams.append(key, String(value));
        }
      });
    }
    let requestContext = {
      url: urlObj.toString(),
      ...config,
      headers: { ...this.defaultHeaders, ...config.headers || {} }
    };
    if (typeof FormData !== "undefined" && requestContext.body instanceof FormData) {
      const headers = requestContext.headers;
      delete headers["Content-Type"];
      delete headers["content-type"];
    } else if (requestContext.body && typeof requestContext.body === "object") {
      const contentType = requestContext.headers["Content-Type"] || "";
      if (contentType.toLowerCase().includes("application/json")) {
        requestContext.body = JSON.stringify(requestContext.body);
      }
    }
    for (const interceptor of this.requestInterceptors) {
      requestContext = await interceptor(requestContext);
    }
    const { url, ...fetchConfig } = requestContext;
    try {
      let response = await fetch(url, fetchConfig);
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response, { url, config: fetchConfig });
      }
      if (!response.ok) {
        throw await this.normalizeError(response);
      }
      if (response.status === 204) {
        return {};
      }
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      if (error && error.code) {
        throw error;
      }
      throw {
        error: error.message || "Network request failed",
        code: "NETWORK_ERROR",
        details: String(error)
      };
    }
  }
  async normalizeError(response) {
    try {
      const body = await response.json();
      return {
        error: body.error || body.detail || "API request failed",
        code: body.code || `HTTP_${response.status}`,
        details: body.details || body,
        retry_after: response.headers.has("Retry-After") ? parseInt(response.headers.get("Retry-After"), 10) : void 0
      };
    } catch (e) {
      return {
        error: `HTTP Error ${response.status}: ${response.statusText}`,
        code: `HTTP_${response.status}`
      };
    }
  }
  // Convenience methods
  get(endpoint, config) {
    return this.request(endpoint, { ...config, method: "GET" });
  }
  post(endpoint, data, config) {
    return this.request(endpoint, { ...config, method: "POST", body: data });
  }
  put(endpoint, data, config) {
    return this.request(endpoint, { ...config, method: "PUT", body: data });
  }
  patch(endpoint, data, config) {
    return this.request(endpoint, { ...config, method: "PATCH", body: data });
  }
  delete(endpoint, config) {
    return this.request(endpoint, { ...config, method: "DELETE" });
  }
};

// src/modules/auth.ts
var AuthModule = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Authenticate user with email and password
   */
  async loginWithEmail(data) {
    return this.client.post("/api/v1/auth/login/email/", data);
  }
  /**
   * Authenticate user with international phone number and password
   */
  async loginWithPhone(data) {
    return this.client.post("/api/v1/auth/login/phone/", data);
  }
  /**
   * Register a new user
   */
  async register(data) {
    return this.client.post("/api/v1/auth/register/", data);
  }
  /**
   * Logout from the current session
   */
  async logout(refreshToken) {
    return this.client.post("/api/v1/auth/logout/", { refresh_token: refreshToken });
  }
  /**
   * Logout from all sessions (revokes all refresh tokens)
   */
  async logoutAll() {
    return this.client.post("/api/v1/auth/logout/all/");
  }
  /**
   * Request a magic link for sign-in
   */
  async requestMagicLink(data) {
    return this.client.post("/api/v1/auth/magic-link/request/", data);
  }
  /**
   * Verify a magic link token
   */
  async verifyMagicLink(token) {
    return this.client.get(`/api/v1/auth/magic-link/verify/`, { params: { token } });
  }
  /**
   * Perform OAuth2 Social Authentication (e.g. Google, GitHub)
   */
  async loginWithSocial(provider, data) {
    return this.client.post(`/api/v1/auth/social/${provider}/`, data);
  }
  /**
   * Handle Social Auth Callback (authorization code flow)
   */
  async handleSocialCallback(provider, code, redirectUri) {
    return this.client.get(`/api/v1/auth/social/${provider}/callback/`, {
      params: { code, redirect_uri: redirectUri }
    });
  }
};

// src/modules/security.ts
var SecurityModule = class {
  constructor(client) {
    this.client = client;
  }
  // --- OTP Verification --- //
  async requestOtp(data) {
    return this.client.post("/api/v1/auth/otp/request/", data);
  }
  async verifyOtpEmail(data) {
    return this.client.post("/api/v1/auth/otp/verify/email/", data);
  }
  async verifyOtpPhone(data) {
    return this.client.post("/api/v1/auth/otp/verify/phone/", data);
  }
  // --- TOTP / 2FA --- //
  async get2FAStatus() {
    return this.client.get("/api/v1/auth/2fa/status/");
  }
  async setup2FA() {
    return this.client.post("/api/v1/auth/2fa/setup/");
  }
  async confirm2FA(totp_code) {
    return this.client.post("/api/v1/auth/2fa/confirm/", { totp_code });
  }
  async disable2FA(totp_code, password) {
    return this.client.post("/api/v1/auth/2fa/disable/", { totp_code, password });
  }
  async regenerateBackupCodes(totp_code) {
    return this.client.post("/api/v1/auth/2fa/backup-codes/", { totp_code });
  }
  // --- Password Management --- //
  async resetPasswordRequest(data) {
    return this.client.post("/api/v1/auth/password/reset/request/", data);
  }
  async resetPasswordConfirm(data) {
    return this.client.post("/api/v1/auth/password/reset/confirm/", data);
  }
  async changePassword(data) {
    return this.client.post("/api/v1/auth/password/change/", data);
  }
  async checkPasswordStrength(data) {
    return this.client.post("/api/v1/auth/password/strength/", data);
  }
  async getPasswordRequirements() {
    return this.client.get("/api/v1/auth/password/requirements/");
  }
  // --- WebAuthn / Passkeys --- //
  async registerWebAuthnBegin() {
    return this.client.post("/api/v1/auth/webauthn/register/begin/");
  }
  async registerWebAuthnComplete(data) {
    return this.client.post("/api/v1/auth/webauthn/register/complete/", data);
  }
  async authenticateWebAuthnBegin(data) {
    return this.client.post("/api/v1/auth/webauthn/authenticate/begin/", data || {});
  }
  async authenticateWebAuthnComplete(data) {
    return this.client.post("/api/v1/auth/webauthn/authenticate/complete/", data);
  }
  async listWebAuthnCredentials() {
    return this.client.get("/api/v1/auth/webauthn/credentials/");
  }
  async deleteWebAuthnCredential(credentialId) {
    return this.client.delete(`/api/v1/auth/webauthn/credentials/${credentialId}/`);
  }
};

// src/utils/jwt.ts
function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    let base64Url = parts[1];
    if (!base64Url) return null;
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const isBrowser = typeof window !== "undefined" && typeof window.atob === "function";
    let jsonPayload;
    if (isBrowser) {
      jsonPayload = decodeURIComponent(
        window.atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
      );
    } else {
      jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    }
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// src/modules/rbac.ts
var RbacModule = class {
  constructor(client) {
    this.client = client;
  }
  cachedToken = null;
  /**
   * Cache a token to use for parameter-less synchronous checks.
   */
  setToken(token) {
    this.cachedToken = token;
  }
  getDecodedToken(token) {
    const t = token || this.cachedToken;
    if (!t) return null;
    return decodeJwt(t);
  }
  // --- Synchronous Checks --- //
  hasRole(role, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.roles) return false;
    return decoded.roles.includes(role);
  }
  hasAnyRole(roles, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.roles) return false;
    return roles.some((r) => decoded.roles.includes(r));
  }
  hasAllRoles(roles, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.roles) return false;
    return roles.every((r) => decoded.roles.includes(r));
  }
  hasPermission(permission, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.permissions) return false;
    return decoded.permissions.includes(permission);
  }
  hasAnyPermission(permissions, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.permissions) return false;
    return permissions.some((p) => decoded.permissions.includes(p));
  }
  hasAllPermissions(permissions, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.permissions) return false;
    return permissions.every((p) => decoded.permissions.includes(p));
  }
  // --- Roles CRUD --- //
  async listRoles() {
    return this.client.get("/api/v1/auth/roles/");
  }
  async createRole(data) {
    return this.client.post("/api/v1/auth/roles/", data);
  }
  async getRole(roleId) {
    return this.client.get(`/api/v1/auth/roles/${roleId}/`);
  }
  async updateRole(roleId, data) {
    return this.client.put(`/api/v1/auth/roles/${roleId}/`, data);
  }
  async deleteRole(roleId) {
    return this.client.delete(`/api/v1/auth/roles/${roleId}/`);
  }
  // --- Role Permissions Management --- //
  async getRolePermissions(roleId) {
    return this.client.get(`/api/v1/auth/roles/${roleId}/permissions/`);
  }
  async addPermissionsToRole(roleId, permission_codes) {
    return this.client.post(`/api/v1/auth/roles/${roleId}/permissions/`, { permission_codes });
  }
  async removePermissionsFromRole(roleId, permission_codes) {
    return this.client.delete(`/api/v1/auth/roles/${roleId}/permissions/`, {
      // Note: DELETE request with body is supported via our fetch wrapper if enabled,
      // or we might need to rely on query strings. The schema specifies body or query.
      // Let's pass it in body via a custom config or URL params.
      body: { permission_codes }
    });
  }
  // --- Permissions CRUD --- //
  async listPermissions() {
    return this.client.get("/api/v1/auth/permissions/");
  }
  async createPermission(data) {
    return this.client.post("/api/v1/auth/permissions/", data);
  }
  async getPermission(permissionId) {
    return this.client.get(`/api/v1/auth/permissions/${permissionId}/`);
  }
  async updatePermission(permissionId, data) {
    return this.client.put(`/api/v1/auth/permissions/${permissionId}/`, data);
  }
  async deletePermission(permissionId) {
    return this.client.delete(`/api/v1/auth/permissions/${permissionId}/`);
  }
  // --- Direct Assignment (Users) --- //
  async assignRoleToUser(userId, roleCode) {
    return this.client.post(`/api/v1/auth/users/${userId}/roles/`, { role_code: roleCode });
  }
  async removeRoleFromUser(userId, roleCode) {
    return this.client.delete(`/api/v1/auth/users/${userId}/roles/`, {
      params: { role_code: roleCode }
    });
  }
  async assignPermissionsToUser(userId, permissionCodes) {
    return this.client.post(`/api/v1/auth/users/${userId}/permissions/`, { permission_codes: permissionCodes });
  }
  async removePermissionsFromUser(userId, permissionCodes) {
    return this.client.delete(`/api/v1/auth/users/${userId}/permissions/`, {
      body: { permission_codes: permissionCodes }
    });
  }
};

// src/modules/user.ts
var UserModule = class {
  constructor(client) {
    this.client = client;
  }
  // --- Standard Profile Actions --- //
  async getProfile() {
    return this.client.get("/api/v1/auth/me/");
  }
  async updateProfile(data) {
    return this.client.patch("/api/v1/auth/me/", data);
  }
  /**
   * Upload an avatar using FormData.
   * Ensure the environment supports FormData (browser or Node.js v18+).
   * @param formData The FormData object containing the 'avatar' field.
   */
  async uploadAvatar(formData) {
    return this.client.patch("/api/v1/auth/me/", formData);
  }
  async deleteAccount(password, otpCode) {
    return this.client.post("/api/v1/auth/request-account-deletion/", {
      password,
      otp_code: otpCode
    });
  }
  // --- Admin Actions Mapping --- //
  async listUsers(params) {
    return this.client.get("/api/v1/auth/admin/users/", { params });
  }
  async getUser(userId) {
    return this.client.get(`/api/v1/auth/admin/users/${userId}/`);
  }
  async adminUpdateUser(userId, data) {
    return this.client.patch(`/api/v1/auth/admin/users/${userId}/`, data);
  }
  async adminDeleteUser(userId) {
    return this.client.delete(`/api/v1/auth/admin/users/${userId}/`);
  }
  async banUser(userId, reason = "") {
    return this.client.post(`/api/v1/auth/admin/users/${userId}/ban/`, { reason });
  }
  async unbanUser(userId) {
    return this.client.post(`/api/v1/auth/admin/users/${userId}/unban/`);
  }
  async lockUser(userId, durationMinutes = 30, reason = "") {
    return this.client.post(`/api/v1/auth/admin/users/${userId}/lock/`, { duration_minutes: durationMinutes, reason });
  }
  async unlockUser(userId) {
    return this.client.post(`/api/v1/auth/admin/users/${userId}/unlock/`);
  }
};

// src/client.ts
var TenxyteClient = class {
  http;
  auth;
  security;
  rbac;
  user;
  constructor(options) {
    this.http = new TenxyteHttpClient(options);
    this.auth = new AuthModule(this.http);
    this.security = new SecurityModule(this.http);
    this.rbac = new RbacModule(this.http);
    this.user = new UserModule(this.http);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuthModule,
  RbacModule,
  SecurityModule,
  TenxyteClient,
  TenxyteHttpClient,
  UserModule
});
//# sourceMappingURL=index.cjs.map