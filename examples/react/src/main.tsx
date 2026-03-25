import React from 'react';
import ReactDOM from 'react-dom/client';
import { TenxyteClient } from '@tenxyte/core';
import { TenxyteProvider } from '@tenxyte/react';
import { App } from './App';

const tx = new TenxyteClient({
    baseUrl: import.meta.env.VITE_TENXYTE_BASE_URL ?? 'http://localhost:8000',
    headers: {
        'X-Access-Key': import.meta.env.VITE_TENXYTE_ACCESS_KEY ?? '',
        'X-Access-Secret': import.meta.env.VITE_TENXYTE_ACCESS_SECRET ?? '',
    },
    autoRefresh: true,
    autoDeviceInfo: true,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <TenxyteProvider client={tx}>
            <App />
        </TenxyteProvider>
    </React.StrictMode>,
);
