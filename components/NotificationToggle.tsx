'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import FramedCard from '@/components/FramedCard'
import ISymbol from '@/components/ISymbol'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        on ? 'bg-brand' : 'bg-surface border border-line'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

type Prefs = {
  dailyReminder: boolean
  weeklyCheckin: boolean
  reminderHour: number
}

const HOUR_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

function formatHour(h: number) {
  if (h === 0) return '12 am'
  if (h < 12) return `${h} am`
  if (h === 12) return '12 pm'
  return `${h - 12} pm`
}

export default function NotificationToggle() {
  const [permission, setPermission] = useState<
    'default' | 'granted' | 'denied' | 'unsupported'
  >('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>({
    dailyReminder: true,
    weeklyCheckin: true,
    reminderHour: 18,
  })

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as 'default' | 'granted' | 'denied')
    const stored = localStorage.getItem('bcc-notif-subscribed')
    if (stored === 'true') setSubscribed(true)
  }, [])

  async function savePrefs(nextPrefs: Prefs) {
    if (!subscribed) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!sub) return
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), preferences: nextPrefs }),
        })
      } catch {
        // silent — prefs save is best-effort
      }
    }, 500)
  }

  function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    savePrefs(next)
  }

  async function handleSubscribe() {
    if (!VAPID_PUBLIC_KEY) return
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm as 'default' | 'granted' | 'denied')
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
      })

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), preferences: prefs }),
      })

      setSubscribed(true)
      localStorage.setItem('bcc-notif-subscribed', 'true')
    } catch {
      // subscribe failed — permission was likely denied or SW not ready
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setSubscribed(false)
      localStorage.removeItem('bcc-notif-subscribed')
    } catch {
      // unsubscribe failed — treat as unsubscribed anyway
      setSubscribed(false)
      localStorage.removeItem('bcc-notif-subscribed')
    } finally {
      setLoading(false)
    }
  }

  const vapidMissing = !VAPID_PUBLIC_KEY

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <ISymbol size={14} className="text-ink3 opacity-60" />
        <span className="eyebrow">Notifications</span>
      </div>

      <FramedCard className="bg-card rounded-2xl border border-line p-4 space-y-4">
        {permission === 'unsupported' ? (
          <p className="text-ink3 text-sm">Not supported in this browser.</p>
        ) : vapidMissing ? (
          <p className="text-ink3 text-sm">Notifications are not configured for this app.</p>
        ) : permission === 'denied' ? (
          <p className="text-ink3 text-sm">
            Notifications are blocked. Enable in Safari/Chrome settings.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-ink3" />
                <span className="text-ink font-medium text-sm">Enable notifications</span>
              </div>
              <Toggle
                on={subscribed}
                onChange={(v) => {
                  if (loading) return
                  v ? handleSubscribe() : handleUnsubscribe()
                }}
              />
            </div>

            {subscribed && (
              <div className="space-y-3 pt-1 border-t border-line">
                <div className="flex items-center justify-between">
                  <span className="text-ink3 text-sm">Daily reminder</span>
                  <Toggle
                    on={prefs.dailyReminder}
                    onChange={(v) => updatePref('dailyReminder', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink3 text-sm">Weekly check-in</span>
                  <Toggle
                    on={prefs.weeklyCheckin}
                    onChange={(v) => updatePref('weeklyCheckin', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink3 text-sm">Reminder time</span>
                  <select
                    value={prefs.reminderHour}
                    onChange={(e) => updatePref('reminderHour', Number(e.target.value))}
                    className="bg-surface text-ink text-sm rounded-xl px-3 py-2 border border-line focus:outline-none"
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </FramedCard>
    </div>
  )
}
