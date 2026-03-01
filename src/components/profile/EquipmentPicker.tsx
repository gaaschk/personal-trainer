'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface EquipmentItem {
  id: string;
  name: string;
  category: string | null;
  notes: string | null;
}

interface GymMembership {
  id: string;
  gymName: string;
  address: string | null;
  equipment: string | null;
  active: boolean;
}

interface Props {
  equipment: EquipmentItem[];
  gyms: GymMembership[];
  onUpdate: () => void;
}

export default function EquipmentPicker({ equipment, gyms, onUpdate }: Props) {
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [showGymForm, setShowGymForm]     = useState(false);
  const [equipName, setEquipName]         = useState('');
  const [equipCategory, setEquipCategory] = useState('');
  const [gymName, setGymName]             = useState('');
  const [gymEquipment, setGymEquipment]   = useState('');
  const [saving, setSaving]               = useState(false);

  const categories = ['Weights', 'Cardio', 'Resistance', 'Bodyweight', 'Other'];

  async function addEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (!equipName.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: equipName.trim(), category: equipCategory || null }),
      });
      setEquipName('');
      setEquipCategory('');
      setShowEquipForm(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  async function removeEquipment(id: string) {
    await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
    onUpdate();
  }

  async function addGym(e: React.FormEvent) {
    e.preventDefault();
    if (!gymName.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gymName: gymName.trim(), equipment: gymEquipment.trim() || null }),
      });
      setGymName('');
      setGymEquipment('');
      setShowGymForm(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  async function removeGym(id: string) {
    await fetch(`/api/gym/${id}`, { method: 'DELETE' });
    onUpdate();
  }

  return (
    <div className="space-y-5">
      {/* Home Equipment */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">Home Equipment</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          {equipment.length === 0 && (
            <p className="text-sm text-gray-500">No home equipment added</p>
          )}
          {equipment.map((item) => (
            <div key={item.id} className="flex items-center gap-1">
              <Badge variant="blue">{item.name}</Badge>
              <button
                onClick={() => removeEquipment(item.id)}
                className="text-xs text-gray-500 hover:text-red-400"
              >×</button>
            </div>
          ))}
        </div>
        {showEquipForm ? (
          <form onSubmit={addEquipment} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Dumbbells, Pull-up bar"
                value={equipName}
                onChange={(e) => setEquipName(e.target.value)}
                autoFocus
              />
              <select
                className="rounded-lg bg-gray-700 border border-gray-600 text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={equipCategory}
                onChange={(e) => setEquipCategory(e.target.value)}
              >
                <option value="">Category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>Add</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowEquipForm(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setShowEquipForm(true)}>
            + Add Equipment
          </Button>
        )}
      </div>

      {/* Gym Memberships */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">Gym Memberships</h4>
        <div className="space-y-2 mb-2">
          {gyms.length === 0 && (
            <p className="text-sm text-gray-500">No gym memberships added</p>
          )}
          {gyms.map((gym) => (
            <div key={gym.id} className="flex items-start justify-between p-2 rounded-lg bg-gray-800 border border-gray-700">
              <div>
                <p className="text-sm font-medium text-white">{gym.gymName}</p>
                {gym.equipment && (
                  <p className="text-xs text-gray-500 mt-0.5">{gym.equipment}</p>
                )}
              </div>
              <button
                onClick={() => removeGym(gym.id)}
                className="text-xs text-gray-500 hover:text-red-400 ml-2"
              >×</button>
            </div>
          ))}
        </div>
        {showGymForm ? (
          <form onSubmit={addGym} className="flex flex-col gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700">
            <input
              className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Gym name, e.g. Planet Fitness"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              required
              autoFocus
            />
            <textarea
              className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Available equipment (optional)"
              rows={2}
              value={gymEquipment}
              onChange={(e) => setGymEquipment(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>Add</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowGymForm(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setShowGymForm(true)}>
            + Add Gym
          </Button>
        )}
      </div>
    </div>
  );
}
