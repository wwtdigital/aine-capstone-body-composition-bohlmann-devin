'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Activity, CheckCircle, AlertCircle, RefreshCw, Unlink, ExternalLink, Zap } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import FramedCard from '@/components/FramedCard'
import ISymbol from '@/components/ISymbol'
import NotificationToggle from '@/components/NotificationToggle'

type Goals = {
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fat_g: number
  target_body_fat_pct: number
  target_lean_mass_kg: number
  daily_sleep_hours: number
}

const GOAL_DEFAULTS: Goals = {
  daily_calories: 2500,
  daily_protein_g: 200,
  daily_carbs_g: 200,
  daily_fat_g: 80,
  target_body_fat_pct: 12,
  target_lean_mass_kg: 80,
  daily_sleep_hours: 8,
}

const GOAL_FIELDS: { key: keyof Goals; label: string; step: number }[] = [
  { key: 'daily_calories',      label: 'Daily Calories',      step: 50 },
  { key: 'daily_protein_g',     label: 'Daily Protein (g)',   step: 1 },
  { key: 'daily_carbs_g',       label: 'Daily Carbs (g)',     step: 1 },
  { key: 'daily_fat_g',         label: 'Daily Fat (g)',       step: 1 },
  { key: 'target_body_fat_pct', label: 'Target Body Fat (%)', step: 0.1 },
  { key: 'target_lean_mass_kg', label: 'Target Lean Mass (kg)', step: 0.1 },
  { key: 'daily_sleep_hours',   label: 'Target Sleep (hrs)',  step: 0.5 },
]

const ACCENT_OPTIONS: { value: string; color: string }[] = [
  { value: 'blue',   color: '#4a9eff' },
  { value: 'green',  color: '#10b981' },
  { value: 'purple', color: '#8b5cf6' },
  { value: 'amber',  color: '#f59e0b' },
  { value: 'red',    color: '#ef4444' },
  { value: 'teal',   color: '#06b6d4' },
]

function AppearanceSection() {
  const { mode, setMode, accent, setAccent } = useTheme()

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <ISymbol size={14} className="text-ink3 opacity-60" />
        <span className="eyebrow">Appearance</span>
      </div>
      <FramedCard className="bg-card rounded-2xl border border-line p-4 space-y-4">
        <div>
          <p className="text-ink3 text-xs font-medium mb-2">Mode</p>
          <div className="flex gap-2">
            {(['light', 'dark', 'auto'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
                  mode === m
                    ? 'bg-brand text-page'
                    : 'bg-surface text-ink3'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-ink3 text-xs font-medium mb-2">Color</p>
          <div className="flex gap-3">
            {ACCENT_OPTIONS.map(({ value, color }) => (
              <button
                key={value}
                onClick={() => setAccent(value as any)}
                className={`w-[26px] h-[26px] rounded-full transition-all ${
                  accent === value
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-card'
                    : ''
                }`}
                style={{ backgroundColor: color }}
                aria-label={value}
              />
            ))}
          </div>
        </div>
      </FramedCard>
    </div>
  )
}

function GoalsSection() {
  const [goals, setGoals] = useState<Goals>(GOAL_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then(data => { setGoals(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaveState('saving')
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goals),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
    setTimeout(() => setSaveState('idle'), 2500)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <ISymbol size={14} className="text-ink3 opacity-60" />
        <span className="eyebrow">Goals</span>
      </div>
      <FramedCard className="bg-card rounded-2xl border border-line p-4 space-y-3">
        {loading ? (
          <div className="h-48 bg-surface rounded-xl animate-pulse" />
        ) : (
          <>
            {GOAL_FIELDS.map(({ key, label, step }) => (
              <div key={key}>
                <label className="text-ink3 text-xs font-medium block mb-1">{label}</label>
                <input
                  type="number"
                  step={step}
                  value={goals[key]}
                  onChange={e => setGoals(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-surface rounded-xl px-4 py-3 text-ink border border-line focus:outline-none"
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="w-full bg-brand text-page font-semibold rounded-full py-3 mt-1 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {saveState === 'saving' ? 'Saving… ›' : 'Save Goals ›'}
            </button>
            {saveState === 'saved' && (
              <p className="text-ok text-xs text-center font-medium">Saved</p>
            )}
            {saveState === 'error' && (
              <p className="text-bad text-xs text-center">Failed to save. Try again.</p>
            )}
          </>
        )}
      </FramedCard>
    </div>
  )
}

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
      // Auto-sync if data is stale (missing today or yesterday)
      if (data.connected) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (!data.latestDataDate || data.latestDataDate < yesterday) {
          triggerAutoSync()
        }
      }
    } catch {
      setConnected(false)
    }
  }

  async function triggerAutoSync() {
    setSyncState('syncing')
    try {
      const res = await fetch('/api/whoop/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncCount(data.synced)
        setSyncState('done')
        // Refresh data silently
        const statusRes = await fetch('/api/whoop/status')
        const statusData = await statusRes.json()
        if (statusData.recent) setWhoopData(statusData.recent)
      } else {
        setSyncState('idle')
      }
    } catch {
      setSyncState('idle')
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
      // Refresh displayed data
      const statusRes = await fetch('/api/whoop/status')
      const statusData = await statusRes.json()
      if (statusData.recent) setWhoopData(statusData.recent)
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
        <h1 className="text-3xl font-semibold text-ink tracking-tight">Settings</h1>
        <p className="text-ink3 text-sm">Integrations & preferences</p>
      </div>

      <div className="px-4 space-y-4">
        <AppearanceSection />

        {banner === 'connected' && (
          <div className="flex items-center gap-3 bg-ok/10 border border-ok/30 rounded-2xl p-4">
            <CheckCircle size={18} className="text-ok shrink-0" />
            <p className="text-ok text-sm font-medium">Whoop connected! Sync to import your data.</p>
          </div>
        )}
        {banner === 'error' && (
          <div className="bg-bad/10 border border-bad/30 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-bad shrink-0" />
              <p className="text-bad text-sm font-medium">Whoop connection failed. Try again.</p>
            </div>
            {searchParams.get('detail') && (
              <p className="text-bad/70 text-xs pl-7 font-mono break-all">{searchParams.get('detail')}</p>
            )}
          </div>
        )}

        {/* Whoop card */}
        <FramedCard className="bg-card rounded-2xl border border-line">
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
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-brand text-page font-semibold text-sm active:scale-95 transition-transform"
              >
                <ExternalLink size={15} />
                Connect Whoop ›
              </a>
            )}

            {connected === true && (
              <div className="space-y-2">
                <button
                  onClick={handleSync}
                  disabled={syncState === 'syncing'}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-brand text-page font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {syncState === 'syncing' ? (
                    <><RefreshCw size={15} className="animate-spin" />Syncing... ›</>
                  ) : (
                    <><Zap size={15} />Sync Last 30 Days ›</>
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
        </FramedCard>

        {/* Recent Whoop data */}
        {whoopData.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <ISymbol size={14} className="text-ink3 opacity-60" />
              <span className="eyebrow">Recent Whoop Data</span>
            </div>
            <FramedCard className="bg-card rounded-2xl border border-line divide-y divide-line">
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
            </FramedCard>
          </div>
        )}

        {/* Notifications */}
        <NotificationToggle />

        {/* Goals */}
        <GoalsSection />
      </div>
    </div>
  )
}
