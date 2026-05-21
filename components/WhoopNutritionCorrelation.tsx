'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'

type StrainBucket = {
  protein: number
  calories: number
  days: number
}

type Data = {
  hasData: true
  highStrain: StrainBucket
  lowStrain: StrainBucket
} | {
  hasData: false
}

export default function WhoopNutritionCorrelation() {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    fetch('/api/whoop/nutrition-correlation')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ hasData: false }))
  }, [])

  if (!data) {
    return (
      <div className="bg-card rounded-2xl border border-line p-4 h-28 animate-pulse" />
    )
  }

  if (!data.hasData) {
    return (
      <div className="bg-card rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-ink3" />
          <span className="text-xs font-semibold text-ink uppercase tracking-wide">Training vs. Fueling</span>
        </div>
        <p className="text-ink3 text-sm">Connect WHOOP and log meals to see fueling patterns</p>
      </div>
    )
  }

  const { highStrain, lowStrain } = data
  const proteinDelta = Math.round(highStrain.protein - lowStrain.protein)
  const deltaColor = proteinDelta < 0 ? 'text-bad' : proteinDelta < 10 ? 'text-warn' : 'text-ok'
  const deltaLabel =
    proteinDelta < 0
      ? `${Math.abs(proteinDelta)}g under on hard days`
      : `${proteinDelta}g more on hard days`

  return (
    <div className="bg-card rounded-2xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap size={14} className="text-brand" />
        <span className="text-xs font-semibold text-ink uppercase tracking-wide">Training vs. Fueling</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-ink3 uppercase tracking-wide">High Strain</p>
          <p className="text-xs text-ink4">{highStrain.days} days</p>
          <p className="text-sm font-semibold text-ink tabular-nums">
            {Math.round(highStrain.protein)}g protein
          </p>
          <p className="text-xs text-ink3 tabular-nums">
            {Math.round(highStrain.calories)} kcal
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-ink3 uppercase tracking-wide">Low Strain</p>
          <p className="text-xs text-ink4">{lowStrain.days} days</p>
          <p className="text-sm font-semibold text-ink tabular-nums">
            {Math.round(lowStrain.protein)}g protein
          </p>
          <p className="text-xs text-ink3 tabular-nums">
            {Math.round(lowStrain.calories)} kcal
          </p>
        </div>
      </div>

      <div className="pt-1 border-t border-line">
        <p className={`text-xs font-medium ${deltaColor}`}>{deltaLabel}</p>
      </div>
    </div>
  )
}
