'use client';

import { Suspense, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function MobileSignIn() {
  const searchParams = useSearchParams();
  const provider    = searchParams.get('provider');
  const state       = searchParams.get('state')      ?? '';
  const deviceName  = searchParams.get('deviceName') ?? '';
  const platform    = searchParams.get('platform')   ?? '';

  useEffect(() => {
    if (provider !== 'google' && provider !== 'apple') return;

    const callbackUrl =
      `/api/mobile/auth/complete` +
      `?state=${encodeURIComponent(state)}` +
      `&deviceName=${encodeURIComponent(deviceName)}` +
      `&platform=${encodeURIComponent(platform)}`;

    signIn(provider, { callbackUrl });
  }, [provider, state, deviceName, platform]);

  const label = provider === 'apple' ? 'Apple' : 'Google';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'system-ui, sans-serif', color: '#6b7280',
    }}>
      Redirecting to {label} sign-in…
    </div>
  );
}

export default function MobileSignInPage() {
  return (
    <Suspense>
      <MobileSignIn />
    </Suspense>
  );
}
