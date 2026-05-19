'use client'

import { useEffect } from 'react'

export default function OnboardingGate() {
  useEffect(() => {
    if (window.location.pathname === '/onboarding') return
    fetch('/api/onboarding')
      .then(r => (r.ok ? r.json() : null))
      .then((data: { completed: boolean } | null) => {
        if (data && !data.completed) {
          window.location.replace('/onboarding')
        }
      })
      .catch(() => {
        // silently fail — don't block the app if the check errors
      })
  }, [])

  return null
}
