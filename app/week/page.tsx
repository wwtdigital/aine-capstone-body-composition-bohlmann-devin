import Link from 'next/link'
import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import WeekCharts from './WeekCharts'

export const revalidate = 0

type DayRow = { day: string; calories: number; protein: number }

export default async function WeekPage() {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const result = await db.execute({
    sql: `SELECT date(logged_at/1000, 'unixepoch') as day, ROUND(SUM(total_calories)) as calories, ROUND(SUM(total_protein)) as protein FROM meals WHERE user_id = 'will' AND logged_at >= ? GROUP BY day ORDER BY day ASC`,
    args: [sevenDaysAgo],
  })

  const rows = result.rows as unknown as DayRow[]

  const days: DayData[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dayStr = d.toISOString().split('T')[0]
    const found = rows.find(r => r.day === dayStr)
    days.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: found ? Number(found.calories) : 0,
      protein: found ? Number(found.protein) : 0,
    })
  }

  const daysWithData = days.filter(d => d.calories > 0)
  const avgCal = daysWithData.length > 0 ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length) : 0
  const avgProt = daysWithData.length > 0 ? Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length) : 0

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pb-10">
      <div className="flex items-center gap-3 px-4 pt-10 pb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-xl font-bold text-white">Week</h1>
      </div>

      <div className="px-4 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 rounded-xl p-4">
            <p className="text-zinc-400 text-xs mb-1">Avg Calories</p>
            <p className="text-white font-bold text-2xl">{avgCal > 0 ? avgCal : '—'}</p>
            <p className="text-zinc-500 text-xs">goal: {GOALS.daily_calories}</p>
            {avgCal > 0 && (
              <p className={`text-xs mt-1 font-medium ${avgCal >= GOALS.daily_calories ? 'text-emerald-400' : 'text-amber-400'}`}>
                {Math.round((avgCal / GOALS.daily_calories) * 100)}% of goal
              </p>
            )}
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <p className="text-zinc-400 text-xs mb-1">Avg Protein</p>
            <p className="text-white font-bold text-2xl">{avgProt > 0 ? `${avgProt}g` : '—'}</p>
            <p className="text-zinc-500 text-xs">goal: {GOALS.daily_protein_g}g</p>
            {avgProt > 0 && (
              <p className={`text-xs mt-1 font-medium ${avgProt >= GOALS.daily_protein_g ? 'text-emerald-400' : 'text-amber-400'}`}>
                {Math.round((avgProt / GOALS.daily_protein_g) * 100)}% of goal
              </p>
            )}
          </div>
        </div>

        {daysWithData.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-12">No meals logged this week.</p>
        ) : (
          <WeekCharts days={days} calorieGoal={GOALS.daily_calories} proteinGoal={GOALS.daily_protein_g} />
        )}
      </div>
    </div>
  )
}

type DayData = { day: string; calories: number; protein: number }
