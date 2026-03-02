'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface WorkoutPoint {
  activityType: string;
  durationMin: number | null;
}

export default function DeviceWorkoutsChart({ data }: { data: WorkoutPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No device workouts yet — sync from your device
      </div>
    );
  }

  // Aggregate by activityType
  const byType: Record<string, { count: number; totalMin: number }> = {};
  for (const w of data) {
    if (!byType[w.activityType]) byType[w.activityType] = { count: 0, totalMin: 0 };
    byType[w.activityType].count += 1;
    byType[w.activityType].totalMin += w.durationMin ?? 0;
  }

  const chartData = Object.entries(byType)
    .map(([type, v]) => ({
      type:    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count:   v.count,
      avgMin:  v.count > 0 ? Math.round(v.totalMin / v.count) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500 mb-1">Sessions by type (90d)</p>
        <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 32)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="type"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              width={110}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#f9fafb' }}
              itemStyle={{ color: '#818cf8' }}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#9ca3af', fontSize: 11 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
