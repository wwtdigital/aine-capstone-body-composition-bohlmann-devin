'use client'

import { useTheme } from 'next-themes'
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from 'recharts'

type DataPoint = { date: string; weight: number | null; bf: number | null; lean: number | null }

type Props = {
  data: DataPoint[]
  weightGoal: number
  bfGoal: number
}

export default function BodyCompCharts({ data, weightGoal, bfGoal }: Props) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme !== 'light'

  const axis = dark ? '#52525b' : '#a1a1aa'
  const tooltipStyle = {
    contentStyle: {
      background: dark ? '#18181b' : '#ffffff',
      border: `1px solid ${dark ? '#3f3f46' : '#e4e4e7'}`,
      borderRadius: 10,
      color: dark ? '#fff' : '#09090b',
    },
    labelStyle: { color: dark ? '#a1a1aa' : '#71717a' },
    itemStyle: { color: dark ? '#fff' : '#09090b' },
  }
  const axisProps = {
    tick: { fill: axis, fontSize: 11 },
    axisLine: false as const,
    tickLine: false as const,
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Weight (kg)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} domain={['auto', 'auto']} />
            <ReferenceLine y={weightGoal} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`, 'Weight']} />
            <Line type="monotone" dataKey="weight" stroke={dark ? '#e4e4e7' : '#27272a'} strokeWidth={2} dot={{ fill: dark ? '#e4e4e7' : '#27272a', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Body Fat %</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} domain={['auto', 'auto']} />
            <ReferenceLine y={bfGoal} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Body Fat']} />
            <Line type="monotone" dataKey="bf" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Lean Mass (kg)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} domain={['auto', 'auto']} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`, 'Lean Mass']} />
            <Line type="monotone" dataKey="lean" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
