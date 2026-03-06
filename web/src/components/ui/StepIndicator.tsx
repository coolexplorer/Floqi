import * as React from 'react'
import { cn } from '@/lib/cn'

export type StepStatus = 'pending' | 'current' | 'completed'

export interface Step {
  label: string
  status: StepStatus
}

export interface StepIndicatorProps {
  steps: Step[]
  currentStep?: number
  className?: string
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const stepCircleStyles: Record<StepStatus, string> = {
  completed: 'bg-blue-600 text-white border-blue-600',
  current: 'bg-white text-blue-600 border-blue-600 ring-4 ring-blue-100',
  pending: 'bg-white text-slate-400 border-slate-300',
}

const stepLabelStyles: Record<StepStatus, string> = {
  completed: 'text-blue-700 font-medium',
  current: 'text-blue-600 font-semibold',
  pending: 'text-slate-400',
}

const connectorStyles: Record<StepStatus, string> = {
  completed: 'bg-blue-600',
  current: 'bg-slate-200',
  pending: 'bg-slate-200',
}

export function StepIndicator({ steps, className }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Progress"
      className={cn('flex items-start', className)}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        const connectorStatus =
          step.status === 'completed' ? 'completed' : 'pending'

        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center">
              {/* Step circle */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200',
                  stepCircleStyles[step.status]
                )}
                aria-current={step.status === 'current' ? 'step' : undefined}
              >
                {step.status === 'completed' ? (
                  <CheckIcon />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Step label */}
              <span
                className={cn(
                  'mt-2 text-xs transition-colors duration-200',
                  stepLabelStyles[step.status]
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="mt-4 flex-1 px-2">
                <div
                  className={cn(
                    'h-0.5 w-full transition-colors duration-300',
                    connectorStyles[connectorStatus]
                  )}
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
