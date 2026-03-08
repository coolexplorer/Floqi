'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  children: React.ReactNode;
  className?: string;
}

interface TooltipCoords {
  top: number;
  left: number;
}

function getCoords(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  position: TooltipPosition,
  gap = 8
): TooltipCoords {
  switch (position) {
    case 'top':
      return {
        top: triggerRect.top - tooltipRect.height - gap + window.scrollY,
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2 + window.scrollX,
      };
    case 'bottom':
      return {
        top: triggerRect.bottom + gap + window.scrollY,
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2 + window.scrollX,
      };
    case 'left':
      return {
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2 + window.scrollY,
        left: triggerRect.left - tooltipRect.width - gap + window.scrollX,
      };
    case 'right':
      return {
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2 + window.scrollY,
        left: triggerRect.right + gap + window.scrollX,
      };
  }
}

const arrowClasses: Record<TooltipPosition, string> = {
  top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-0',
  bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-0',
  left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-0',
  right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-0',
};

export function Tooltip({
  content,
  position = 'top',
  children,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords>({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = React.useId();

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current || !tooltipRef.current) return;
    const triggerRect = wrapperRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    setCoords(getCoords(triggerRect, tooltipRect, position));
  }, [position]);

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(updatePosition);
    }
  }, [visible, updatePosition]);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const tooltip =
    visible && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={tooltipId}
            ref={tooltipRef}
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
            className={cn(
              'pointer-events-none fixed z-50 max-w-xs rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-md',
              className
            )}
          >
            {content}
            <span
              aria-hidden="true"
              className={cn('absolute h-0 w-0 border-4', arrowClasses[position])}
            />
          </div>,
          document.body
        )
      : null;

  const child = React.Children.only(children) as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  const enhancedChild = React.cloneElement(child, {
    'aria-describedby': visible ? tooltipId : undefined,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });

  return (
    <>
      <span ref={wrapperRef} className="relative inline-flex">
        {enhancedChild}
      </span>
      {tooltip}
    </>
  );
}
