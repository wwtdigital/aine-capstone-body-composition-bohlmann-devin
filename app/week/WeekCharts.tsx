'use client'

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
  const tooltipStyle = {
    contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 },
    labelStyle: { color: '#a1a1aa' },
    itemStyle: { color: '#fff' },
  }
  const axisProps = { tick: { fill: '#71717a', fontSize: 12 }, axisLine: false as const, tickLine: false as const }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-zinc-400 text-sm mb-3">Calories</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" {...axisProps} />
            <YAxis {...axisProps} />
            <ReferenceLine y={calorieGoal} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.7} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
              {days.map((d, i) => (
                <Cell key={i} fill={d.calories >= calorieGoal ? '#3b82f6' : '#1d4ed8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-zinc-400 text-sm mb-3">Protein (g)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" {...axisProps} />
            <YAxis {...axisProps} />
            <ReferenceLine y={proteinGoal} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.7} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="protein" radius={[4, 4, 0, 0]}>
              {days.map((d, i) => (
                <Cell key={i} fill={d.protein >= proteinGoal ? '#10b981' : '#065f46'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
