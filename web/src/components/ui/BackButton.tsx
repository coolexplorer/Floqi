'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function BackButton({ href, label }: { href: string; label: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  )
}
