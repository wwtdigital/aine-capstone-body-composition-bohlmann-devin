'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Dumbbell, Bike } from 'lucide-react'
import FramedCard from '@/components/FramedCard'
import ISymbol from '@/components/ISymbol'
import WhoopNutritionCorrelation from '@/components/WhoopNutritionCorrelation'

type Block = {
  id: string
  name: string
  goal: string | null
  start_date: string
  end_date: string
  target_strength_days: number
  target_soccer_days: number
}

type Session = {
  id: string
  logged_at: number
  session_type: string
}

function isStrength(type: string) {
  return /strength|lift|gym|weight|squat|bench|dead/i.test(type)
}

function isSoccer(type: string) {
  return /soccer|cardio|run|bike|cycle|football|aerobic/i.test(type)
}

function classifySession(type: string): 'strength' | 'soccer' | 'other' {
  if (isStrength(type)) return 'strength'
  if (isSoccer(type)) return 'soccer'
  return 'other'
}

// Returns Monday of the week containing the given date
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toYMD(date: Date): string {
  return date.toISOString().split('T')[0]
}

function weeksBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const ms = end.getTime() - start.getTime()
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000))
}

function weeksRemaining(endDate: string): number {
  const end = new Date(endDate + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const ms = end.getTime() - now.getTime()
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000))
}

function formatDate(ymd: string): string {
  return new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Build 16-week calendar grid: array of 16 week columns, each with 7 days Mon-Sun
function buildCalendarGrid(sessions: Session[]): {
  weeks: { date: Date; ymd: string; inFuture: boolean; strength: boolean; soccer: boolean }[][]
  monthLabels: (string | null)[]
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Start of the 16-week window: Monday 15 weeks ago
  const gridStart = getMonday(today)
  gridStart.setDate(gridStart.getDate() - 15 * 7)

  // Build a set of session dates by type
  const byDate = new Map<string, { strength: boolean; soccer: boolean }>()
  for (const s of sessions) {
    const d = new Date(s.logged_at)
    const ymd = toYMD(d)
    const existing = byDate.get(ymd) ?? { strength: false, soccer: false }
    const cls = classifySession(s.session_type)
    if (cls === 'strength') existing.strength = true
    if (cls === 'soccer') existing.soccer = true
    byDate.set(ymd, existing)
  }

  const weeks: { date: Date; ymd: string; inFuture: boolean; strength: boolean; soccer: boolean }[][] = []
  const monthLabels: (string | null)[] = []
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  let lastMonth: number | null = null

  for (let w = 0; w < 16; w++) {
    const week: typeof weeks[0] = []
    const weekMonday = new Date(gridStart)
    weekMonday.setDate(gridStart.getDate() + w * 7)

    // Track month change for this column based on Monday's month
    const weekMonth = weekMonday.getMonth()
    if (weekMonth !== lastMonth) {
      monthLabels.push(MONTHS[weekMonth])
      lastMonth = weekMonth
    } else {
      monthLabels.push(null)
    }

    for (let d = 0; d < 7; d++) {
      const day = new Date(weekMonday)
      day.setDate(weekMonday.getDate() + d)
      const ymd = toYMD(day)
      const inFuture = day > today
      const entry = byDate.get(ymd)
      week.push({
        date: day,
        ymd,
        inFuture,
        strength: entry?.strength ?? false,
        soccer: entry?.soccer ?? false,
      })
    }
    weeks.push(week)
  }

  return { weeks, monthLabels }
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function TrainingPage() {
  const [block, setBlock] = useState<Block | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formGoal, setFormGoal] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formStrDays, setFormStrDays] = useState(4)
  const [formSocDays, setFormSocDays] = useState(2)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/training/blocks')
      .then((r) => r.json())
      .then((data) => {
        setBlock(data.block)
        setSessions(data.sessions ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!formName || !formStart || !formEnd) return
    setSaving(true)
    try {
      const res = await fetch('/api/training/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          goal: formGoal || undefined,
          startDate: formStart,
          endDate: formEnd,
          targetStrengthDays: formStrDays,
          targetSoccerDays: formSocDays,
        }),
      })
      if (res.ok) {
        // Refetch
        const updated = await fetch('/api/training/blocks').then((r) => r.json())
        setBlock(updated.block)
        setSessions(updated.sessions ?? [])
        setShowForm(false)
        setFormName('')
        setFormGoal('')
        setFormStart('')
        setFormEnd('')
        setFormStrDays(4)
        setFormSocDays(2)
      }
    } finally {
      setSaving(false)
    }
  }

  // Current week bounds (Mon-Sun)
  const now = new Date()
  const weekStart = getMonday(now)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const thisWeekSessions = sessions.filter((s) => {
    const t = s.logged_at
    return t >= weekStart.getTime() && t <= weekEnd.getTime()
  })

  const weekStrengthCount = thisWeekSessions.filter((s) => classifySession(s.session_type) === 'strength').length
  const weekSoccerCount = thisWeekSessions.filter((s) => classifySession(s.session_type) === 'soccer').length

  const { weeks, monthLabels } = buildCalendarGrid(sessions)

  const recentSessions = [...sessions].reverse().slice(0, 20)

  // Group sessions by calendar day
  const sessionsByDay: { dateLabel: string; ymd: string; items: Session[] }[] = []
  const seen = new Map<string, Session[]>()
  for (const s of recentSessions) {
    const d = new Date(s.logged_at)
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!seen.has(ymd)) seen.set(ymd, [])
    seen.get(ymd)!.push(s)
  }
  const todayYmd = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
  for (const [ymd, items] of seen.entries()) {
    const diffMs = new Date(todayYmd + 'T12:00:00').getTime() - new Date(ymd + 'T12:00:00').getTime()
    const diffDays = Math.round(diffMs / 86400000)
    const dateLabel = diffDays === 0 ? 'Today'
      : diffDays === 1 ? 'Yesterday'
      : new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    sessionsByDay.push({ dateLabel, ymd, items })
  }
  sessionsByDay.sort((a, b) => b.ymd.localeCompare(a.ymd))

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <Link href="/progress" className="flex items-center gap-1 text-brand text-sm font-semibold mb-4">
          <ChevronLeft size={16} />
          Progress
        </Link>
        <h1 className="text-3xl font-semibold text-ink tracking-tight">Training</h1>
        <p className="text-ink3 text-sm mt-0.5">Block tracker &middot; Session history</p>
      </div>

      <div className="px-4 space-y-8">
        {/* ── Section 1: Contribution Calendar ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <ISymbol size={14} className="text-ink3 opacity-60 shrink-0" />
            <span className="eyebrow shrink-0">Last 16 Weeks</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: 'fit-content' }}>
              {/* Month headers */}
              <div className="flex gap-0.5 mb-1 pl-4">
                {weeks.map((_, wi) => (
                  <div key={wi} className="w-2.5 flex-none">
                    {monthLabels[wi] ? (
                      <span className="text-[8px] text-ink4 font-medium leading-none block truncate">
                        {monthLabels[wi]}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Grid: 7 rows (Mon-Sun) × 16 cols */}
              <div className="flex gap-0.5">
                {/* Day labels */}
                <div className="flex flex-col gap-0.5 mr-1">
                  {DAY_LABELS.map((lbl, i) => (
                    <div
                      key={i}
                      className="w-3 h-2.5 flex items-center justify-center text-[7px] text-ink4 font-medium"
                    >
                      {i % 2 === 0 ? lbl : ''}
                    </div>
                  ))}
                </div>

                {/* Week columns */}
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((day) => {
                      let cellClass = 'bg-surface'
                      let ringClass = ''

                      if (day.inFuture) {
                        cellClass = 'bg-surface opacity-30'
                      } else if (day.strength && day.soccer) {
                        cellClass = 'bg-brand'
                        ringClass = 'ring-1 ring-ok'
                      } else if (day.strength) {
                        cellClass = 'bg-brand'
                      } else if (day.soccer) {
                        cellClass = 'bg-ok'
                      }

                      return (
                        <div
                          key={day.ymd}
                          title={day.ymd}
                          className={`w-2.5 h-2.5 rounded-sm ${cellClass} ${ringClass}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-brand" />
              <span className="text-[10px] text-ink3">Strength</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-ok" />
              <span className="text-[10px] text-ink3">Soccer / Cardio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-surface" />
              <span className="text-[10px] text-ink3">Rest</span>
            </div>
          </div>
        </section>

        {/* ── Section 2: Active Block ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <ISymbol size={14} className="text-ink3 opacity-60 shrink-0" />
            <span className="eyebrow shrink-0">Active Block</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {loading ? (
            <div className="h-24 bg-surface rounded-2xl animate-pulse" />
          ) : block ? (
            <FramedCard className="bg-card rounded-2xl border border-line p-4 space-y-4">
              <div>
                <p className="text-ink font-semibold text-lg leading-tight">{block.name}</p>
                {block.goal && (
                  <p className="text-ink3 text-sm mt-0.5">{block.goal}</p>
                )}
                <p className="text-ink4 text-xs mt-1.5">
                  {formatDate(block.start_date)} &rarr; {formatDate(block.end_date)}
                  {' '}
                  &middot;
                  {' '}
                  {weeksRemaining(block.end_date) > 0
                    ? `${weeksRemaining(block.end_date)}w remaining`
                    : 'Final week'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Dumbbell size={12} className="text-brand" />
                      <span className="text-xs text-ink3 font-medium">Strength this week</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-ink">
                      {weekStrengthCount} / {block.target_strength_days}
                    </span>
                  </div>
                  <ProgressBar value={weekStrengthCount} max={block.target_strength_days} color="bg-brand" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Bike size={12} className="text-ok" />
                      <span className="text-xs text-ink3 font-medium">Soccer / Cardio this week</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-ink">
                      {weekSoccerCount} / {block.target_soccer_days}
                    </span>
                  </div>
                  <ProgressBar value={weekSoccerCount} max={block.target_soccer_days} color="bg-ok" />
                </div>
              </div>
            </FramedCard>
          ) : (
            <FramedCard className="bg-card rounded-2xl border border-line p-8 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center">
                <Dumbbell size={22} className="text-ink3" />
              </div>
              <p className="text-ink2 text-sm font-semibold">No active training block</p>
              <p className="text-ink4 text-xs">Set a block to track weekly targets</p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand text-page text-xs font-semibold active:scale-95 transition-transform mt-1"
              >
                <Plus size={14} />
                Start a Training Block
              </button>
            </FramedCard>
          )}
        </section>

        {/* ── Section 3: New Block Form ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <ISymbol size={14} className="text-ink3 opacity-60 shrink-0" />
            <span className="eyebrow shrink-0">New Block</span>
            <div className="flex-1 h-px bg-line" />
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1 text-brand text-xs font-semibold shrink-0"
            >
              <Plus size={14} />
              {showForm ? 'Cancel' : 'Add'}
            </button>
          </div>

          {showForm && (
            <FramedCard className="bg-card rounded-2xl border border-line p-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-ink3 font-medium mb-1">Block name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Summer Recomp"
                    className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs text-ink3 font-medium mb-1">Goal</label>
                  <input
                    type="text"
                    value={formGoal}
                    onChange={(e) => setFormGoal(e.target.value)}
                    placeholder="e.g. Drop to 15% BF while holding LBM"
                    className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-ink3 font-medium mb-1">Start date</label>
                    <input
                      type="date"
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-ink3 font-medium mb-1">End date</label>
                    <input
                      type="date"
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-ink3 font-medium mb-1">Strength days/week</label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={formStrDays}
                      onChange={(e) => setFormStrDays(Number(e.target.value))}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-ink3 font-medium mb-1">Soccer days/week</label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={formSocDays}
                      onChange={(e) => setFormSocDays(Number(e.target.value))}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !formName || !formStart || !formEnd}
                className="w-full py-2.5 rounded-full bg-brand text-page text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save Block'}
              </button>
            </FramedCard>
          )}
        </section>

        {/* ── Section 4: WHOOP × Nutrition Correlation ── */}
        <div className="px-4 mt-4">
          <WhoopNutritionCorrelation />
        </div>

        {/* ── Section 5: Recent Sessions ── */}

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <ISymbol size={14} className="text-ink3 opacity-60 shrink-0" />
            <span className="eyebrow shrink-0">Recent Sessions</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {sessionsByDay.length === 0 ? (
            <div className="bg-card rounded-2xl border border-line p-8 text-center">
              <p className="text-ink3 text-sm">No sessions logged yet.</p>
            </div>
          ) : (
            <div className="pl-2">
              {sessionsByDay.map((day, di) => {
                const isLast = di === sessionsByDay.length - 1
                return (
                  <div key={day.ymd} className="flex gap-4">
                    {/* Timeline spine */}
                    <div className="flex flex-col items-center w-4 shrink-0">
                      <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${day.dateLabel === 'Today' ? 'bg-brand' : 'bg-ink4'}`} />
                      {!isLast && <div className="w-px flex-1 bg-line mt-1" />}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
                      <p className={`text-xs mb-1.5 ${day.dateLabel === 'Today' ? 'text-brand font-semibold' : 'text-ink4'}`}>
                        {day.dateLabel}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {day.items.map((s) => {
                          const cls = classifySession(s.session_type)
                          return (
                            <span
                              key={s.id}
                              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                cls === 'strength'
                                  ? 'bg-brand/15 text-brand'
                                  : cls === 'soccer'
                                  ? 'bg-ok/15 text-ok'
                                  : 'bg-surface text-ink3'
                              }`}
                            >
                              {s.session_type}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
