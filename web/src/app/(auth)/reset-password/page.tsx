'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Lock } from 'lucide-react'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/toast/Toast'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Timeout: if PASSWORD_RECOVERY event doesn't fire within 10s, show error
    const timeout = setTimeout(() => {
      setExpired((prev) => {
        // Only set expired if not already ready
        if (!ready) return true
        return prev
      })
    }, 10000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) { setError(updateError.message); return }
    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen flex">
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="mb-8 lg:hidden">
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">Floqi</Link>
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Set new password</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your new password below</p>
          </div>
          {expired ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              This reset link has expired or is invalid. Please request a new one.
            </div>
          ) : !ready ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Verifying your reset link...
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <FormField
                label="New Password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                icon={<Lock className="h-4 w-4 text-slate-400" />}
              />
              <FormField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                icon={<Lock className="h-4 w-4 text-slate-400" />}
              />
              {error && <Toast id="reset-error" variant="error" message={error} onClose={(_id) => setError('')} />}
              <Button type="submit" className="w-full" loading={loading} size="lg">
                Update Password
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">Back to Sign In</Link>
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
