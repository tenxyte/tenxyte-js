import type { TenxyteStorage } from './storage';
import { MemoryStorage } from './storage';
import type { CustomDeviceInfo } from './utils/device_info';

/**
 * Semantic version of the SDK, kept in sync with package.json.
 * Sent as X-SDK-Version header when diagnostics are enabled.
 */
export const SDK_VERSION = '0.9.0';

/**
 * Log level controlling the verbosity of the SDK internal logger.
 *
 * - `'silent'` — No output (default).
 * - `'error'`  — Errors only.
 * - `'warn'`   — Errors and warnings.
 * - `'debug'`  — Verbose output including debug traces.
 */
export type LogLevel = 'silent' | 'error' | 'warn' | 'debug';

/**
 * Pluggable logger interface accepted by the SDK.
 * Any object satisfying this contract (e.g. `console`) can be passed as `logger`.
 */
export interface TenxyteLogger {
    /** Verbose diagnostic messages (interceptors, token lifecycle, etc.) */
    debug(message: string, ...args: unknown[]): void;
    /** Non-critical issues that deserve attention (deprecated usage, retry fallback, etc.) */
    warn(message: string, ...args: unknown[]): void;
    /** Unrecoverable errors (network failures, malformed responses, etc.) */
    error(message: string, ...args: unknown[]): void;
}

/**
 * Configuration object accepted by {@link TenxyteClient}.
 *
 * Only `baseUrl` is required — every other option has a sensible default.
 *
 * @example
 * ```typescript
 * import { TenxyteClient } from '@tenxyte/core';
 *
 * const tx = new TenxyteClient({
 *     baseUrl: 'https://api.my-service.com',
 *     headers: { 'X-Access-Key': 'pkg_abc123' },
 *     autoRefresh: true,
 *     autoDeviceInfo: true,
 *     timeoutMs: 10_000,
 *     onSessionExpired: () => router.push('/login'),
 * });
 * ```
 */
export interface TenxyteClientConfig {
    /** Base URL of the Tenxyte-powered API, without a trailing slash. */
    baseUrl: string;

    /** Extra HTTP headers merged into every outgoing request (e.g. X-Access-Key, X-Access-Secret). */
    headers?: Record<string, string>;

    /**
     * Persistent token storage back-end.
     * The SDK ships with MemoryStorage, LocalStorageAdapter, and CookieStorage.
     * Defaults to MemoryStorage (in-memory, lost on page reload / process exit).
     */
    storage?: TenxyteStorage;

    /**
     * When true, the SDK automatically attaches a response interceptor that
     * intercepts 401 responses, attempts a silent token refresh via
     * POST /refresh/, and replays the original request on success.
     * Defaults to true.
     */
    autoRefresh?: boolean;

    /**
     * When true, the SDK injects a device_info payload (built by
     * buildDeviceInfo()) into every authentication request body
     * (/login/email/, /login/phone/, /register/, /social/*).
     * Set to false if you supply your own fingerprint or run in an
     * environment where the auto-detected info is irrelevant (e.g. CI).
     * Defaults to true.
     */
    autoDeviceInfo?: boolean;

    /**
     * Global request timeout in milliseconds.
     * When set, every fetch call is wrapped with an AbortController.
     * If the timer fires before the response arrives, the SDK throws a
     * TenxyteError with code TIMEOUT.
     * Defaults to undefined (no timeout).
     */
    timeoutMs?: number;

    /**
     * Callback invoked whenever the active session can no longer be recovered
     * (e.g. refresh token is expired or revoked).
     * This is a convenience shortcut equivalent to tx.on('session:expired', callback).
     */
    onSessionExpired?: () => void;

    /**
     * Custom logger implementation.
     * Defaults to a silent no-op logger. Pass console for quick debugging
     * or supply any object that satisfies the TenxyteLogger interface.
     */
    logger?: TenxyteLogger;

    /**
     * Controls the verbosity of the built-in logger when no custom logger
     * is provided. Defaults to 'silent'.
     */
    logLevel?: LogLevel;

    /**
     * Override or supplement the auto-detected device information.
     * When provided, these values are merged on top of the auto-detected
     * fingerprint built by `buildDeviceInfo()`. Only relevant when
     * `autoDeviceInfo` is `true`.
     */
    deviceInfoOverride?: CustomDeviceInfo;
}

/**
 * Fully resolved configuration where every optional field has been
 * filled with its default value. This is the shape used internally
 * by TenxyteClient after calling {@link resolveConfig}.
 */
export interface ResolvedTenxyteConfig {
    baseUrl: string;
    headers: Record<string, string>;
    storage: TenxyteStorage;
    autoRefresh: boolean;
    autoDeviceInfo: boolean;
    timeoutMs: number | undefined;
    onSessionExpired: (() => void) | undefined;
    logger: TenxyteLogger;
    logLevel: LogLevel;
    deviceInfoOverride: CustomDeviceInfo | undefined;
}

/** Silent no-op logger used when the consumer does not provide one. */
export const NOOP_LOGGER: TenxyteLogger = {
    debug() {},
    warn() {},
    error() {},
};

/**
 * Merges user-provided configuration with sensible defaults.
 *
 * Default values:
 * - storage: new MemoryStorage()
 * - autoRefresh: true
 * - autoDeviceInfo: true
 * - headers: {}
 * - logLevel: 'silent'
 * - logger: NOOP_LOGGER
 */
export function resolveConfig(config: TenxyteClientConfig): ResolvedTenxyteConfig {
    return {
        baseUrl: config.baseUrl,
        headers: config.headers ?? {},
        storage: config.storage ?? new MemoryStorage(),
        autoRefresh: config.autoRefresh ?? true,
        autoDeviceInfo: config.autoDeviceInfo ?? true,
        timeoutMs: config.timeoutMs,
        onSessionExpired: config.onSessionExpired,
        logger: config.logger ?? NOOP_LOGGER,
        logLevel: config.logLevel ?? 'silent',
        deviceInfoOverride: config.deviceInfoOverride,
    };
}
