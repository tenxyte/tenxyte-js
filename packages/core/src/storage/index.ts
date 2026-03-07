export interface TenxyteStorage {
    /**
     * Retrieves a value from storage.
     * @param key The key to retrieve
     */
    getItem(key: string): string | null | Promise<string | null>;

    /**
     * Saves a value to storage.
     * @param key The key to store
     * @param value The string value
     */
    setItem(key: string, value: string): void | Promise<void>;

    /**
     * Removes a specific key from storage.
     * @param key The key to remove
     */
    removeItem(key: string): void | Promise<void>;

    /**
     * Clears all storage keys managed by the SDK.
     */
    clear(): void | Promise<void>;
}

export * from './memory';
export * from './localStorage';
export * from './cookie';
