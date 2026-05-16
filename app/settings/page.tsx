'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Activity, CheckCircle, AlertCircle, RefreshCw, Unlink, ExternalLink, Zap } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

type WhoopDay = {
  date: string
  recovery_score: number | null
  strain: number | null
  hrv_ms: number | null
  rhr: number | null
  sleep_minutes: number | null
}

type SyncState = 'idle' | 'syncing' | 'done' | 'error'

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [connected, setConnected] = useState<boolean | null>(null)
  const [whoopData, setWhoopData] = useState<WhoopDay[]>([])
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncCount, setSyncCount] = useState(0)
  const [syncError, setSyncError] = useState('')
  const [banner, setBanner] = useState<'connected' | 'error' | null>(null)

  useEffect(() => {
    const status = searchParams.get('whoop')
    if (status === 'connected') setBanner('connected')
    if (status === 'error') setBanner('error')
    checkConnection()
  }, [])

  async function checkConnection() {
    try {
      const res = await fetch('/api/whoop/status')
      const data = await res.json()
      setConnected(data.connected)
      if (data.recent) setWhoopData(data.recent)
    } catch {
      setConnected(false)
    }
  }

  async function handleSync() {
    setSyncState('syncing')
    setSyncError('')
    try {
      const res = await fetch('/api/whoop/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncError(data.error ?? 'Sync failed')
        setSyncState('error')
        return
      }
      setSyncCount(data.synced)
      setSyncState('done')
      checkConnection()
    } catch {
      setSyncError('Connection error')
      setSyncState('error')
    }
  }

  async function handleDisconnect() {
    await fetch('/api/whoop/disconnect', { method: 'POST' })
    setConnected(false)
    setWhoopData([])
    router.replace('/settings')
  }

  function recoveryColor(score: number | null) {
    if (score == null) return 'text-zinc-400 dark:text-zinc-600'
    if (score >= 67) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 34) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="flex items-center justify-between px-4 pt-12 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm">Integrations & preferences</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="px-4 space-y-4">
        {/* OAuth result banner */}
        {banner === 'connected' && (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4">
            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">Whoop connected! Sync to import your data.</p>
          </div>
        )}
        {banner === 'error' && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-4">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">Whoop connection failed. Try again.</p>
          </div>
        )}

        {/* Whoop card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                <Activity size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-zinc-900 dark:text-white font-semibold">Whoop</p>
                <p className="text-zinc-500 dark:text-zinc-500 text-xs">Recovery · HRV · Strain · Sleep</p>
              </div>
              {connected === true && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Connected
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {connected === null && (
              <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            )}

            {connected === false && (
              <a
                href="/api/whoop/auth"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm active:scale-95 transition-transform"
              >
                <ExternalLink size={15} />
                Connect Whoop
              </a>
            )}

            {connected === true && (
              <div className="space-y-2">
                <button
                  onClick={handleSync}
                  disabled={syncState === 'syncing'}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {syncState === 'syncing' ? (
                    <><RefreshCw size={15} className="animate-spin" />Syncing...</>
                  ) : (
                    <><Zap size={15} />Sync Last 30 Days</>
                  )}
                </button>

                {syncState === 'done' && (
                  <p className="text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium">
                    {syncCount} day{syncCount !== 1 ? 's' : ''} synced
                  </p>
                )}
                {syncState === 'error' && (
                  <p className="text-red-600 dark:text-red-400 text-xs text-center">{syncError}</p>
                )}

                <button
                  onClick={handleDisconnect}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-zinc-500 dark:text-zinc-500 text-sm font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <Unlink size={14} />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Whoop recent data */}
        {whoopData.length > 0 && (
          <div>
            <p className="text-zinc-500 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Recent Whoop Data</p>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
              {whoopData.slice(0, 7).map(day => (
                <div key={day.date} className="flex items-center px-4 py-3 gap-3">
                  <p className="text-zinc-500 dark:text-zinc-500 text-xs w-16 shrink-0">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex-1 grid grid-cols-4 gap-1 text-center">
                    <div>
                      <p className={`text-sm font-bold tabular-nums ${recoveryColor(day.recovery_score)}`}>
                        {day.recovery_score ?? '—'}
                      </p>
                      <p className="text-zinc-400 dark:text-zinc-600 text-xs">rec</p>
                    </div>
                    <div>
                      <p className="text-zinc-900 dark:text-white text-sm font-semibold tabular-nums">
                        {day.strain?.toFixed(1) ?? '—'}
                      </p>
                      <p className="text-zinc-400 dark:text-zinc-600 text-xs">strain</p>
                    </div>
                    <div>
                      <p className="text-zinc-900 dark:text-white text-sm font-semibold tabular-nums">
                        {day.hrv_ms?.toFixed(0) ?? '—'}
                      </p>
                      <p className="text-zinc-400 dark:text-zinc-600 text-xs">hrv</p>
                    </div>
                    <div>
                      <p className="text-zinc-900 dark:text-white text-sm font-semibold tabular-nums">
                        {day.sleep_minutes != null ? `${Math.floor(day.sleep_minutes / 60)}h${day.sleep_minutes % 60}m` : '—'}
                      </p>
                      <p className="text-zinc-400 dark:text-zinc-600 text-xs">sleep</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals summary */}
        <div>
          <p className="text-zinc-500 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Goals</p>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {[
              { label: 'Target Weight', value: '81.6 kg (180 lbs)' },
              { label: 'Target Body Fat', value: '12%' },
              { label: 'Daily Calories', value: '2,500 kcal' },
              { label: 'Daily Protein', value: '200g' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3.5">
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">{label}</p>
                <p className="text-zinc-900 dark:text-white text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
