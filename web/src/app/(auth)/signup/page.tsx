'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock } from 'lucide-react'
import { FormField } from '@/components/forms/FormField'
import { FormFieldPassword } from '@/components/forms/FormFieldPassword'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/toast/Toast'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Email is required')
      return
    }
    if (!/.+@.+\..+/.test(email)) {
      setError('Invalid email address')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen flex">
      {/* Left: Form Panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 sm:px-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <span className="text-2xl font-bold text-blue-600">Floqi</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
            <p className="mt-1 text-sm text-slate-500">Start your AI autopilot journey</p>
          </div>

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
            <FormFieldPassword
              label="Password"
              name="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showStrength={true}
              autoComplete="new-password"
              icon={<Lock className="h-4 w-4 text-slate-400" />}
            />

            {error && (
              <Toast
                id="signup-error"
                variant="error"
                message={error}
                onClose={(_id) => setError('')}
              />
            )}

            <Button type="submit" className="w-full" loading={loading} size="lg">
              Sign Up
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Have an account?{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign In
            </a>
          </p>
        </div>
      </div>

      {/* Right: Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 px-12">
        <div className="max-w-md text-center text-white">
          <div className="mb-6 text-4xl font-bold tracking-tight">Floqi</div>
          <h2 className="mb-4 text-2xl font-semibold">Start Automating Today</h2>
          <p className="text-blue-100 text-base leading-relaxed">
            Join Floqi and let AI handle your repetitive tasks. Connect your tools and set up automations in minutes.
          </p>
          <div className="mt-10 space-y-3 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <span className="text-blue-300">✦</span>
              Free to start — no credit card needed
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-300">✦</span>
              Connect Gmail, Calendar, and Notion
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-300">✦</span>
              5 ready-to-use automation templates
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
