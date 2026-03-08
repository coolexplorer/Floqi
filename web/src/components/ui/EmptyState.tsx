import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
        className
      )}
    >
      {/* Icon container */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Icon size={32} className="text-slate-400" aria-hidden="true" />
      </div>

      {/* Text */}
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>

      {/* Optional CTA */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
