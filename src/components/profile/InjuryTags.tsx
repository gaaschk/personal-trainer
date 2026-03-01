'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface Injury {
  id: string;
  description: string;
  tag: string;
  active: boolean;
}

interface Props {
  injuries: Injury[];
  profileId: string;
  onUpdate: () => void;
}

export default function InjuryTags({ injuries, onUpdate }: Props) {
  const [description, setDescription] = useState('');
  const [adding, setAdding]           = useState(false);
  const [showForm, setShowForm]       = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setAdding(true);
    try {
      const tag = description.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await fetch('/api/profile/injuries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), tag }),
      });
      setDescription('');
      setShowForm(false);
      onUpdate();
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/profile/injuries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    onUpdate();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/profile/injuries/${id}`, { method: 'DELETE' });
    onUpdate();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {injuries.length === 0 && (
          <p className="text-sm text-gray-500">No injuries recorded</p>
        )}
        {injuries.map((injury) => (
          <div key={injury.id} className="flex items-center gap-1">
            <Badge variant={injury.active ? 'red' : 'default'}>
              {injury.description}
            </Badge>
            <button
              onClick={() => handleToggle(injury.id, injury.active)}
              className="text-xs text-gray-500 hover:text-gray-300"
              title={injury.active ? 'Mark resolved' : 'Mark active'}
            >
              {injury.active ? '✓' : '↻'}
            </button>
            <button
              onClick={() => handleDelete(injury.id)}
              className="text-xs text-gray-500 hover:text-red-400"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Left knee pain"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
          <Button type="submit" size="sm" disabled={adding}>Add</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
        </form>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
          + Add Injury
        </Button>
      )}
    </div>
  );
}
