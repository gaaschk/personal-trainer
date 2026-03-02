'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { formatDateShort } from '@/lib/utils';

interface SleepPoint {
  startTime: string;
  durationHrs: number;
}

export default function SleepChart({ data }: { data: SleepPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No sleep data yet — sync from your device
      </div>
    );
  }

  const formatted = data.map((d) => ({
    date:  formatDateShort(d.startTime),
    hours: Math.round(d.durationHrs * 10) / 10,
  }));

  const avg = formatted.reduce((s, d) => s + d.hours, 0) / formatted.length;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        Avg {avg.toFixed(1)} hrs/night
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit=" hr" domain={[0, 10]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#f9fafb' }}
            itemStyle={{ color: '#2dd4bf' }}
          />
          <ReferenceLine y={8} stroke="#6b7280" strokeDasharray="4 4" label={{ value: '8 hr', fill: '#6b7280', fontSize: 11 }} />
          <Bar dataKey="hours" fill="#14b8a6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
