import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStorage, LocalStorage } from '../src/storage';

describe('Storage Abstractions', () => {
    describe('MemoryStorage', () => {
        let storage: MemoryStorage;

        beforeEach(() => {
            storage = new MemoryStorage();
        });

        it('should set and get items', () => {
            storage.setItem('key1', 'value1');
            expect(storage.getItem('key1')).toBe('value1');
        });

        it('should return null for non-existent keys', () => {
            expect(storage.getItem('key2')).toBeNull();
        });

        it('should remove items', () => {
            storage.setItem('key1', 'value1');
            storage.removeItem('key1');
            expect(storage.getItem('key1')).toBeNull();
        });

        it('should clear all items', () => {
            storage.setItem('key1', 'value1');
            storage.setItem('key2', 'value2');
            storage.clear();
            expect(storage.getItem('key1')).toBeNull();
            expect(storage.getItem('key2')).toBeNull();
        });
    });

    describe('LocalStorage', () => {
        let storage: LocalStorage;

        beforeEach(() => {
            // Mock window.localStorage for node environment
            const localStorageMock = (() => {
                let store: Record<string, string> = {};
                return {
                    getItem: vi.fn((key: string) => store[key] || null),
                    setItem: vi.fn((key: string, value: string) => {
                        if (key === 'fallback_key') throw new Error('Quota'); // For fallback test
                        store[key] = value.toString();
                    }),
                    removeItem: vi.fn((key: string) => {
                        delete store[key];
                    }),
                    clear: vi.fn(() => {
                        store = {};
                    }),
                };
            })();

            Object.defineProperty(window, 'localStorage', {
                value: localStorageMock,
                writable: true,
            });

            storage = new LocalStorage();
        });

        it('should set and get items in browser localStorage', () => {
            storage.setItem('tx_test', 'value123');
            expect(storage.getItem('tx_test')).toBe('value123');
            expect(localStorage.getItem('tx_test')).toBe('value123');
        });

        it('should return null for non-existent keys', () => {
            expect(storage.getItem('missing')).toBeNull();
        });

        it('should degrade to MemoryStorage if window.localStorage throws error', () => {
            // The mock throws an error for 'fallback_key' specifically, but 'new LocalStorage()' checking availability passes.
            // Wait, checkAvailability() tries to set '__tenxyte_test__'.
            // To test constructor degradation, we can mock localStorage globally to throw on everything during setup:
            Object.defineProperty(window, 'localStorage', {
                value: {
                    setItem: () => { throw new Error('QuotaExceededError'); },
                    getItem: () => null,
                    removeItem: () => { },
                    clear: () => { }
                },
                writable: true,
            });

            const strictStorage = new LocalStorage();

            strictStorage.setItem('fallback_key', 'test');
            expect(strictStorage.getItem('fallback_key')).toBe('test');
        });
    });
});
