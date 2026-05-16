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

export default function BodyCompCharts({ data, weightGoal, bfGoal }: Props) {
  const tooltipStyle = {
    contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 },
    labelStyle: { color: '#a1a1aa' },
    itemStyle: { color: '#fff' },
  }
  const axisProps = { tick: { fill: '#71717a', fontSize: 11 }, axisLine: false as const, tickLine: false as const }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-zinc-400 text-sm mb-3">Weight (kg)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} domain={['auto', 'auto']} />
            <ReferenceLine y={weightGoal} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.7} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`, 'Weight']} />
            <Line type="monotone" dataKey="weight" stroke="#e4e4e7" strokeWidth={2} dot={{ fill: '#e4e4e7', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-zinc-400 text-sm mb-3">Body Fat %</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} domain={['auto', 'auto']} />
            <ReferenceLine y={bfGoal} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.7} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Body Fat']} />
            <Line type="monotone" dataKey="bf" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-zinc-400 text-sm mb-3">Lean Mass (kg)</p>
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
