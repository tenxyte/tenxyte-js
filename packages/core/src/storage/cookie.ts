import type { TenxyteStorage } from './index';

/**
 * CookieStorage implementation
 * Note: To be secure, tokens should be HttpOnly where possible.
 * This class handles client-side cookies if necessary.
 */
export class CookieStorage implements TenxyteStorage {
    private defaultOptions: string;

    constructor(options: { secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' } = {}) {
        const secure = options.secure ?? true;
        const sameSite = options.sameSite ?? 'Lax';
        this.defaultOptions = `path=/; SameSite=${sameSite}${secure ? '; Secure' : ''}`;
    }

    getItem(key: string): string | null {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`));
        return match ? decodeURIComponent(match[2]) : null;
    }

    setItem(key: string, value: string): void {
        if (typeof document === 'undefined') return;
        document.cookie = `${key}=${encodeURIComponent(value)}; ${this.defaultOptions}`;
    }

    removeItem(key: string): void {
        if (typeof document === 'undefined') return;
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }

    clear(): void {
        // Cannot easily clear all cookies securely because we don't know them all
        // Usually auth keys are known, e.g., tx_access, tx_refresh
        this.removeItem('tx_access');
        this.removeItem('tx_refresh');
    }
}
