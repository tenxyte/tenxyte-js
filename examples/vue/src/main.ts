import { createApp } from 'vue';
import { TenxyteClient } from '@tenxyte/core';
import { tenxytePlugin } from '@tenxyte/vue';
import App from './App.vue';

const tx = new TenxyteClient({
    baseUrl: import.meta.env.VITE_TENXYTE_BASE_URL ?? 'http://localhost:8000',
    headers: {
        'X-Access-Key': import.meta.env.VITE_TENXYTE_ACCESS_KEY ?? '',
        'X-Access-Secret': import.meta.env.VITE_TENXYTE_ACCESS_SECRET ?? '',
    },
    autoRefresh: true,
    autoDeviceInfo: true,
});

const app = createApp(App);
app.use(tenxytePlugin, tx);
app.mount('#app');
