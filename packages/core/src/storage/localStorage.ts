import type { TenxyteStorage } from './index';
import { MemoryStorage } from './memory';

/**
 * LocalStorage wrapper for the browser.
 * Degrades gracefully to MemoryStorage if localStorage is unavailable
 * (e.g., SSR, Private Browsing mode strictness).
 */
export class LocalStorage implements TenxyteStorage {
    private fallbackMemoryStore: MemoryStorage | null = null;
    private isAvailable: boolean;

    constructor() {
        this.isAvailable = this.checkAvailability();
        if (!this.isAvailable) {
            this.fallbackMemoryStore = new MemoryStorage();
        }
    }

    private checkAvailability(): boolean {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return false;
            }
            const testKey = '__tenxyte_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    getItem(key: string): string | null {
        if (!this.isAvailable && this.fallbackMemoryStore) {
            return this.fallbackMemoryStore.getItem(key);
        }
        return window.localStorage.getItem(key);
    }

    setItem(key: string, value: string): void {
        if (!this.isAvailable && this.fallbackMemoryStore) {
            this.fallbackMemoryStore.setItem(key, value);
            return;
        }
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            // Storage quota exceeded or similar error
            console.warn(`[Tenxyte SDK] Warning: failed to write to localStorage for key ${key}`);
        }
    }

    removeItem(key: string): void {
        if (!this.isAvailable && this.fallbackMemoryStore) {
            this.fallbackMemoryStore.removeItem(key);
            return;
        }
        window.localStorage.removeItem(key);
    }

    clear(): void {
        if (!this.isAvailable && this.fallbackMemoryStore) {
            this.fallbackMemoryStore.clear();
            return;
        }
        // We ideally only clear tenxyte specific keys if needed,
        // but standard clear() removes everything.
        // If the library only ever writes specific keys,
        // we could keep track of them and iterate, but for now clear() is standard.
        // For safer implementation we could just let the caller do removeItems() individually
        // but let's conform to the clear API.
        window.localStorage.clear();
    }
}
