import { TenxyteClient } from '@tenxyte/core'

export const tx = new TenxyteClient({
    baseUrl: import.meta.env.VITE_TENXYTE_BASE_URL,
    headers: {
        'X-Access-Key': import.meta.env.VITE_TENXYTE_ACCESS_KEY,
        'X-Access-Secret': import.meta.env.VITE_TENXYTE_ACCESS_SECRET,
    },
    autoRefresh: true,
    autoDeviceInfo: true,
})
