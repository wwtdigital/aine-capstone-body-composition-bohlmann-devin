'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Activity, CheckCircle, AlertCircle, RefreshCw, Unlink, ExternalLink, Zap } from 'lucide-react'

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
    if (score == null) return 'text-ink3'
    if (score >= 67) return 'text-ok'
    if (score >= 34) return 'text-warn'
    return 'text-bad'
  }

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Settings</h1>
        <p className="text-ink3 text-sm">Integrations & preferences</p>
      </div>

      <div className="px-4 space-y-4">
        {banner === 'connected' && (
          <div className="flex items-center gap-3 bg-ok/10 border border-ok/30 rounded-2xl p-4">
            <CheckCircle size={18} className="text-ok shrink-0" />
            <p className="text-ok text-sm font-medium">Whoop connected! Sync to import your data.</p>
          </div>
        )}
        {banner === 'error' && (
          <div className="flex items-center gap-3 bg-bad/10 border border-bad/30 rounded-2xl p-4">
            <AlertCircle size={18} className="text-bad shrink-0" />
            <p className="text-bad text-sm font-medium">Whoop connection failed. Try again.</p>
          </div>
        )}

        {/* Whoop card */}
        <div className="bg-card rounded-2xl border border-line">
          <div className="p-4 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-bad/10 flex items-center justify-center">
                <Activity size={20} className="text-bad" />
              </div>
              <div className="flex-1">
                <p className="text-ink font-semibold">Whoop</p>
                <p className="text-ink3 text-xs">Recovery · HRV · Strain · Sleep</p>
              </div>
              {connected === true && (
                <span className="flex items-center gap-1 text-ok text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-ok inline-block" />
                  Connected
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {connected === null && (
              <div className="h-10 bg-surface rounded-xl animate-pulse" />
            )}

            {connected === false && (
              <a
                href="/api/whoop/auth"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand text-page font-semibold text-sm active:scale-95 transition-transform"
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
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand text-page font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {syncState === 'syncing' ? (
                    <><RefreshCw size={15} className="animate-spin" />Syncing...</>
                  ) : (
                    <><Zap size={15} />Sync Last 30 Days</>
                  )}
                </button>

                {syncState === 'done' && (
                  <p className="text-ok text-xs text-center font-medium">
                    {syncCount} day{syncCount !== 1 ? 's' : ''} synced
                  </p>
                )}
                {syncState === 'error' && (
                  <p className="text-bad text-xs text-center">{syncError}</p>
                )}

                <button
                  onClick={handleDisconnect}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-ink3 text-sm font-medium hover:text-bad transition-colors"
                >
                  <Unlink size={14} />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Whoop data */}
        {whoopData.length > 0 && (
          <div>
            <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Recent Whoop Data</p>
            <div className="bg-card rounded-2xl border border-line divide-y divide-line">
              {whoopData.slice(0, 7).map(day => (
                <div key={day.date} className="flex items-center px-4 py-3 gap-3">
                  <p className="text-ink3 text-xs w-16 shrink-0">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex-1 grid grid-cols-4 gap-1 text-center">
                    <div>
                      <p className={`text-sm font-bold tabular-nums ${recoveryColor(day.recovery_score)}`}>
                        {day.recovery_score ?? '—'}
                      </p>
                      <p className="text-ink3 text-xs">rec</p>
                    </div>
                    <div>
                      <p className="text-ink text-sm font-semibold tabular-nums">
                        {day.strain?.toFixed(1) ?? '—'}
                      </p>
                      <p className="text-ink3 text-xs">strain</p>
                    </div>
                    <div>
                      <p className="text-ink text-sm font-semibold tabular-nums">
                        {day.hrv_ms?.toFixed(0) ?? '—'}
                      </p>
                      <p className="text-ink3 text-xs">hrv</p>
                    </div>
                    <div>
                      <p className="text-ink text-sm font-semibold tabular-nums">
                        {day.sleep_minutes != null ? `${Math.floor(day.sleep_minutes / 60)}h${day.sleep_minutes % 60}m` : '—'}
                      </p>
                      <p className="text-ink3 text-xs">sleep</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals */}
        <div>
          <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Goals</p>
          <div className="bg-card rounded-2xl border border-line divide-y divide-line">
            {[
              { label: 'Target Weight', value: '81.6 kg (180 lbs)' },
              { label: 'Target Body Fat', value: '12%' },
              { label: 'Daily Calories', value: '2,500 kcal' },
              { label: 'Daily Protein', value: '200g' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3.5">
                <p className="text-ink2 text-sm">{label}</p>
                <p className="text-ink text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
