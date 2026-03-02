'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDateShort } from '@/lib/utils';

interface VitalsPoint {
  date: string;
  restingHR: number | null;
  hrvMs: number | null;
  spo2Pct: number | null;
  vo2MaxMl: number | null;
}

const tooltip = (
  <Tooltip
    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
    labelStyle={{ color: '#f9fafb' }}
    itemStyle={{ color: '#818cf8' }}
  />
);

function MiniChart({
  data,
  dataKey,
  label,
  unit,
  color,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  label: string;
  unit: string;
  color: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 10, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit={unit} domain={['dataMin - 2', 'dataMax + 2']} />
          {tooltip}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function VitalsChart({ data }: { data: VitalsPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No vitals data yet — sync from your device
      </div>
    );
  }

  const formatted = data.map((d) => ({
    date:      formatDateShort(d.date),
    restingHR: d.restingHR,
    hrv:       d.hrvMs !== null ? Math.round(d.hrvMs) : null,
    spo2:      d.spo2Pct !== null ? Math.round(d.spo2Pct * 10) / 10 : null,
    vo2:       d.vo2MaxMl !== null ? Math.round(d.vo2MaxMl * 10) / 10 : null,
  }));

  const hasHR   = data.some((d) => d.restingHR !== null);
  const hasHRV  = data.some((d) => d.hrvMs !== null);
  const hasSpo2 = data.some((d) => d.spo2Pct !== null);
  const hasVo2  = data.some((d) => d.vo2MaxMl !== null);

  type ChartRow = Record<string, string | number>;
  const hrData: ChartRow[]   = formatted.filter((d) => d.restingHR !== null) as ChartRow[];
  const hrvData: ChartRow[]  = formatted.filter((d) => d.hrv !== null) as ChartRow[];
  const spo2Data: ChartRow[] = formatted.filter((d) => d.spo2 !== null) as ChartRow[];
  const vo2Data: ChartRow[]  = formatted.filter((d) => d.vo2 !== null) as ChartRow[];

  return (
    <div className="space-y-4">
      {hasHR   && <MiniChart data={hrData}   dataKey="restingHR" label="Resting heart rate"      unit=" bpm" color="#f87171" />}
      {hasHRV  && <MiniChart data={hrvData}  dataKey="hrv"       label="Heart rate variability"  unit=" ms"  color="#818cf8" />}
      {hasSpo2 && <MiniChart data={spo2Data} dataKey="spo2"      label="Blood oxygen (SpO₂)"    unit="%"    color="#34d399" />}
      {hasVo2  && <MiniChart data={vo2Data}  dataKey="vo2"       label="VO₂ max"                unit=" ml/kg/min" color="#a78bfa" />}
    </div>
  );
}
