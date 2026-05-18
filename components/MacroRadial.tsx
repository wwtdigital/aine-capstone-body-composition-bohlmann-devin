'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'

type Props = {
  calories: number
  protein: number
  carbs: number
  fat: number
  calGoal: number
  proteinGoal: number
}

export default function MacroRadial({ calories, protein, carbs, fat, calGoal, proteinGoal }: Props) {
  const data = [
    { name: 'Protein', value: Math.round((protein / proteinGoal) * 100), fill: '#10b981', raw: `${Math.round(protein)}g` },
    { name: 'Carbs',   value: Math.round((carbs / 200) * 100),           fill: '#f59e0b', raw: `${Math.round(carbs)}g` },
    { name: 'Fat',     value: Math.round((fat / 80) * 100),              fill: '#a78bfa', raw: `${Math.round(fat)}g` },
  ].map(d => ({ ...d, value: Math.min(100, d.value) }))

  const calPct = Math.round((calories / calGoal) * 100)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <RadialBarChart
          cx="50%" cy="55%"
          innerRadius="40%" outerRadius="90%"
          data={data}
          startAngle={90} endAngle={-270}
          barSize={14}
        >
          <RadialBar background={{ fill: 'var(--color-surface, #e8e4db)' }} dataKey="value" cornerRadius={7} />
          <Tooltip
            contentStyle={{ background: '#131822', border: '1px solid #1f2937', borderRadius: 8, fontSize: 11 }}
            formatter={(value, name) => {
              const v = typeof value === 'number' ? value : 0
              const n = String(name ?? '')
              const item = data.find(d => d.name === n)
              return [`${item?.raw} (${v}%)`, n] as [string, string]
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: '10%' }}>
        <p className="text-ink font-bold text-2xl tabular-nums leading-none">{calories > 0 ? calories.toLocaleString() : '—'}</p>
        <p className="text-ink3 text-xs mt-0.5">{calPct}% of goal</p>
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-1">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
            <span className="text-ink3 text-xs">{d.name} {d.raw}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
