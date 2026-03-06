'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { StepIndicator, Step } from '@/components/ui/StepIndicator'

export interface WizardStep {
  label: string
  content: React.ReactNode
  validate?: () => boolean | Promise<boolean>
}

export interface WizardProps {
  steps: WizardStep[]
  currentStep: number
  onNext: () => void | Promise<void>
  onBack: () => void
  onSubmit: () => void | Promise<void>
  className?: string
}

export function Wizard({
  steps,
  currentStep,
  onNext,
  onBack,
  onSubmit,
  className,
}: WizardProps) {
  const [busy, setBusy] = React.useState(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)

  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const currentStepData = steps[currentStep]

  const indicatorSteps: Step[] = steps.map((step, index) => ({
    label: step.label,
    status:
      index < currentStep ? 'completed'
      : index === currentStep ? 'current'
      : 'pending',
  }))

  async function handleNext() {
    setValidationError(null)
    if (currentStepData?.validate) {
      setBusy(true)
      try {
        const valid = await currentStepData.validate()
        if (!valid) {
          setValidationError('Please complete all required fields before continuing.')
          return
        }
      } finally {
        setBusy(false)
      }
    }
    await onNext()
  }

  async function handleSubmit() {
    setValidationError(null)
    if (currentStepData?.validate) {
      setBusy(true)
      try {
        const valid = await currentStepData.validate()
        if (!valid) {
          setValidationError('Please complete all required fields before submitting.')
          return
        }
      } finally {
        setBusy(false)
      }
    }
    setBusy(true)
    try {
      await onSubmit()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Step indicator */}
      <StepIndicator steps={indicatorSteps} currentStep={currentStep} />

      {/* Step content */}
      <div
        role="tabpanel"
        aria-label={`Step ${currentStep + 1}: ${currentStepData?.label}`}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {currentStepData?.content}
      </div>

      {/* Validation error */}
      {validationError && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validationError}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={isFirst || busy}
          aria-label="Go to previous step"
        >
          Back
        </Button>

        <div className="flex items-center gap-2">
          {/* Step counter */}
          <span className="text-sm text-slate-400">
            {currentStep + 1} / {steps.length}
          </span>

          {isLast ? (
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={busy}
              aria-label="Submit form"
            >
              Submit
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleNext}
              loading={busy}
              aria-label="Go to next step"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
