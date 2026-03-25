import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TenxyteClient, TenxyteClientState } from '@tenxyte/core';
import { TenxyteContext } from './context';

export interface TenxyteProviderProps {
    /** The initialized TenxyteClient instance. */
    client: TenxyteClient;
    children: React.ReactNode;
}

/**
 * Provides the TenxyteClient to all descendant components and manages
 * reactive state synchronization via SDK events.
 *
 * @example
 * ```tsx
 * import { TenxyteClient } from '@tenxyte/core';
 * import { TenxyteProvider } from '@tenxyte/react';
 *
 * const tx = new TenxyteClient({ baseUrl: '...' });
 *
 * function App() {
 *     return (
 *         <TenxyteProvider client={tx}>
 *             <MyApp />
 *         </TenxyteProvider>
 *     );
 * }
 * ```
 */
export function TenxyteProvider({ client, children }: TenxyteProviderProps): React.JSX.Element {
    return (
        <TenxyteContext.Provider value={client}>
            {children}
        </TenxyteContext.Provider>
    );
}

/**
 * Internal hook that subscribes to SDK events and returns a reactive state snapshot.
 * Re-renders consuming components whenever auth state changes.
 */
export function useTenxyteState(): TenxyteClientState & { loading: boolean } {
    const client = React.useContext(TenxyteContext);
    if (!client) {
        throw new Error('[@tenxyte/react] useTenxyteState must be used within a <TenxyteProvider>.');
    }

    const [state, setState] = useState<TenxyteClientState>({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        activeOrg: null,
        isAgentMode: false,
    });
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const snapshot = await client.getState();
        setState(snapshot);
        setLoading(false);
    }, [client]);

    useEffect(() => {
        // Initial state load
        refresh();

        // Subscribe to all state-changing events
        const unsubs = [
            client.on('token:stored', () => { refresh(); }),
            client.on('token:refreshed', () => { refresh(); }),
            client.on('session:expired', () => { refresh(); }),
        ];

        return () => {
            unsubs.forEach((unsub) => unsub());
        };
    }, [client, refresh]);

    return useMemo(() => ({ ...state, loading }), [state, loading]);
}
