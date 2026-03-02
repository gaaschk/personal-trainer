'use client';

import { useState } from 'react';
import { SETTINGS_MANIFEST } from '@/lib/settings-manifest';

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface Props {
  initialSettings: Record<string, string>;
  initialUsers: User[];
  currentUserId: string;
}

// ── Setting row ───────────────────────────────────────────────────────────────

function SettingRow({
  settingKey,
  value,
  onSave,
}: {
  settingKey: string;
  value: string;
  onSave: (key: string, val: string) => Promise<void>;
}) {
  const manifest = SETTINGS_MANIFEST[settingKey as keyof typeof SETTINGS_MANIFEST];
  const isSecret = manifest?.secret ?? false;
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await onSave(settingKey, inputVal);
      setEditing(false);
      setInputVal('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const displayValue = isSecret
    ? (value ? '••••••' : <span className="text-gray-500 italic">not set</span>)
    : (value || <span className="text-gray-500 italic">not set</span>);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-800 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-200">{manifest?.label ?? settingKey}</div>
        <div className="text-xs text-gray-500 font-mono mt-0.5">{settingKey}</div>
        {!editing && (
          <div className="text-sm text-gray-400 mt-1 font-mono break-all">{displayValue}</div>
        )}
        {editing && (
          <div className="mt-2 flex gap-2">
            <input
              type={isSecret ? 'password' : 'text'}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={isSecret ? 'Enter new value' : (value || 'Enter value')}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setInputVal(''); }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
      {!editing && (
        <button
          onClick={() => { setEditing(true); setInputVal(isSecret ? '' : value); }}
          className="shrink-0 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors mt-0.5"
        >
          {value ? 'Update' : 'Set'}
        </button>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  keys,
  settings,
  showRestartWarning,
  onSave,
  savedKeys,
}: {
  title: string;
  keys: string[];
  settings: Record<string, string>;
  showRestartWarning?: boolean;
  onSave: (key: string, val: string) => Promise<void>;
  savedKeys: Set<string>;
}) {
  const hasRestartKey = showRestartWarning && keys.some((k) => savedKeys.has(k));

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {showRestartWarning && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Restart required to take effect
          </span>
        )}
      </div>
      {showRestartWarning && (
        <p className="text-xs text-gray-500 mb-3">
          OAuth credentials are loaded once at server startup. Changes take effect after the next server restart.
        </p>
      )}
      {hasRestartKey && (
        <div className="mb-3 p-2 bg-amber-900/30 border border-amber-700/50 rounded-lg">
          <p className="text-xs text-amber-400">⚠️ Restart required — setting was updated this session.</p>
        </div>
      )}
      <div>
        {keys.map((key) => (
          <SettingRow
            key={key}
            settingKey={key}
            value={settings[key] ?? ''}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminSettingsClient({ initialSettings, initialUsers, currentUserId }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [users, setUsers] = useState(initialUsers);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [userError, setUserError] = useState('');
  const [userLoading, setUserLoading] = useState<string | null>(null);

  async function handleSaveSetting(key: string, value: string) {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? 'Failed to save');
    }
    const manifest = SETTINGS_MANIFEST[key as keyof typeof SETTINGS_MANIFEST];
    setSettings((prev) => ({
      ...prev,
      [key]: manifest?.secret ? '••••••' : value,
    }));
    setSavedKeys((prev) => new Set(prev).add(key));
  }

  async function handleRoleChange(userId: string, newRole: 'USER' | 'ADMIN') {
    setUserError('');
    setUserLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to update role');
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (e) {
      setUserError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setUserLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Settings */}
      <Section
        title="AI Settings"
        keys={['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']}
        settings={settings}
        onSave={handleSaveSetting}
        savedKeys={savedKeys}
      />

      {/* Chat Tuning */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-base font-semibold text-white mb-1">Chat Tuning</h2>
        <p className="text-xs text-gray-500 mb-3">
          <strong className="text-gray-400">Window size</strong>: number of recent messages sent to Claude verbatim (default 20, i.e. 10 exchanges).
          <br />
          <strong className="text-gray-400">Summary trigger</strong>: total message count before older messages are summarized (default 30). Must be &gt; window size.
        </p>
        {['CHAT_WINDOW_SIZE', 'CHAT_SUMMARY_TRIGGER'].map((key) => (
          <SettingRow
            key={key}
            settingKey={key}
            value={settings[key] ?? ''}
            onSave={handleSaveSetting}
          />
        ))}
      </div>

      {/* Google OAuth */}
      <Section
        title="Google OAuth"
        keys={['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']}
        settings={settings}
        showRestartWarning
        onSave={handleSaveSetting}
        savedKeys={savedKeys}
      />

      {/* Apple OAuth */}
      <Section
        title="Apple OAuth"
        keys={['APPLE_ID', 'APPLE_SECRET']}
        settings={settings}
        showRestartWarning
        onSave={handleSaveSetting}
        savedKeys={savedKeys}
      />

      {/* User Management */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-base font-semibold text-white mb-1">User Management</h2>
        <p className="text-xs text-gray-500 mb-4">
          Role changes take effect on next login.
        </p>
        {userError && (
          <p className="text-red-400 text-sm mb-3">{userError}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-800">
                <th className="pb-2 text-gray-400 font-medium">User</th>
                <th className="pb-2 text-gray-400 font-medium">Role</th>
                <th className="pb-2 text-gray-400 font-medium">Joined</th>
                <th className="pb-2 text-gray-400 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-3 pr-4">
                    <div className="text-gray-200">{user.name ?? '—'}</div>
                    <div className="text-gray-500 text-xs">{user.email}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-indigo-900/60 text-indigo-300'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    {user.id === currentUserId ? (
                      <span className="text-gray-600 text-xs">you</span>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                        disabled={userLoading === user.id}
                        className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 font-medium transition-colors"
                      >
                        {userLoading === user.id
                          ? 'Updating…'
                          : user.role === 'ADMIN' ? 'Demote' : 'Promote'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
