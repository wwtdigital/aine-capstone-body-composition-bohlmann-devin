'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

type TimingData = {
  hasData: boolean
  avgGapHours: number | null
  avgProteinSources: number
  daysAnalyzed: number
  optimalDays: number
  insight: string
}

export default function ProteinTimingCard() {
  const [data, setData] = useState<TimingData | null>(null)

  useEffect(() => {
    fetch('/api/protein-timing')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="bg-card rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-ink3" />
          <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Protein Timing</span>
        </div>
        <div className="h-4 bg-surface rounded-full w-1/2 animate-pulse" />
      </div>
    )
  }

  if (!data.hasData) {
    return (
      <div className="bg-card rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-ink3" />
          <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Protein Timing</span>
        </div>
        <p className="text-ink3 text-sm">Log meals with timestamps to unlock protein timing analysis.</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl border border-line p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-ink3" />
        <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Protein Timing</span>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold tabular-nums text-ink">
          {data.avgGapHours != null ? data.avgGapHours.toFixed(1) : '—'}
        </span>
        <span className="text-ink3 text-sm">h avg gap</span>
      </div>

      <div className="flex items-center gap-4 mb-3 pt-2 border-t border-line">
        <div className="text-center">
          <p className="text-ink font-semibold text-sm tabular-nums">{data.avgProteinSources}</p>
          <p className="text-ink3 text-xs mt-0.5">sources/day</p>
        </div>
        <div className="text-center">
          <p className="text-ink font-semibold text-sm tabular-nums">{data.optimalDays}/7</p>
          <p className="text-ink3 text-xs mt-0.5">days optimal</p>
        </div>
      </div>

      <p className="text-ink3 text-sm">{data.insight}</p>
    </div>
  )
}
