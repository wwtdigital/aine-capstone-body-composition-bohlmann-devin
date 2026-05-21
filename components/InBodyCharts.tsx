'use client'

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

type ChartReading = {
  date: string
  weight_lbs: number | null
  body_fat_pct: number | null
  lean_mass_lbs: number | null
}

type Props = {
  readings: ChartReading[]
}

export default function InBodyCharts({ readings }: Props) {
  if (readings.length < 2) return null

  return (
    <div className="space-y-5">
      <ChartBlock label="Weight (lbs)" dataKey="weight_lbs" readings={readings} />
      <ChartBlock label="Body Fat %" dataKey="body_fat_pct" readings={readings} />
      <ChartBlock label="Lean Mass (lbs)" dataKey="lean_mass_lbs" readings={readings} />
    </div>
  )
}

function ChartBlock({
  label,
  dataKey,
  readings,
}: {
  label: string
  dataKey: keyof ChartReading
  readings: ChartReading[]
}) {
  return (
    <div>
      <p className="text-ink2 text-xs font-semibold mb-1">{label}</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={readings} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-ink3)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-ink3)' }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
            width={40}
          />
          <Line
            type="monotone"
            dataKey={dataKey as string}
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
