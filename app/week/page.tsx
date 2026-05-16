import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import WeekCharts from './WeekCharts'

export const revalidate = 0

type DayRow = { day: string; calories: number; protein: number }
type DayData = { day: string; calories: number; protein: number }

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
  const avgCal = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length)
    : 0
  const avgProt = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length)
    : 0

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Week</h1>
        <p className="text-ink3 text-sm">Last 7 days</p>
      </div>

      <div className="px-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-line p-4">
            <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2">Avg Calories</p>
            <p className="text-ink font-bold text-3xl tabular-nums">{avgCal > 0 ? avgCal.toLocaleString() : '—'}</p>
            <p className="text-ink3 text-xs mt-1">goal: {GOALS.daily_calories.toLocaleString()}</p>
            {avgCal > 0 && (
              <p className={`text-xs mt-1.5 font-semibold ${avgCal >= GOALS.daily_calories ? 'text-ok' : 'text-warn'}`}>
                {Math.round((avgCal / GOALS.daily_calories) * 100)}% of goal
              </p>
            )}
          </div>
          <div className="bg-card rounded-2xl border border-line p-4">
            <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2">Avg Protein</p>
            <p className="text-ink font-bold text-3xl tabular-nums">{avgProt > 0 ? `${avgProt}g` : '—'}</p>
            <p className="text-ink3 text-xs mt-1">goal: {GOALS.daily_protein_g}g</p>
            {avgProt > 0 && (
              <p className={`text-xs mt-1.5 font-semibold ${avgProt >= GOALS.daily_protein_g ? 'text-ok' : 'text-warn'}`}>
                {Math.round((avgProt / GOALS.daily_protein_g) * 100)}% of goal
              </p>
            )}
          </div>
        </div>

        {daysWithData.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line p-10 text-center">
            <p className="text-ink3 text-sm">No meals logged this week</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-line p-4">
            <WeekCharts days={days} calorieGoal={GOALS.daily_calories} proteinGoal={GOALS.daily_protein_g} />
          </div>
        )}

        {daysWithData.length > 0 && (
          <div className="bg-card rounded-2xl border border-line divide-y divide-line">
            {[...days].reverse().map((d, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <span className="text-ink2 text-sm w-10">{d.day}</span>
                {d.calories > 0 ? (
                  <>
                    <div className="flex-1 mx-3">
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${Math.min(100, (d.calories / GOALS.daily_calories) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-ink text-sm font-semibold tabular-nums">{d.calories.toLocaleString()}</span>
                      <span className="text-ink3 text-xs ml-1">cal</span>
                    </div>
                  </>
                ) : (
                  <span className="text-ink4 text-sm flex-1 text-right">—</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
