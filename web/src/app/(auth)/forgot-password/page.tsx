'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail } from 'lucide-react'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/toast/Toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email) { setError('Email is required'); return }
    setLoading(true)
    const supabase = createClient()
    const origin = window.location.origin
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })
    setLoading(false)
    if (resetError) { setError(resetError.message); return }
    setSuccess(true)
  }

  return (
    <main className="min-h-screen flex">
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="mb-8 lg:hidden">
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">Floqi</Link>
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll send you a reset link</p>
          </div>
          {success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Check your email for a password reset link.
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <FormField
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                icon={<Mail className="h-4 w-4 text-slate-400" />}
              />
              {error && <Toast id="forgot-error" variant="error" message={error} onClose={(_id) => setError('')} />}
              <Button type="submit" className="w-full" loading={loading} size="lg">
                Send Reset Link
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-slate-500">
            Remember your password?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign In</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 px-12">
        <div className="max-w-md text-center text-white">
          <Link href="/" className="block mb-6 text-4xl font-bold tracking-tight hover:opacity-90">Floqi</Link>
          <h2 className="mb-4 text-2xl font-semibold">Your AI Personal Autopilot</h2>
          <p className="text-blue-100 text-base leading-relaxed">
            Automate your daily workflows with AI. Morning briefings, email triage, reading digests — all on autopilot.
          </p>
        </div>
      </div>
    </main>
  )
}
