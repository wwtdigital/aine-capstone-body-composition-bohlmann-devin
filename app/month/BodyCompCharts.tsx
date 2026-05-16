'use client'

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

const AXIS = '#64748b'
const TOOLTIP = {
  contentStyle: { background: '#131822', border: '1px solid #1f2937', borderRadius: 10, color: '#f1f5f9' },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#f1f5f9' },
}
const AXIS_PROPS = {
  tick: { fill: AXIS, fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
}

export default function BodyCompCharts({ data, weightGoal, bfGoal }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink3 mb-3">Weight (kg)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} domain={['auto', 'auto']} />
            <ReferenceLine y={weightGoal} stroke="#4a9eff" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip {...TOOLTIP} formatter={(v) => [`${v} kg`, 'Weight']} />
            <Line type="monotone" dataKey="weight" stroke="#f1f5f9" strokeWidth={2} dot={{ fill: '#f1f5f9', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink3 mb-3">Body Fat %</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} domain={['auto', 'auto']} />
            <ReferenceLine y={bfGoal} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip {...TOOLTIP} formatter={(v) => [`${v}%`, 'Body Fat']} />
            <Line type="monotone" dataKey="bf" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink3 mb-3">Lean Mass (kg)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} domain={['auto', 'auto']} />
            <Tooltip {...TOOLTIP} formatter={(v) => [`${v} kg`, 'Lean Mass']} />
            <Line type="monotone" dataKey="lean" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
