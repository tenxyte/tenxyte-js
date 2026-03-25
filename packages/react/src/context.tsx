import { createContext, useContext } from 'react';
import type { TenxyteClient } from '@tenxyte/core';

/**
 * React context holding the TenxyteClient instance.
 * Must be provided via <TenxyteProvider>.
 */
export const TenxyteContext = createContext<TenxyteClient | null>(null);

/**
 * Internal hook to access the TenxyteClient instance.
 * Throws if used outside of a <TenxyteProvider>.
 */
export function useTenxyteClient(): TenxyteClient {
    const client = useContext(TenxyteContext);
    if (!client) {
        throw new Error(
            '[@tenxyte/react] useTenxyteClient must be used within a <TenxyteProvider>. ' +
            'Wrap your app with <TenxyteProvider client={tx}>.',
        );
    }
    return client;
}
