'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDateShort } from '@/lib/utils';

interface Goal {
  id: string;
  type: string;
  title: string;
  targetDate: string | null;
  seasonStart: string | null;
  seasonEnd: string | null;
  active: boolean;
}

interface Props {
  goals: Goal[];
  onUpdate: () => void;
}

export default function GoalEditor({ goals, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'EVENT',
    title: '',
    targetDate: '',
    seasonStart: '',
    seasonEnd: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        form.type,
          title:       form.title.trim(),
          targetDate:  form.targetDate || undefined,
          seasonStart: form.seasonStart || undefined,
          seasonEnd:   form.seasonEnd || undefined,
        }),
      });
      setForm({ type: 'EVENT', title: '', targetDate: '', seasonStart: '', seasonEnd: '' });
      setShowForm(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    onUpdate();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    onUpdate();
  }

  const typeColors: Record<string, 'blue' | 'green' | 'yellow'> = {
    EVENT: 'blue',
    MAINTENANCE: 'green',
    SEASONAL: 'yellow',
  };

  return (
    <div className="space-y-2">
      {goals.length === 0 && (
        <p className="text-sm text-gray-500">No goals set yet</p>
      )}
      {goals.map((goal) => (
        <div
          key={goal.id}
          className={`flex items-start justify-between p-3 rounded-lg border ${
            goal.active ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800 opacity-60'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={typeColors[goal.type] ?? 'default'}>
                {goal.type.toLowerCase()}
              </Badge>
              {!goal.active && <Badge>resolved</Badge>}
            </div>
            <p className="text-sm font-medium text-white">{goal.title}</p>
            {goal.targetDate && (
              <p className="text-xs text-gray-500 mt-0.5">
                Target: {formatDateShort(goal.targetDate)}
              </p>
            )}
            {goal.seasonStart && goal.seasonEnd && (
              <p className="text-xs text-gray-500 mt-0.5">
                Season: {formatDateShort(goal.seasonStart)} – {formatDateShort(goal.seasonEnd)}
              </p>
            )}
          </div>
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => handleToggle(goal.id, goal.active)}
              className="text-xs text-gray-500 hover:text-gray-300 px-1.5 py-0.5"
            >
              {goal.active ? 'Done' : '↻'}
            </button>
            <button
              onClick={() => handleDelete(goal.id)}
              className="text-xs text-gray-500 hover:text-red-400 px-1.5 py-0.5"
            >
              ×
            </button>
          </div>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={handleAdd} className="p-3 rounded-lg bg-gray-800 border border-gray-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type</label>
              <select
                className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="EVENT">Event</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SEASONAL">Seasonal</option>
              </select>
            </div>
            {form.type === 'EVENT' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Target Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.targetDate}
                  onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                />
              </div>
            )}
          </div>
          <input
            className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Goal title, e.g. Run a half marathon"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            autoFocus
          />
          {form.type === 'SEASONAL' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Season Start</label>
                <input
                  type="date"
                  className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.seasonStart}
                  onChange={(e) => setForm((f) => ({ ...f, seasonStart: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Season End</label>
                <input
                  type="date"
                  className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.seasonEnd}
                  onChange={(e) => setForm((f) => ({ ...f, seasonEnd: e.target.value }))}
                />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : 'Add Goal'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
          + Add Goal
        </Button>
      )}
    </div>
  );
}
