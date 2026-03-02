'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDateShort } from '@/lib/utils';

interface ActivityPoint {
  date: string;
  steps: number | null;
  activeCalories: number | null;
  exerciseMinutes: number | null;
}

export default function ActivityChart({ data }: { data: ActivityPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No activity data yet — sync from your device
      </div>
    );
  }

  const formatted = data.map((d) => ({
    date:            formatDateShort(d.date),
    steps:           d.steps ?? 0,
    calories:        d.activeCalories ?? 0,
    exerciseMins:    d.exerciseMinutes ?? 0,
  }));

  const hasSteps    = data.some((d) => d.steps !== null);
  const hasCalories = data.some((d) => d.activeCalories !== null);
  const hasMins     = data.some((d) => d.exerciseMinutes !== null);

  const tooltip = (
    <Tooltip
      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
      labelStyle={{ color: '#f9fafb' }}
      itemStyle={{ color: '#818cf8' }}
    />
  );

  return (
    <div className="space-y-4">
      {hasSteps && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Steps / day</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={formatted} margin={{ top: 4, right: 10, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              {tooltip}
              <Bar dataKey="steps" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasCalories && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Active calories / day</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={formatted} margin={{ top: 4, right: 10, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit=" kcal" />
              {tooltip}
              <Bar dataKey="calories" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasMins && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Exercise minutes / day</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={formatted} margin={{ top: 4, right: 10, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit=" min" />
              {tooltip}
              <Bar dataKey="exerciseMins" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
