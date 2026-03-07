'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export interface PricingPlan {
  name: string
  price: string
  priceSubtext?: string
  features: PricingFeature[]
  popular?: boolean
  ctaLabel: string
  onCta?: () => void
}

export interface PricingFeature {
  label: string
  included: boolean | string
}

export interface PricingTableProps {
  plans: PricingPlan[]
  className?: string
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-label="Included" role="img">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg className="h-5 w-5 text-slate-300" viewBox="0 0 20 20" fill="currentColor" aria-label="Not included" role="img">
      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  )
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 transition-shadow',
        plan.popular
          ? 'border-blue-500 bg-white shadow-xl ring-2 ring-blue-500'
          : 'border-slate-200 bg-white shadow-sm hover:shadow-md'
      )}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge variant="info" size="sm">
            Most Popular
          </Badge>
        </div>
      )}

      {/* Plan header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800">{plan.name}</h3>
        <div className="mt-3 flex items-end gap-1">
          <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
          {plan.priceSubtext && (
            <span className="mb-1 text-sm text-slate-500">{plan.priceSubtext}</span>
          )}
        </div>
      </div>

      {/* CTA button */}
      <Button
        variant={plan.popular ? 'primary' : 'outline'}
        className="w-full"
        onClick={plan.onCta}
        aria-label={`${plan.ctaLabel} for ${plan.name} plan`}
      >
        {plan.ctaLabel}
      </Button>

      {/* Divider */}
      <div className="my-6 border-t border-slate-100" aria-hidden="true" />

      {/* Features list */}
      <ul className="flex flex-col gap-3" role="list" aria-label={`${plan.name} plan features`}>
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0">
              {feature.included ? <CheckIcon /> : <MinusIcon />}
            </span>
            <span className={cn(
              'text-sm',
              feature.included ? 'text-slate-700' : 'text-slate-400'
            )}>
              {typeof feature.included === 'string' ? feature.included : feature.label}
              {typeof feature.included === 'string' && feature.label !== feature.included && (
                <span className="text-slate-500"> — {feature.label}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PricingTable({ plans, className }: PricingTableProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
      role="list"
      aria-label="Pricing plans"
    >
      {plans.map((plan, index) => (
        <div key={index} role="listitem">
          <PricingCard plan={plan} />
        </div>
      ))}
    </div>
  )
}
