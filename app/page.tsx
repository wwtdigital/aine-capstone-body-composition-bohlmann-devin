import Link from 'next/link'
import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'

export const revalidate = 0

type NutritionRow = { cal: number; prot: number }
type InBodyRow = { reading_date: number; weight_kg: number | null; body_fat_pct: number | null; lean_mass_kg: number | null }

export default async function Home() {
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()

  const [nutritionResult, inbodyResult] = await Promise.all([
    db.execute({
      sql: `SELECT COALESCE(SUM(total_calories), 0) as cal, COALESCE(SUM(total_protein), 0) as prot FROM meals WHERE user_id = 'will' AND logged_at >= ?`,
      args: [todayStart],
    }),
    db.execute({
      sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date DESC LIMIT 1`,
      args: [],
    }),
  ])

  const nutrition = nutritionResult.rows[0] as unknown as NutritionRow
  const latest = inbodyResult.rows[0] as unknown as InBodyRow | undefined

  const calPct = Math.min(100, Math.round((nutrition.cal / GOALS.daily_calories) * 100))
  const protPct = Math.min(100, Math.round((nutrition.prot / GOALS.daily_protein_g) * 100))

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pb-10">
      <div className="px-4 pt-12 pb-2">
        <h1 className="text-2xl font-bold text-white">Body Comp</h1>
        <p className="text-zinc-400 text-sm">{today}</p>
      </div>

      {/* Today's nutrition */}
      <div className="px-4 mt-6">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Today</p>
        <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-zinc-400 text-sm">Calories</span>
              <span className="text-white text-sm font-semibold">
                {Math.round(nutrition.cal)} <span className="text-zinc-500 font-normal">/ {GOALS.daily_calories}</span>
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${calPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-zinc-400 text-sm">Protein</span>
              <span className="text-white text-sm font-semibold">
                {Math.round(nutrition.prot)}g <span className="text-zinc-500 font-normal">/ {GOALS.daily_protein_g}g</span>
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${protPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Body comp snapshot */}
      {latest && (
        <div className="px-4 mt-5">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Body Composition</p>
          <div className="bg-zinc-900 rounded-xl p-4">
            <p className="text-zinc-500 text-xs mb-3">
              {new Date(latest.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-white font-bold text-lg">{latest.weight_kg?.toFixed(1) ?? '—'}</p>
                <p className="text-zinc-500 text-xs">kg</p>
                {latest.weight_kg != null && (
                  <p className={`text-xs mt-1 font-medium ${latest.weight_kg <= GOALS.weight_kg ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {latest.weight_kg > GOALS.weight_kg ? '+' : ''}{(latest.weight_kg - GOALS.weight_kg).toFixed(1)} to goal
                  </p>
                )}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{latest.body_fat_pct?.toFixed(1) ?? '—'}%</p>
                <p className="text-zinc-500 text-xs">body fat</p>
                {latest.body_fat_pct != null && (
                  <p className={`text-xs mt-1 font-medium ${latest.body_fat_pct <= GOALS.body_fat_pct ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {latest.body_fat_pct > GOALS.body_fat_pct ? '+' : ''}{(latest.body_fat_pct - GOALS.body_fat_pct).toFixed(1)}% to goal
                  </p>
                )}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{latest.lean_mass_kg?.toFixed(1) ?? '—'}</p>
                <p className="text-zinc-500 text-xs">lean kg</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="px-4 mt-6 space-y-3">
        {[
          { href: '/log', title: 'Log Meal', sub: 'Photo analysis' },
          { href: '/inbody', title: 'InBody', sub: 'Body comp readings' },
          { href: '/week', title: 'Week', sub: '7-day nutrition' },
          { href: '/month', title: 'Month', sub: 'Body comp trends' },
        ].map(({ href, title, sub }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95 transition-transform"
            style={{ minHeight: '60px' }}
          >
            <div>
              <p className="text-white font-semibold">{title}</p>
              <p className="text-zinc-400 text-sm">{sub}</p>
            </div>
            <span className="text-zinc-500 text-xl">→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
