'use client'

import { useEffect, useState } from 'react'
import { Sparkles, ChevronRight, TrendingUp } from 'lucide-react'
import FramedCard from '@/components/FramedCard'
import ISymbol from '@/components/ISymbol'

type Brief = {
  focus: string
  day_type: string
  headline: string
  actions: Array<{ label: string; reason: string }>
  trend: string
}

const DAY_TYPE_COLORS: Record<string, string> = {
  lift_day:       'bg-brand/15 text-brand',
  soccer_day:     'bg-ok/15 text-ok',
  rest_day:       'bg-surface text-ink3',
  recovery_focus: 'bg-warn/15 text-warn',
  refuel_day:     'bg-amber-500/15 text-amber-600',
  game_day:       'bg-ok/20 text-ok',
}

export default function DailyInsight() {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [fallback, setFallback] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/insight')
      .then(r => r.json())
      .then(d => {
        if (d.brief) setBrief(d.brief)
        else if (d.insight) setFallback(d.insight)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <FramedCard className="mx-4 mt-4 bg-card rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2 mb-3">
          <ISymbol size={14} className="text-ink3 opacity-60" />
          <span className="eyebrow">Daily Brief</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-surface rounded-full w-1/3 animate-pulse" />
          <div className="h-4 bg-surface rounded-full w-5/6 animate-pulse" />
          <div className="h-4 bg-surface rounded-full w-2/3 animate-pulse" />
        </div>
      </FramedCard>
    )
  }

  if (fallback) {
    return (
      <FramedCard className="mx-4 mt-4 rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/10 to-brand/5 p-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl bg-brand/20 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={14} className="text-brand" />
          </div>
          <div>
            <p className="text-brand text-xs font-semibold uppercase tracking-wider mb-1">Today's Insight</p>
            <p className="text-ink2 text-sm leading-relaxed">{fallback}</p>
          </div>
        </div>
      </FramedCard>
    )
  }

  if (!brief) return null

  const tagColor = DAY_TYPE_COLORS[brief.day_type] ?? 'bg-surface text-ink3'

  return (
    <FramedCard className="mx-4 mt-4 bg-card rounded-2xl border border-line overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <ISymbol size={14} className="text-ink3 opacity-60" />
          <span className="eyebrow">Daily Brief</span>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${tagColor}`}>
          {brief.focus}
        </span>
      </div>

      {/* Headline */}
      <div className="px-4 pb-4 border-b border-line">
        <p className="text-ink font-semibold text-sm leading-snug">{brief.headline}</p>
      </div>

      {/* Actions */}
      <div className="divide-y divide-line">
        {brief.actions.map((action, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <ChevronRight size={14} className="text-brand shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium">{action.label}</p>
              <p className="text-ink3 text-xs mt-0.5">{action.reason}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Trend footer */}
      <div className="flex items-start gap-2 px-4 py-3 bg-surface/60 border-t border-line">
        <TrendingUp size={13} className="text-ink3 shrink-0 mt-0.5" />
        <p className="text-ink3 text-xs leading-relaxed">{brief.trend}</p>
      </div>
    </FramedCard>
  )
}
