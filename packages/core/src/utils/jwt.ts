export interface DecodedTenxyteToken {
    exp?: number;
    iat?: number;
    sub?: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: any;
}

/**
 * Decodes the payload of a JWT without verifying the signature.
 * Suitable for client-side routing and UI state.
 */
export function decodeJwt(token: string): DecodedTenxyteToken | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const base64Url = parts[1];
        if (!base64Url) return null;

        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

        // Pad with standard base64 padding
        while (base64.length % 4) {
            base64 += '=';
        }

        const isBrowser = typeof window !== 'undefined' && typeof window.atob === 'function';
        let jsonPayload: string;

        if (isBrowser) {
            // Browser decode
            jsonPayload = decodeURIComponent(
                window.atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
        } else {
            // Node.js decode
            jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
        }

        return JSON.parse(jsonPayload);
    } catch (_e) {
        return null;
    }
}
