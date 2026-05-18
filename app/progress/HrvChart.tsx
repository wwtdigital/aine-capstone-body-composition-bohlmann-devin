'use client'

import { LineChart, Line, XAxis, YAxis, ReferenceArea, ResponsiveContainer, Tooltip } from 'recharts'

type HrvPoint = { date: string; hrv: number | null }

export default function HrvChart({ data }: { data: HrvPoint[] }) {
  if (data.length < 2) return null

  const valid = data.filter(d => d.hrv != null).map(d => d.hrv as number)
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length
  const std = Math.sqrt(valid.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / valid.length)
  const bandLow = Math.round(mean - std)
  const bandHigh = Math.round(mean + std)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-ink3 text-xs font-semibold uppercase tracking-wider">HRV Trend (30d)</p>
        <p className="text-ink3 text-xs">baseline {bandLow}–{bandHigh}ms</p>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} />
          <ReferenceArea y1={bandLow} y2={bandHigh} fill="#4a9eff" fillOpacity={0.08} />
          <Tooltip
            contentStyle={{ background: '#131822', border: '1px solid #1f2937', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#4a9eff' }}
          />
          <Line type="monotone" dataKey="hrv" stroke="#4a9eff" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
