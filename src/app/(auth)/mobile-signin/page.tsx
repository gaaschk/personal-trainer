import { notFound } from 'next/navigation';
import { signIn } from '@/auth';

interface Props {
  searchParams: Promise<{
    provider?: string;
    state?: string;
    deviceName?: string;
    platform?: string;
  }>;
}

export default async function MobileSignInPage({ searchParams }: Props) {
  const { provider, state = '', deviceName = '', platform = '' } = await searchParams;

  if (provider !== 'google' && provider !== 'apple') {
    notFound();
  }

  const completeUrl =
    `/api/mobile/auth/complete` +
    `?state=${encodeURIComponent(state)}` +
    `&deviceName=${encodeURIComponent(deviceName)}` +
    `&platform=${encodeURIComponent(platform)}`;

  // signIn() in a server component throws NEXT_REDIRECT — no JSX is rendered
  await signIn(provider, { redirectTo: completeUrl });
}
