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
   * Authenticate a user with their email and password.
   * @param data - The login credentials and optional TOTP code if 2FA is required.
   * @returns A pair of Access and Refresh tokens upon successful authentication.
   * @throws {TenxyteError} If credentials are invalid, or if `2FA_REQUIRED` without a valid `totp_code`.
   */
  async loginWithEmail(data) {
    return this.client.post("/api/v1/auth/login/email/", data);
  }
  /**
   * Authenticate a user with an international phone number and password.
   * @param data - The login credentials and optional TOTP code if 2FA is required.
   * @returns A pair of Access and Refresh tokens.
   */
  async loginWithPhone(data) {
    return this.client.post("/api/v1/auth/login/phone/", data);
  }
  /**
   * Registers a new user account.
   * @param data - The registration details (email, password, etc.).
   * @returns The registered user data or a confirmation message.
   */
  async register(data) {
    return this.client.post("/api/v1/auth/register/", data);
  }
  /**
   * Logout from the current session.
   * Informs the backend to immediately revoke the specified refresh token.
   * @param refreshToken - The refresh token to revoke.
   */
  async logout(refreshToken) {
    return this.client.post("/api/v1/auth/logout/", { refresh_token: refreshToken });
  }
  /**
   * Logout from all sessions across all devices.
   * Revokes all refresh tokens currently assigned to the user.
   */
  async logoutAll() {
    return this.client.post("/api/v1/auth/logout/all/");
  }
  /**
   * Request a Magic Link for passwordless sign-in.
   * @param data - The email to send the logic link to.
   */
  async requestMagicLink(data) {
    return this.client.post("/api/v1/auth/magic-link/request/", data);
  }
  /**
   * Verifies a magic link token extracted from the URL.
   * @param token - The cryptographic token received via email.
   * @returns A session token pair if the token is valid and unexpired.
   */
  async verifyMagicLink(token) {
    return this.client.get(`/api/v1/auth/magic-link/verify/`, { params: { token } });
  }
  /**
   * Submits OAuth2 Social Authentication payloads to the backend.
   * Can be used with native mobile SDK tokens (like Apple Sign-In JWTs).
   * @param provider - The OAuth provider ('google', 'github', etc.)
   * @param data - The OAuth tokens (access_token, id_token, etc.)
   * @returns An active session token pair.
   */
  async loginWithSocial(provider, data) {
    return this.client.post(`/api/v1/auth/social/${provider}/`, data);
  }
  /**
   * Handle Social Auth Callbacks (Authorization Code flow).
   * @param provider - The OAuth provider ('google', 'github', etc.)
   * @param code - The authorization code retrieved from the query string parameters.
   * @param redirectUri - The original redirect URI that was requested.
   * @returns An active session token pair after successful code exchange.
   */
  async handleSocialCallback(provider, code, redirectUri) {
    return this.client.get(`/api/v1/auth/social/${provider}/callback/`, {
      params: { code, redirect_uri: redirectUri }
    });
  }
};

// src/utils/base64url.ts
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - base64.length % 4) % 4;
  const padded = base64 + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// src/modules/security.ts
var SecurityModule = class {
  constructor(client) {
    this.client = client;
  }
  // ─── 2FA (TOTP) Management ───
  /**
   * Get the current 2FA status for the authenticated user.
   * @returns Information about whether 2FA is enabled and how many backup codes remain.
   */
  async get2FAStatus() {
    return this.client.get("/api/v1/auth/2fa/status/");
  }
  /**
   * Start the 2FA enrollment process.
   * @returns The secret key and QR code URL to be scanned by an Authenticator app.
   */
  async setup2FA() {
    return this.client.post("/api/v1/auth/2fa/setup/");
  }
  /**
   * Confirm the 2FA setup by providing the first TOTP code generated by the Authenticator app.
   * @param totpCode - The 6-digit code.
   */
  async confirm2FA(totpCode) {
    return this.client.post("/api/v1/auth/2fa/confirm/", { totp_code: totpCode });
  }
  /**
   * Disable 2FA for the current user.
   * Usually requires re-authentication or providing the active password/totp code.
   * @param totpCode - The current 6-digit code to verify intent.
   * @param password - (Optional) The user's password if required by backend policy.
   */
  async disable2FA(totpCode, password) {
    return this.client.post("/api/v1/auth/2fa/disable/", { totp_code: totpCode, password });
  }
  /**
   * Invalidate old backup codes and explicitly generate a new batch.
   * @param totpCode - An active TOTP code to verify intent.
   */
  async regenerateBackupCodes(totpCode) {
    return this.client.post("/api/v1/auth/2fa/backup-codes/", { totp_code: totpCode });
  }
  // ─── Verification OTP (Email / Phone) ───
  /**
   * Request an OTP code to be dispatched to the user's primary contact method.
   * @param type - The channel type ('email' or 'phone').
   */
  async requestOtp(type) {
    return this.client.post("/api/v1/auth/otp/request/", { type: type === "email" ? "email_verification" : "phone_verification" });
  }
  /**
   * Verify an email confirmation OTP.
   * @param code - The numeric code received via email.
   */
  async verifyOtpEmail(code) {
    return this.client.post("/api/v1/auth/otp/verify/email/", { code });
  }
  /**
   * Verify a phone confirmation OTP (SMS dispatch).
   * @param code - The numeric code received via SMS.
   */
  async verifyOtpPhone(code) {
    return this.client.post("/api/v1/auth/otp/verify/phone/", { code });
  }
  // ─── Password Sub-module ───
  /**
   * Triggers a password reset flow, dispatching an OTP to the target.
   * @param target - Either an email address or a phone configuration payload.
   */
  async resetPasswordRequest(target) {
    return this.client.post("/api/v1/auth/password/reset/request/", target);
  }
  /**
   * Confirm a password reset using the OTP dispatched by `resetPasswordRequest`.
   * @param data - The OTP code and the new matching password fields.
   */
  async resetPasswordConfirm(data) {
    return this.client.post("/api/v1/auth/password/reset/confirm/", data);
  }
  /**
   * Change password for an already authenticated user.
   * @param currentPassword - The existing password to verify intent.
   * @param newPassword - The distinct new password.
   */
  async changePassword(currentPassword, newPassword) {
    return this.client.post("/api/v1/auth/password/change/", {
      current_password: currentPassword,
      new_password: newPassword
    });
  }
  /**
   * Evaluate the strength of a potential password against backend policies.
   * @param password - The password string to test.
   * @param email - (Optional) The user's email to ensure the password doesn't contain it.
   */
  async checkPasswordStrength(password, email) {
    return this.client.post("/api/v1/auth/password/strength/", { password, email });
  }
  /**
   * Fetch the password complexity requirements enforced by the Tenxyte backend.
   */
  async getPasswordRequirements() {
    return this.client.get("/api/v1/auth/password/requirements/");
  }
  // ─── WebAuthn / Passkeys (FIDO2) ───
  /**
   * Register a new WebAuthn device (Passkey/Biometrics/Security Key) for the authenticated user.
   * Integrates transparently with the browser `navigator.credentials` API.
   * @param deviceName - Optional human-readable name for the device being registered.
   */
  async registerWebAuthn(deviceName) {
    const optionsResponse = await this.client.post("/api/v1/auth/webauthn/register/begin/");
    const publicKeyOpts = optionsResponse.publicKey;
    publicKeyOpts.challenge = base64urlToBuffer(publicKeyOpts.challenge);
    publicKeyOpts.user.id = base64urlToBuffer(publicKeyOpts.user.id);
    if (publicKeyOpts.excludeCredentials) {
      publicKeyOpts.excludeCredentials.forEach((cred2) => {
        cred2.id = base64urlToBuffer(cred2.id);
      });
    }
    const cred = await navigator.credentials.create({ publicKey: publicKeyOpts });
    if (!cred) {
      throw new Error("WebAuthn registration was aborted or failed.");
    }
    const response = cred.response;
    const completionPayload = {
      device_name: deviceName,
      credential: {
        id: cred.id,
        type: cred.type,
        rawId: bufferToBase64url(cred.rawId),
        response: {
          attestationObject: bufferToBase64url(response.attestationObject),
          clientDataJSON: bufferToBase64url(response.clientDataJSON)
        }
      }
    };
    return this.client.post("/api/v1/auth/webauthn/register/complete/", completionPayload);
  }
  /**
   * Authenticate via WebAuthn (Passkey) without requiring a password.
   * Integrates transparently with the browser `navigator.credentials` API.
   * @param email - The email address identifying the user account (optional if discoverable credentials are used).
   * @returns A session token pair and the user context upon successful cryptographic challenge verification.
   */
  async authenticateWebAuthn(email) {
    const optionsResponse = await this.client.post("/api/v1/auth/webauthn/authenticate/begin/", email ? { email } : {});
    const publicKeyOpts = optionsResponse.publicKey;
    publicKeyOpts.challenge = base64urlToBuffer(publicKeyOpts.challenge);
    if (publicKeyOpts.allowCredentials) {
      publicKeyOpts.allowCredentials.forEach((cred2) => {
        cred2.id = base64urlToBuffer(cred2.id);
      });
    }
    const cred = await navigator.credentials.get({ publicKey: publicKeyOpts });
    if (!cred) {
      throw new Error("WebAuthn authentication was aborted or failed.");
    }
    const response = cred.response;
    const completionPayload = {
      credential: {
        id: cred.id,
        type: cred.type,
        rawId: bufferToBase64url(cred.rawId),
        response: {
          authenticatorData: bufferToBase64url(response.authenticatorData),
          clientDataJSON: bufferToBase64url(response.clientDataJSON),
          signature: bufferToBase64url(response.signature),
          userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null
        }
      }
    };
    return this.client.post("/api/v1/auth/webauthn/authenticate/complete/", completionPayload);
  }
  /**
   * List all registered WebAuthn credentials for the active user.
   */
  async listWebAuthnCredentials() {
    return this.client.get("/api/v1/auth/webauthn/credentials/");
  }
  /**
   * Delete a specific WebAuthn credential, removing its capability to sign in.
   * @param credentialId - The internal ID of the credential to delete.
   */
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
   * Cache a decoded JWT payload locally to perform parameter-less synchronous permission checks.
   * Usually invoked automatically by the system upon login or token refresh.
   * @param token - The raw JWT access token encoded string.
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
  /**
   * Synchronously deeply inspects the cached (or provided) JWT to determine if the user has a specific Role.
   * @param role - The exact code name of the Role.
   * @param token - (Optional) Provide a specific token overriding the cached one.
   */
  hasRole(role, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.roles) return false;
    return decoded.roles.includes(role);
  }
  /**
   * Evaluates if the active session holds AT LEAST ONE of the listed Roles.
   * @param roles - An array of Role codes.
   */
  hasAnyRole(roles, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.roles) return false;
    return roles.some((r) => decoded.roles.includes(r));
  }
  /**
   * Evaluates if the active session holds ALL of the listed Roles concurrently.
   * @param roles - An array of Role codes.
   */
  hasAllRoles(roles, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.roles) return false;
    return roles.every((r) => decoded.roles.includes(r));
  }
  /**
   * Synchronously deeply inspects the cached (or provided) JWT to determine if the user has a specific granular Permission.
   * @param permission - The exact code name of the Permission (e.g., 'invoices.read').
   */
  hasPermission(permission, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.permissions) return false;
    return decoded.permissions.includes(permission);
  }
  /**
   * Evaluates if the active session holds AT LEAST ONE of the listed Permissions.
   */
  hasAnyPermission(permissions, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.permissions) return false;
    return permissions.some((p) => decoded.permissions.includes(p));
  }
  /**
   * Evaluates if the active session holds ALL of the listed Permissions concurrently.
   */
  hasAllPermissions(permissions, token) {
    const decoded = this.getDecodedToken(token);
    if (!decoded?.permissions) return false;
    return permissions.every((p) => decoded.permissions.includes(p));
  }
  // --- Roles CRUD --- //
  /** Fetch all application global Roles structure */
  async listRoles() {
    return this.client.get("/api/v1/auth/roles/");
  }
  /** Create a new architectural Role inside Tenxyte */
  async createRole(data) {
    return this.client.post("/api/v1/auth/roles/", data);
  }
  /** Get detailed metadata defining a single bounded Role */
  async getRole(roleId) {
    return this.client.get(`/api/v1/auth/roles/${roleId}/`);
  }
  /** Modify properties bounding a Role */
  async updateRole(roleId, data) {
    return this.client.put(`/api/v1/auth/roles/${roleId}/`, data);
  }
  /** Unbind and destruct a Role from the global Tenant. (Dangerous, implies cascading permission unbindings) */
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
  /** Enumerates all available fine-grained Permissions inside this Tenant scope. */
  async listPermissions() {
    return this.client.get("/api/v1/auth/permissions/");
  }
  /** Bootstraps a new granular Permission flag (e.g. `billing.refund`). */
  async createPermission(data) {
    return this.client.post("/api/v1/auth/permissions/", data);
  }
  /** Retrieves an existing atomic Permission construct. */
  async getPermission(permissionId) {
    return this.client.get(`/api/v1/auth/permissions/${permissionId}/`);
  }
  /** Edits the human readable description or structural dependencies of a Permission. */
  async updatePermission(permissionId, data) {
    return this.client.put(`/api/v1/auth/permissions/${permissionId}/`, data);
  }
  /** Destroys an atomic Permission permanently. Any Roles referencing it will be stripped of this grant automatically. */
  async deletePermission(permissionId) {
    return this.client.delete(`/api/v1/auth/permissions/${permissionId}/`);
  }
  // --- Direct Assignment (Users) --- //
  /**
   * Attach a given Role globally to a user entity.
   * Use sparingly if B2B multi-tenancy contexts are preferred.
   */
  async assignRoleToUser(userId, roleCode) {
    return this.client.post(`/api/v1/auth/users/${userId}/roles/`, { role_code: roleCode });
  }
  /**
   * Unbind a global Role from a user entity.
   */
  async removeRoleFromUser(userId, roleCode) {
    return this.client.delete(`/api/v1/auth/users/${userId}/roles/`, {
      params: { role_code: roleCode }
    });
  }
  /**
   * Ad-Hoc directly attach specific granular Permissions to a single User, bypassing Role boundaries.
   */
  async assignPermissionsToUser(userId, permissionCodes) {
    return this.client.post(`/api/v1/auth/users/${userId}/permissions/`, { permission_codes: permissionCodes });
  }
  /**
   * Ad-Hoc strip direct granular Permissions bindings from a specific User.
   */
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
  /** Retrieve your current comprehensive Profile metadata matching the active network bearer token. */
  async getProfile() {
    return this.client.get("/api/v1/auth/me/");
  }
  /** Modify your active profile core details or injected application metadata. */
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
  /**
   * Trigger self-deletion of an entire account data boundary.
   * @param password - Requires the active system password as destructive proof of intent.
   * @param otpCode - (Optional) If an OTP was queried prior to attempting account deletion.
   */
  async deleteAccount(password, otpCode) {
    return this.client.post("/api/v1/auth/request-account-deletion/", {
      password,
      otp_code: otpCode
    });
  }
  // --- Admin Actions Mapping --- //
  /** (Admin only) Lists users paginated matching criteria. */
  async listUsers(params) {
    return this.client.get("/api/v1/auth/admin/users/", { params });
  }
  /** (Admin only) Gets deterministic data related to a remote unassociated user. */
  async getUser(userId) {
    return this.client.get(`/api/v1/auth/admin/users/${userId}/`);
  }
  /** (Admin only) Modifies configuration/details or capacity bounds related to a remote unassociated user. */
  async adminUpdateUser(userId, data) {
    return this.client.patch(`/api/v1/auth/admin/users/${userId}/`, data);
  }
  /** (Admin only) Force obliterate a User boundary. Can affect relational database stability if not bound carefully. */
  async adminDeleteUser(userId) {
    return this.client.delete(`/api/v1/auth/admin/users/${userId}/`);
  }
  /** (Admin only) Apply a permanent suspension / ban state globally on a user token footprint. */
  async banUser(userId, reason = "") {
    return this.client.post(`/api/v1/auth/admin/users/${userId}/ban/`, { reason });
  }
  /** (Admin only) Recover a user footprint from a global ban state. */
  async unbanUser(userId) {
    return this.client.post(`/api/v1/auth/admin/users/${userId}/unban/`);
  }
  /** (Admin only) Apply a temporary lock bounding block on a user interaction footprint. */
  async lockUser(userId, durationMinutes = 30, reason = "") {
    return this.client.post(`/api/v1/auth/admin/users/${userId}/lock/`, { duration_minutes: durationMinutes, reason });
  }
  /** (Admin only) Releases an arbitrary temporary system lock placed on a user bounds. */
  async unlockUser(userId) {
    return this.client.post(`/api/v1/auth/admin/users/${userId}/unlock/`);
  }
};

// src/modules/b2b.ts
var B2bModule = class {
  constructor(client) {
    this.client = client;
    this.client.addRequestInterceptor((config) => {
      if (this.currentOrgSlug) {
        config.headers = {
          ...config.headers,
          "X-Org-Slug": this.currentOrgSlug
        };
      }
      return config;
    });
  }
  currentOrgSlug = null;
  // ─── Context Management ───
  /**
   * Set the active Organization context.
   * Subsequent API requests will automatically include the `X-Org-Slug` header.
   * @param slug - The unique string identifier of the organization.
   */
  switchOrganization(slug) {
    this.currentOrgSlug = slug;
  }
  /**
   * Clear the active Organization context, dropping the `X-Org-Slug` header for standard User operations.
   */
  clearOrganization() {
    this.currentOrgSlug = null;
  }
  /** Get the currently active Organization slug context if set. */
  getCurrentOrganizationSlug() {
    return this.currentOrgSlug;
  }
  // ─── Organizations CRUD ───
  /** Create a new top-level or child Organization in the backend. */
  async createOrganization(data) {
    return this.client.post("/api/v1/auth/organizations/", data);
  }
  /** List organizations the currently authenticated user belongs to. */
  async listMyOrganizations(params) {
    return this.client.get("/api/v1/auth/organizations/", { params });
  }
  /** Retrieve details about a specific organization by slug. */
  async getOrganization(slug) {
    return this.client.get(`/api/v1/auth/organizations/${slug}/`);
  }
  /** Update configuration and metadata of an Organization. */
  async updateOrganization(slug, data) {
    return this.client.patch(`/api/v1/auth/organizations/${slug}/`, data);
  }
  /** Permanently delete an Organization. */
  async deleteOrganization(slug) {
    return this.client.delete(`/api/v1/auth/organizations/${slug}/`);
  }
  /** Retrieve the topology subtree extending downward from this point. */
  async getOrganizationTree(slug) {
    return this.client.get(`/api/v1/auth/organizations/${slug}/tree/`);
  }
  // ─── Member Management ───
  /** List users bound to a specific Organization. */
  async listMembers(slug, params) {
    return this.client.get(`/api/v1/auth/organizations/${slug}/members/`, { params });
  }
  /** Add a user directly into an Organization with a designated role. */
  async addMember(slug, data) {
    return this.client.post(`/api/v1/auth/organizations/${slug}/members/`, data);
  }
  /** Evolve or demote an existing member's role within the Organization. */
  async updateMemberRole(slug, userId, roleCode) {
    return this.client.patch(`/api/v1/auth/organizations/${slug}/members/${userId}/`, { role_code: roleCode });
  }
  /** Kick a user out of the Organization. */
  async removeMember(slug, userId) {
    return this.client.delete(`/api/v1/auth/organizations/${slug}/members/${userId}/`);
  }
  // ─── Invitations ───
  /** Send an onboarding email invitation to join an Organization. */
  async inviteMember(slug, data) {
    return this.client.post(`/api/v1/auth/organizations/${slug}/invitations/`, data);
  }
  /** Fetch a definition matrix of what Organization-level roles can be assigned. */
  async listOrgRoles() {
    return this.client.get("/api/v1/auth/organizations/roles/");
  }
};

// src/modules/ai.ts
var AiModule = class {
  constructor(client) {
    this.client = client;
    this.client.addRequestInterceptor((config) => {
      const headers = { ...config.headers };
      if (this.agentToken) {
        headers["Authorization"] = `AgentBearer ${this.agentToken}`;
      }
      if (this.traceId) {
        headers["X-Prompt-Trace-ID"] = this.traceId;
      }
      return { ...config, headers };
    });
    this.client.addResponseInterceptor(async (response, request) => {
      if (response.status === 202) {
        const cloned = response.clone();
        try {
          const data = await cloned.json();
          console.debug("[Tenxyte AI] Received 202 Awaiting Approval:", data);
        } catch {
        }
      } else if (response.status === 403) {
        const cloned = response.clone();
        try {
          const data = await cloned.json();
          if (data.code === "BUDGET_EXCEEDED") {
            console.warn("[Tenxyte AI] Network responded with Budget Exceeded for Agent.");
          } else if (data.status === "suspended") {
            console.warn("[Tenxyte AI] Circuit breaker open for Agent.");
          }
        } catch {
        }
      }
      return response;
    });
  }
  agentToken = null;
  traceId = null;
  // ─── AgentToken Lifecycle ───
  /**
   * Create an AgentToken granting specific deterministic limits to an AI Agent.
   */
  async createAgentToken(data) {
    return this.client.post("/api/v1/auth/ai/tokens/", data);
  }
  /**
   * Set the SDK to operate on behalf of an Agent using the generated Agent Token payload.
   * Overrides standard `Authorization` headers with `AgentBearer`.
   */
  setAgentToken(token) {
    this.agentToken = token;
  }
  /** Disables the active Agent override and reverts to standard User session requests. */
  clearAgentToken() {
    this.agentToken = null;
  }
  /** Check if the SDK is currently mocking requests as an AI Agent. */
  isAgentMode() {
    return this.agentToken !== null;
  }
  /** List previously provisioned active Agent tokens. */
  async listAgentTokens() {
    return this.client.get("/api/v1/auth/ai/tokens/");
  }
  /** Fetch the status and configuration of a specific AgentToken. */
  async getAgentToken(tokenId) {
    return this.client.get(`/api/v1/auth/ai/tokens/${tokenId}/`);
  }
  /** Irreversibly revoke a targeted AgentToken from acting upon the Tenant. */
  async revokeAgentToken(tokenId) {
    return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/revoke/`);
  }
  /** Temporarily freeze an AgentToken by forcibly closing its Circuit Breaker. */
  async suspendAgentToken(tokenId) {
    return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/suspend/`);
  }
  /** Emergency kill-switch to wipe all operational Agent Tokens. */
  async revokeAllAgentTokens() {
    return this.client.post("/api/v1/auth/ai/tokens/revoke-all/");
  }
  // ─── Circuit Breaker ───
  /** Satisfy an Agent's Dead-Man's switch heartbeat requirement to prevent suspension. */
  async sendHeartbeat(tokenId) {
    return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/heartbeat/`);
  }
  // ─── Human in the Loop (HITL) ───
  /** List intercepted HTTP 202 actions waiting for Human interaction / approval. */
  async listPendingActions() {
    return this.client.get("/api/v1/auth/ai/pending-actions/");
  }
  /** Complete a pending HITL authorization to finally flush the Agent action to backend systems. */
  async confirmPendingAction(confirmationToken) {
    return this.client.post("/api/v1/auth/ai/pending-actions/confirm/", { token: confirmationToken });
  }
  /** Block an Agent action permanently. */
  async denyPendingAction(confirmationToken) {
    return this.client.post("/api/v1/auth/ai/pending-actions/deny/", { token: confirmationToken });
  }
  // ─── Traceability and Budget ───
  /** Start piping the `X-Prompt-Trace-ID` custom header outwards for tracing logs against LLM inputs. */
  setTraceId(traceId) {
    this.traceId = traceId;
  }
  /** Disable trace forwarding context. */
  clearTraceId() {
    this.traceId = null;
  }
  /** 
   * Report consumption costs associated with a backend invocation back to Tenxyte for strict circuit budgeting.
   * @param tokenId - AgentToken evaluating ID.
   * @param usage - Sunk token costs or explicit USD derivations.
   */
  async reportUsage(tokenId, usage) {
    return this.client.post(`/api/v1/auth/ai/tokens/${tokenId}/report-usage/`, usage);
  }
};

// src/client.ts
var TenxyteClient = class {
  /** The core HTTP wrapper handling network interception and parsing */
  http;
  /** Authentication module (Login, Signup, Magic link, session handling) */
  auth;
  /** Security module (2FA, WebAuthn, Passwords, OTPs) */
  security;
  /** Role-Based Access Control and permission checking module */
  rbac;
  /** Connected user's profile and management module */
  user;
  /** Business-to-Business organizations module (multi-tenant environments) */
  b2b;
  /** AIRS - AI Responsibility & Security module (Agent tokens, Circuit breakers, HITL) */
  ai;
  /**
   * Initializes the SDK with connection details for your Tenxyte-powered API.
   * @param options Configuration options including `baseUrl` and custom headers like `X-Access-Key`
   * 
   * @example
   * ```typescript
   * const tx = new TenxyteClient({ 
   *     baseUrl: 'https://api.my-service.com',
   *     headers: { 'X-Access-Key': 'pkg_abc123' }
   * });
   * ```
   */
  constructor(options) {
    this.http = new TenxyteHttpClient(options);
    this.auth = new AuthModule(this.http);
    this.security = new SecurityModule(this.http);
    this.rbac = new RbacModule(this.http);
    this.user = new UserModule(this.http);
    this.b2b = new B2bModule(this.http);
    this.ai = new AiModule(this.http);
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