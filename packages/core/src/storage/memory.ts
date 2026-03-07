import type { TenxyteStorage } from './index';

/**
 * MemoryStorage implementation primarily used in Node.js (SSR)
 * environments or as a fallback when browser storage is unavailable.
 */
export class MemoryStorage implements TenxyteStorage {
    private store: Map<string, string>;

    constructor() {
        this.store = new Map<string, string>();
    }

    getItem(key: string): string | null {
        const value = this.store.get(key);
        return value !== undefined ? value : null;
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }
}
