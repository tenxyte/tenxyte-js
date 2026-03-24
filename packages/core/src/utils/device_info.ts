/**
 * Helper utility to build the device fingerprint required by Tenxyte security features.
 * Format: `v=1|os=windows;osv=11|device=desktop|arch=x64|app=tenxyte;appv=1.0.0|runtime=chrome;rtv=122|tz=Europe/Paris`
 */
export interface CustomDeviceInfo {
    os?: string;
    osVersion?: string;
    device?: string;
    arch?: string;
    app?: string;
    appVersion?: string;
    runtime?: string;
    runtimeVersion?: string;
    timezone?: string;
}

export function buildDeviceInfo(customInfo: CustomDeviceInfo = {}): string {
    // Try to determine automatically from navigator
    const autoInfo = getAutoInfo();

    const v = '1';
    const os = customInfo.os || autoInfo.os;
    const osv = customInfo.osVersion || autoInfo.osVersion;
    const device = customInfo.device || autoInfo.device;
    const arch = customInfo.arch || autoInfo.arch;
    const app = customInfo.app || autoInfo.app;
    const appv = customInfo.appVersion || autoInfo.appVersion;
    const runtime = customInfo.runtime || autoInfo.runtime;
    const rtv = customInfo.runtimeVersion || autoInfo.runtimeVersion;
    const tz = customInfo.timezone || autoInfo.timezone;

    const parts = [
        `v=${v}`,
        `os=${os}` + (osv ? `;osv=${osv}` : ''),
        `device=${device}`,
        arch ? `arch=${arch}` : '',
        app ? `app=${app}${appv ? `;appv=${appv}` : ''}` : '',
        `runtime=${runtime}` + (rtv ? `;rtv=${rtv}` : ''),
        tz ? `tz=${tz}` : ''
    ];

    return parts.filter(Boolean).join('|');
}

function getAutoInfo() {
    const info = {
        os: 'unknown',
        osVersion: '',
        device: 'desktop', // default
        arch: '',
        app: 'sdk',
        appVersion: '0.1.0',
        runtime: 'unknown',
        runtimeVersion: '',
        timezone: ''
    };

    try {
        if (typeof Intl !== 'undefined') {
            info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }

        if (typeof process !== 'undefined' && process.version) {
            info.runtime = 'node';
            info.runtimeVersion = process.version;
            info.os = process.platform;
            info.arch = process.arch;
            info.device = 'server';
        } else if (typeof window !== 'undefined' && window.navigator) {
            const ua = window.navigator.userAgent.toLowerCase();

            // Basic OS detection
            if (ua.includes('windows')) info.os = 'windows';
            else if (ua.includes('mac')) info.os = 'macos';
            else if (ua.includes('linux')) info.os = 'linux';
            else if (ua.includes('android')) info.os = 'android';
            else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) info.os = 'ios';

            // Basic Device Type
            if (/mobi|android|touch|mini/i.test(ua)) info.device = 'mobile';
            if (/tablet|ipad/i.test(ua)) info.device = 'tablet';

            // Basic Runtime (Browser)
            if (ua.includes('firefox')) info.runtime = 'firefox';
            else if (ua.includes('edg/')) info.runtime = 'edge';
            else if (ua.includes('chrome')) info.runtime = 'chrome';
            else if (ua.includes('safari')) info.runtime = 'safari';
        }
    } catch (_e) {
        // Ignore context extraction errors
    }

    return info;
}
