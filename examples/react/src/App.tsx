import React, { useState } from 'react';
import { useAuth, useUser, useOrganization, useRbac } from '@tenxyte/react';

export function App(): React.JSX.Element {
    const { isAuthenticated, loading, loginWithEmail, logout } = useAuth();
    const { user } = useUser();
    const { activeOrg, switchOrganization, clearOrganization } = useOrganization();
    const { hasRole } = useRbac();

    const [email, setEmail] = useState('test@example.com');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (): Promise<void> => {
        try {
            setError(null);
            await loginWithEmail({ email, password });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!isAuthenticated) {
        return (
            <div style={{ maxWidth: 400, margin: '2rem auto', fontFamily: 'sans-serif' }}>
                <h1>Tenxyte React Example</h1>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
                    <button onClick={handleLogin}>Sign In</button>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
            <h1>Tenxyte React Example</h1>

            <section>
                <h2>User</h2>
                <pre>{JSON.stringify(user, null, 2)}</pre>
            </section>

            <section>
                <h2>Roles</h2>
                <p>Admin: {hasRole('admin') ? '✅' : '❌'}</p>
                <p>Editor: {hasRole('editor') ? '✅' : '❌'}</p>
            </section>

            <section>
                <h2>Organization</h2>
                <p>Active: {activeOrg ?? 'None'}</p>
                <button onClick={() => switchOrganization('acme')}>Switch to Acme</button>
                <button onClick={clearOrganization}>Clear Org</button>
            </section>

            <button onClick={logout} style={{ marginTop: 16 }}>Log Out</button>
        </div>
    );
}
