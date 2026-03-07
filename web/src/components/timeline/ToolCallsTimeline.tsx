'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'
import { ToolCallStep, ToolCallStatus } from './ToolCallStep'

export interface ToolCall {
  id: string
  toolName: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  duration: number
  status: ToolCallStatus
}

export interface ToolCallsTimelineProps {
  toolCalls: ToolCall[]
  className?: string
}

function SummaryIcon({ type }: { type: 'time' | 'success' | 'error' }) {
  if (type === 'time') {
    return (
      <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    )
  }
  if (type === 'success') {
    return (
      <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  }
  return (
    <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  )
}

function formatTotalDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

export function ToolCallsTimeline({ toolCalls, className }: ToolCallsTimelineProps) {
  const totalDuration = toolCalls.reduce((sum, tc) => sum + tc.duration, 0)
  const successCount = toolCalls.filter((tc) => tc.status === 'success').length
  const errorCount = toolCalls.filter((tc) => tc.status === 'error').length

  if (toolCalls.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-slate-400', className)}>
        <svg className="mb-3 h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">No tool calls recorded</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Scrollable steps area */}
      <div className="max-h-[600px] overflow-y-auto">
        <div className="relative">
          {toolCalls.map((tc, index) => {
            const isLast = index === toolCalls.length - 1
            return (
              <div key={tc.id} className="relative flex gap-4">
                {/* Timeline spine */}
                <div className="flex flex-col items-center" aria-hidden="true">
                  {/* Dot */}
                  <div className={cn(
                    'mt-3.5 h-3 w-3 shrink-0 rounded-full border-2',
                    tc.status === 'success' && 'border-green-500 bg-green-100',
                    tc.status === 'error' && 'border-red-500 bg-red-100',
                    tc.status === 'pending' && 'border-blue-500 bg-blue-100'
                  )} />
                  {/* Connector line */}
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-slate-200 mt-1" style={{ minHeight: '16px' }} />
                  )}
                </div>

                {/* Step card */}
                <div className={cn('min-w-0 flex-1', isLast ? 'pb-0' : 'pb-3')}>
                  <ToolCallStep
                    toolName={tc.toolName}
                    input={tc.input}
                    output={tc.output}
                    duration={tc.duration}
                    status={tc.status}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary footer */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <SummaryIcon type="time" />
          <span className="text-sm text-slate-600">
            Total: <span className="font-semibold text-slate-800">{formatTotalDuration(totalDuration)}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <SummaryIcon type="success" />
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-green-700">{successCount}</span> succeeded
          </span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5">
            <SummaryIcon type="error" />
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-red-600">{errorCount}</span> failed
            </span>
          </div>
        )}
        <div className="ml-auto text-sm text-slate-400">
          {toolCalls.length} step{toolCalls.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
