import React from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'elevated' | 'outlined' | 'flat';

interface CardProps {
  variant?: CardVariant;
  padding?: string;
  className?: string;
  children: React.ReactNode;
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface CardBodyProps {
  className?: string;
  children: React.ReactNode;
}

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  elevated: 'bg-white shadow-md border border-slate-100',
  outlined: 'bg-white border border-slate-200',
  flat: 'bg-slate-50',
};

export function Card({
  variant = 'elevated',
  padding = 'p-6',
  className,
  children,
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl',
        variantClasses[variant],
        padding,
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: CardBodyProps) {
  return <div className={cn('', className)}>{children}</div>;
}

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4',
        className
      )}
    >
      {children}
    </div>
  );
}
