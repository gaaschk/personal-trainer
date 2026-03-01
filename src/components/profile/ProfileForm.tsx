'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { calculateBMI, bmiCategory } from '@/lib/metrics';

interface ProfileData {
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  fitnessLevel: string;
  notes: string | null;
}

interface Props {
  initial: ProfileData;
  onSave: (data: ProfileData) => Promise<void>;
}

export default function ProfileForm({ initial, onSave }: Props) {
  const [form, setForm] = useState({
    age:          initial.age?.toString() ?? '',
    weightKg:     initial.weightKg?.toString() ?? '',
    heightCm:     initial.heightCm?.toString() ?? '',
    fitnessLevel: initial.fitnessLevel ?? 'BEGINNER',
    notes:        initial.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const bmi = form.weightKg && form.heightCm
    ? calculateBMI(parseFloat(form.weightKg), parseFloat(form.heightCm))
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        age:          form.age ? parseInt(form.age) : null,
        weightKg:     form.weightKg ? parseFloat(form.weightKg) : null,
        heightCm:     form.heightCm ? parseFloat(form.heightCm) : null,
        fitnessLevel: form.fitnessLevel,
        notes:        form.notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="age"
          label="Age"
          type="number"
          min={10}
          max={120}
          placeholder="32"
          {...field('age')}
        />
        <Input
          id="weightKg"
          label="Weight (kg)"
          type="number"
          step="0.1"
          min={30}
          max={300}
          placeholder="75"
          {...field('weightKg')}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="heightCm"
          label="Height (cm)"
          type="number"
          step="0.1"
          min={100}
          max={250}
          placeholder="175"
          {...field('heightCm')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="fitnessLevel" className="text-sm font-medium text-gray-300">
            Fitness Level
          </label>
          <select
            id="fitnessLevel"
            value={form.fitnessLevel}
            onChange={(e) => setForm((f) => ({ ...f, fitnessLevel: e.target.value }))}
            className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
      </div>

      {bmi !== null && (
        <div className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm">
          <span className="text-gray-400">BMI: </span>
          <span className="text-white font-medium">{bmi}</span>
          <span className="text-gray-500 ml-2">({bmiCategory(bmi)})</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium text-gray-300">
          Notes (medical history, preferences)
        </label>
        <textarea
          id="notes"
          rows={3}
          className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Any relevant health notes..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Profile'}
      </Button>
    </form>
  );
}
