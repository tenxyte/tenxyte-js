import { inject, type App, type InjectionKey } from 'vue';
import type { TenxyteClient } from '@tenxyte/core';

/**
 * Vue injection key for the TenxyteClient instance.
 */
export const TENXYTE_KEY: InjectionKey<TenxyteClient> = Symbol('tenxyte');

/**
 * Vue plugin that installs the TenxyteClient into the app.
 *
 * @example
 * ```ts
 * import { createApp } from 'vue';
 * import { TenxyteClient } from '@tenxyte/core';
 * import { tenxytePlugin } from '@tenxyte/vue';
 *
 * const tx = new TenxyteClient({ baseUrl: '...' });
 * const app = createApp(App);
 * app.use(tenxytePlugin, tx);
 * app.mount('#app');
 * ```
 */
export const tenxytePlugin = {
    install(app: App, client: TenxyteClient): void {
        app.provide(TENXYTE_KEY, client);
    },
};

/**
 * Internal helper to retrieve the TenxyteClient from Vue's injection system.
 * Throws if the plugin has not been installed.
 */
export function useTenxyteClient(): TenxyteClient {
    const client = inject(TENXYTE_KEY);
    if (!client) {
        throw new Error(
            '[@tenxyte/vue] useTenxyteClient() requires the tenxytePlugin to be installed. ' +
            'Call app.use(tenxytePlugin, client) in your main entry.',
        );
    }
    return client;
}
