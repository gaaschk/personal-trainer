'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

export default function LogMeasurementButton() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [submitting, setSub]  = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate]       = useState(todayStr);
  const [weightKg, setWeight] = useState('');
  const [bodyFatPct, setBf]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weightKg && !bodyFatPct) {
      setError('Enter at least weight or body fat %.');
      return;
    }
    setSub(true);
    setError(null);
    try {
      const res = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          weightKg:   weightKg   ? parseFloat(weightKg)   : undefined,
          bodyFatPct: bodyFatPct ? parseFloat(bodyFatPct) : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to save measurement');
      setOpen(false);
      setWeight('');
      setBf('');
      setDate(todayStr);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSub(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Log measurement
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Log Measurement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="metric-date"
            label="Date"
            type="date"
            value={date}
            max={todayStr}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            id="metric-weight"
            label="Weight (kg)"
            type="number"
            step="0.1"
            min="0"
            placeholder="e.g. 75.5"
            value={weightKg}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Input
            id="metric-bf"
            label="Body fat % (optional)"
            type="number"
            step="0.1"
            min="0"
            max="60"
            placeholder="e.g. 18.5"
            value={bodyFatPct}
            onChange={(e) => setBf(e.target.value)}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
