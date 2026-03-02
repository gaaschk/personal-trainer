import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getAllSettings, SETTINGS_MANIFEST } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import AdminSettingsClient from './AdminSettingsClient';

export const metadata = { title: 'Admin — AI Trainer' };

export default async function AdminPage() {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    // 401 → unauthenticated (middleware normally handles this, but just in case)
    // 403 → not admin
    redirect('/dashboard');
  }

  // Load settings and users in parallel
  const [rawSettings, users] = await Promise.all([
    getAllSettings(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Mask secret values before passing to client
  const settings: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawSettings)) {
    const manifest = SETTINGS_MANIFEST[key as keyof typeof SETTINGS_MANIFEST];
    settings[key] = manifest?.secret ? (value ? '••••••' : '') : value;
  }

  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Manage integration credentials, AI tuning, and user roles.
        </p>
      </div>

      <AdminSettingsClient
        initialSettings={settings}
        initialUsers={serializedUsers}
        currentUserId={auth.userId}
      />
    </div>
  );
}
