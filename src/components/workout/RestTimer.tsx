'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
}

export default function RestTimer({ seconds, onComplete, onSkip }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [onComplete]);

  const pct = Math.round((remaining / seconds) * 100);

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#374151" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke="#6366f1" strokeWidth="8"
            strokeDasharray={`${276 * pct / 100} 276`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{remaining}</span>
          <span className="text-xs text-gray-400">sec rest</span>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onSkip}>Skip Rest</Button>
    </div>
  );
}
