'use client'

import { useTheme } from 'next-themes'
import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip, Cell,
} from 'recharts'

type DayData = { day: string; calories: number; protein: number }

type Props = {
  days: DayData[]
  calorieGoal: number
  proteinGoal: number
}

export default function WeekCharts({ days, calorieGoal, proteinGoal }: Props) {
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
    tick: { fill: axis, fontSize: 12 },
    axisLine: false as const,
    tickLine: false as const,
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Calories</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" {...axisProps} />
            <YAxis {...axisProps} />
            <ReferenceLine y={calorieGoal} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
              {days.map((d, i) => (
                <Cell key={i} fill={d.calories >= calorieGoal ? '#3b82f6' : dark ? '#1e3a5f' : '#bfdbfe'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Protein (g)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" {...axisProps} />
            <YAxis {...axisProps} />
            <ReferenceLine y={proteinGoal} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="protein" radius={[5, 5, 0, 0]}>
              {days.map((d, i) => (
                <Cell key={i} fill={d.protein >= proteinGoal ? '#10b981' : dark ? '#064e3b' : '#a7f3d0'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
