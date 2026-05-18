'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

export default function DailyInsight() {
  const [insight, setInsight] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/insight')
      .then(r => r.json())
      .then(d => setInsight(d.insight))
      .catch(() => {})
  }, [])

  if (!insight) return null

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/10 to-brand/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-xl bg-brand/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-brand" />
        </div>
        <div>
          <p className="text-brand text-xs font-semibold uppercase tracking-wider mb-1">Today's Insight</p>
          <p className="text-ink2 text-sm leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  )
}
