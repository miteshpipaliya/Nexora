import React from 'react';
import { Users } from 'lucide-react';

export interface RegistrationCounterProps {
  registeredCount?: number;
  capacity?: number;
  showCapacity?: boolean;
  showProgressBar?: boolean;
  className?: string;
  label?: string;
}

/**
 * Pluralizes student count per R4:
 * 0 -> "Be the first to register"
 * 1 -> "1 student registered"
 * >1 -> "X students registered"
 */
export function formatStudentCount(count: number): string {
  if (!count || count <= 0) return 'Be the first to register';
  if (count === 1) return '1 student registered';
  return `${count} students registered`;
}

export const RegistrationCounter: React.FC<RegistrationCounterProps> = ({
  registeredCount = 0,
  capacity = 60,
  showCapacity = true,
  showProgressBar = false,
  className = '',
  label = 'registered'
}) => {
  const isSeatLimitOn = showCapacity !== false;

  if (!isSeatLimitOn) {
    return (
      <div className={`flex items-center gap-1.5 font-mono text-xs text-slate-300 ${className}`}>
        <Users className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <span>{formatStudentCount(registeredCount)}</span>
      </div>
    );
  }

  const safeCap = capacity > 0 ? capacity : 1;
  const percentage = Math.min(100, Math.round(((registeredCount || 0) / safeCap) * 100));

  return (
    <div className={`space-y-1.5 font-mono text-xs ${className}`}>
      <div className="flex items-center justify-between text-slate-300">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span>{registeredCount} / {capacity} {label}</span>
        </div>
        {showProgressBar && (
          <span className="text-[11px] text-violet-400 font-semibold">{percentage}%</span>
        )}
      </div>
      {showProgressBar && (
        <div className="w-full h-1.5 bg-[#11101B] rounded-full overflow-hidden border border-violet-500/20">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-purple-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
