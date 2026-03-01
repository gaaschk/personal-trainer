'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDateShort } from '@/lib/utils';

interface DataPoint {
  date: string;
  weightKg: number | null;
}

export default function WeightChart({ data }: { data: DataPoint[] }) {
  const formatted = data
    .filter((d) => d.weightKg !== null)
    .map((d) => ({
      date:   formatDateShort(d.date),
      weight: d.weightKg,
    }));

  if (formatted.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No weight data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <YAxis
          domain={['dataMin - 2', 'dataMax + 2']}
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          unit=" kg"
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#f9fafb' }}
          itemStyle={{ color: '#818cf8' }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3, fill: '#6366f1' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
