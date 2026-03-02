'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';

interface LinkedState {
  providers:   string[];
  hasPassword: boolean;
}

const PROVIDERS = [
  {
    id:    'google',
    label: 'Google',
    icon:  (
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  {
    id:    'apple',
    label: 'Apple',
    icon:  (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.53 3.99M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25"/>
      </svg>
    ),
  },
] as const;

export default function ConnectedAccounts() {
  const [state, setState]         = useState<LinkedState | null>(null);
  const [busy, setBusy]           = useState<string | null>(null); // provider being acted on
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    const res  = await fetch('/api/auth/linked-accounts');
    const data = await res.json() as LinkedState;
    setState(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function connect(provider: string) {
    setBusy(provider);
    // signIn redirects through OAuth and comes back to /profile
    await signIn(provider, { callbackUrl: '/profile' });
    // (page will reload on return — no need to call load())
  }

  async function disconnect(provider: string) {
    setError('');
    setBusy(provider);
    try {
      const res  = await fetch(`/api/auth/linked-accounts?provider=${provider}`, { method: 'DELETE' });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed to unlink'); return; }
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!state) return null;

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-400 px-1">{error}</p>
      )}

      {PROVIDERS.map(({ id, label, icon }) => {
        const linked    = state.providers.includes(id);
        const isBusy    = busy === id;
        // Only allow disconnect if another sign-in method remains
        const canUnlink = linked && (state.providers.filter((p) => p !== id).length > 0 || state.hasPassword);

        return (
          <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800 border border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-gray-300">{icon}</span>
              <span className="text-sm font-medium text-white">{label}</span>
            </div>

            <div className="flex items-center gap-2">
              {linked && (
                <span className="text-xs text-green-400 font-medium">Connected</span>
              )}
              {linked ? (
                <button
                  onClick={() => disconnect(id)}
                  disabled={isBusy || !canUnlink}
                  title={!canUnlink ? 'Cannot disconnect — only sign-in method remaining' : undefined}
                  className="px-3 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isBusy ? 'Disconnecting…' : 'Disconnect'}
                </button>
              ) : (
                <button
                  onClick={() => connect(id)}
                  disabled={!!busy}
                  className="px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isBusy ? 'Connecting…' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-600 px-1">
        Once connected, you can sign in with Google or Apple instead of your password.
        {state.hasPassword ? '' : ' You must keep at least one sign-in method active.'}
      </p>
    </div>
  );
}
