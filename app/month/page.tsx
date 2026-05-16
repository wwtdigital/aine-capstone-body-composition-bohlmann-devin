import Link from 'next/link'
import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import BodyCompCharts from './BodyCompCharts'

export const revalidate = 0

type Reading = {
  reading_date: number
  weight_kg: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
}

export default async function MonthPage() {
  const result = await db.execute({
    sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date ASC LIMIT 30`,
    args: [],
  })

  const readings = result.rows as unknown as Reading[]
  const latest = readings[readings.length - 1]

  const chartData = readings.map(r => ({
    date: new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: r.weight_kg,
    bf: r.body_fat_pct,
    lean: r.lean_mass_kg,
  }))

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pb-10">
      <div className="flex items-center gap-3 px-4 pt-10 pb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-xl font-bold text-white">Body Composition</h1>
      </div>

      {readings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">No InBody readings yet.</p>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* Progress to goals */}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Progress to Goals</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 rounded-xl p-4">
                <p className="text-zinc-400 text-xs mb-1">Weight</p>
                <p className="text-white font-bold text-xl">{latest.weight_kg?.toFixed(1) ?? '—'} <span className="text-zinc-500 text-sm font-normal">kg</span></p>
                <p className="text-zinc-500 text-xs mt-0.5">goal: {GOALS.weight_kg} kg</p>
                {latest.weight_kg != null && (
                  <p className={`text-xs mt-1.5 font-semibold ${latest.weight_kg <= GOALS.weight_kg ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {latest.weight_kg > GOALS.weight_kg ? '+' : ''}{(latest.weight_kg - GOALS.weight_kg).toFixed(1)} kg
                  </p>
                )}
              </div>
              <div className="bg-zinc-900 rounded-xl p-4">
                <p className="text-zinc-400 text-xs mb-1">Body Fat</p>
                <p className="text-white font-bold text-xl">{latest.body_fat_pct?.toFixed(1) ?? '—'}<span className="text-zinc-500 text-sm font-normal">%</span></p>
                <p className="text-zinc-500 text-xs mt-0.5">goal: {GOALS.body_fat_pct}%</p>
                {latest.body_fat_pct != null && (
                  <p className={`text-xs mt-1.5 font-semibold ${latest.body_fat_pct <= GOALS.body_fat_pct ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {latest.body_fat_pct > GOALS.body_fat_pct ? '+' : ''}{(latest.body_fat_pct - GOALS.body_fat_pct).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Charts — only show with 2+ data points */}
          {readings.length >= 2 && (
            <BodyCompCharts data={chartData} weightGoal={GOALS.weight_kg} bfGoal={GOALS.body_fat_pct} />
          )}

          {/* History list */}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">History</p>
            <div className="space-y-2">
              {[...readings].reverse().map(r => (
                <div key={r.reading_date} className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between">
                  <p className="text-zinc-300 text-sm">
                    {new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold">{r.weight_kg?.toFixed(1) ?? '—'}</p>
                      <p className="text-zinc-600 text-xs">kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold">{r.body_fat_pct?.toFixed(1) ?? '—'}%</p>
                      <p className="text-zinc-600 text-xs">bf</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold">{r.lean_mass_kg?.toFixed(1) ?? '—'}</p>
                      <p className="text-zinc-600 text-xs">lean</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
