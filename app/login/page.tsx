'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ISymbol from '@/components/ISymbol'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  useEffect(() => {
    fetch('/api/auth/check').then(r => {
      if (r.ok) window.location.replace(next)
    }).catch(() => {})
  }, [next])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.replace(next)
      } else {
        setError('Wrong password.')
        setLoading(false)
      }
    } catch {
      setError('Connection error. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="framed bg-card rounded-2xl border border-line p-8">
          <span className="corner-tl" aria-hidden>+</span>
          <span className="corner-tr" aria-hidden>+</span>
          <span className="corner-bl" aria-hidden>+</span>
          <span className="corner-br" aria-hidden>+</span>

          <div className="flex items-center gap-2 mb-6">
            <ISymbol size={14} className="text-brand opacity-80" />
            <span className="eyebrow text-brand">Body Comp Copilot</span>
          </div>

          <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">Welcome back</h1>
          <p className="text-ink4 text-sm mb-8">Personal dashboard — enter password to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg bg-surface border border-line text-ink placeholder-ink4 focus:outline-none focus:border-brand text-base"
            />
            {error && <p className="text-bad text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-full bg-brand text-page font-semibold text-sm disabled:opacity-40 transition-opacity"
            >
              {loading ? 'Checking...' : 'Enter ›'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
