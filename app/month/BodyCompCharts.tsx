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

const TOOLTIP = {
  contentStyle: { background: 'var(--color-card)', border: '1px solid var(--color-line)', borderRadius: 10, color: 'var(--color-ink)' },
  labelStyle: { color: 'var(--color-ink3)' },
  itemStyle: { color: 'var(--color-ink)' },
}
const AXIS_PROPS = {
  tick: { fill: 'var(--color-ink3)', fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
}

export default function BodyCompCharts({ data, weightGoal, bfGoal }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink3 mb-3">Weight (lbs)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} domain={['auto', 'auto']} />
            <ReferenceLine y={weightGoal} stroke="#4a9eff" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip {...TOOLTIP} formatter={(v) => [`${v} lbs`, 'Weight']} />
            <Line type="monotone" dataKey="weight" stroke="var(--color-ink)" strokeWidth={2} dot={{ fill: 'var(--color-ink)', r: 3 }} connectNulls />
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
        <p className="text-xs font-semibold uppercase tracking-wider text-ink3 mb-3">Lean Mass (lbs)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} domain={['auto', 'auto']} />
            <Tooltip {...TOOLTIP} formatter={(v) => [`${v} lbs`, 'Lean Mass']} />
            <Line type="monotone" dataKey="lean" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
