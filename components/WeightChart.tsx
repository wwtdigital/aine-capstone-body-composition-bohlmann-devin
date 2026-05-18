'use client'

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

type Reading = {
  date: string
  weight_kg: number
  body_fat_pct: number | null
  lean_mass_kg: number | null
}

type Props = {
  readings: Reading[]
  goalWeight: number
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short' })
}

export default function WeightChart({ readings, goalWeight }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={readings} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="var(--color-line)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatMonth}
          tick={{ fontSize: 10, fill: 'var(--color-ink3)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="weight"
          orientation="left"
          tick={{ fontSize: 10, fill: 'var(--color-ink3)' }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <YAxis
          yAxisId="bf"
          orientation="right"
          tick={{ fontSize: 10, fill: 'var(--color-ink3)' }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-line)',
            borderRadius: 12,
            fontSize: 11,
            color: 'var(--color-ink)',
          }}
        />
        <ReferenceLine
          yAxisId="weight"
          y={goalWeight}
          stroke="var(--color-ink3)"
          strokeDasharray="4 2"
          label={{ value: 'Goal', fontSize: 10, fill: 'var(--color-ink3)' }}
        />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight_kg"
          stroke="#3d5afe"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="bf"
          type="monotone"
          dataKey="body_fat_pct"
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
