'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredPrompt || dismissed) return null

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-3">
      <div className="bg-card border border-line rounded-2xl p-4 flex items-center gap-3 shadow-lg">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
          <Download size={18} className="text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ink text-sm font-semibold">Install BCC</p>
          <p className="text-ink3 text-xs">Add to home screen for the best experience</p>
        </div>
        <button onClick={handleInstall} className="shrink-0 px-3 py-1.5 bg-brand text-page text-xs font-semibold rounded-lg">
          Install
        </button>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-ink3">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
