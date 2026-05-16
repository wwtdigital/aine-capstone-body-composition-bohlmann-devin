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

const AXIS = '#64748b'
const TOOLTIP = {
  contentStyle: { background: '#131822', border: '1px solid #1f2937', borderRadius: 10, color: '#f1f5f9' },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#f1f5f9' },
}
const AXIS_PROPS = {
  tick: { fill: AXIS, fontSize: 12 },
  axisLine: false as const,
  tickLine: false as const,
}

export default function WeekCharts({ days, calorieGoal, proteinGoal }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink3 mb-3">Calories</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} />
            <ReferenceLine y={calorieGoal} stroke="#4a9eff" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip {...TOOLTIP} />
            <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
              {days.map((d, i) => (
                <Cell key={i} fill={d.calories >= calorieGoal ? '#4a9eff' : '#1a2030'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink3 mb-3">Protein (g)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} />
            <ReferenceLine y={proteinGoal} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip {...TOOLTIP} />
            <Bar dataKey="protein" radius={[5, 5, 0, 0]}>
              {days.map((d, i) => (
                <Cell key={i} fill={d.protein >= proteinGoal ? '#10b981' : '#1a2030'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
