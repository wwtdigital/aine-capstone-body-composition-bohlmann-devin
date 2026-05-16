import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import Link from 'next/link'
import MacroRing from '@/components/MacroRing'
import ThemeToggle from '@/components/ThemeToggle'

export const revalidate = 0

type NutritionRow = { cal: number; prot: number; carbs: number; fat: number }
type InBodyRow = { reading_date: number; weight_kg: number | null; body_fat_pct: number | null; lean_mass_kg: number | null }
type MealRow = { id: string; logged_at: number; total_calories: number; total_protein: number; items_json: string; photo_url: string | null }

export default async function Today() {
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()

  const [nutritionResult, inbodyResult, mealsResult] = await Promise.all([
    db.execute({
      sql: `SELECT COALESCE(SUM(total_calories),0) as cal, COALESCE(SUM(total_protein),0) as prot, COALESCE(SUM(total_carbs),0) as carbs, COALESCE(SUM(total_fat),0) as fat FROM meals WHERE user_id = 'will' AND logged_at >= ?`,
      args: [todayStart],
    }),
    db.execute({
      sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date DESC LIMIT 1`,
      args: [],
    }),
    db.execute({
      sql: `SELECT id, logged_at, total_calories, total_protein, items_json, photo_url FROM meals WHERE user_id = 'will' AND logged_at >= ? ORDER BY logged_at DESC LIMIT 8`,
      args: [todayStart],
    }),
  ])

  const n = nutritionResult.rows[0] as unknown as NutritionRow
  const latest = inbodyResult.rows[0] as unknown as InBodyRow | undefined
  const meals = mealsResult.rows as unknown as MealRow[]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Today</h1>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm">{today}</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Macro rings */}
      <div className="mx-4 mt-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex items-center justify-around mb-4">
          <MacroRing
            value={Math.round(n.cal)}
            max={GOALS.daily_calories}
            color="#3b82f6"
            label="cal"
            valueDisplay={Math.round(n.cal).toLocaleString()}
            goalDisplay={GOALS.daily_calories.toLocaleString()}
          />
          <MacroRing
            value={Math.round(n.prot)}
            max={GOALS.daily_protein_g}
            color="#10b981"
            label="protein"
            valueDisplay={`${Math.round(n.prot)}g`}
            goalDisplay={`${GOALS.daily_protein_g}g`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {[
            { label: 'Carbs', value: Math.round(n.carbs), unit: 'g', color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Fat', value: Math.round(n.fat), unit: 'g', color: 'text-orange-600 dark:text-orange-400' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="text-center py-1">
              <span className={`text-lg font-bold tabular-nums ${color}`}>{value}<span className="text-sm font-normal">{unit}</span></span>
              <p className="text-zinc-500 dark:text-zinc-600 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body comp snapshot */}
      {latest && (
        <div className="mx-4 mt-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">Body Comp</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              {new Date(latest.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatBlock
              value={latest.weight_kg?.toFixed(1) ?? '—'}
              unit="kg"
              delta={latest.weight_kg != null ? (latest.weight_kg - GOALS.weight_kg) : null}
              label="Weight"
              positiveIsGood={false}
            />
            <StatBlock
              value={latest.body_fat_pct?.toFixed(1) ?? '—'}
              unit="%"
              delta={latest.body_fat_pct != null ? (latest.body_fat_pct - GOALS.body_fat_pct) : null}
              label="Body Fat"
              positiveIsGood={false}
            />
            <div className="text-center">
              <p className="text-zinc-900 dark:text-white font-bold text-xl tabular-nums leading-tight">
                {latest.lean_mass_kg?.toFixed(1) ?? '—'}
              </p>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">kg lean</p>
            </div>
          </div>
        </div>
      )}

      {/* Today's meals */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">Meals</span>
          <Link href="/log" className="text-xs font-semibold text-blue-600 dark:text-blue-400">+ Log meal</Link>
        </div>

        {meals.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-center">
            <p className="text-zinc-400 dark:text-zinc-600 text-sm">Nothing logged yet today</p>
            <Link
              href="/log"
              className="mt-3 inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-sm font-semibold"
            >
              Take a photo →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {meals.map(meal => {
              let firstItem = ''
              try {
                const items = JSON.parse(meal.items_json)
                firstItem = items[0]?.name ?? ''
                if (items.length > 1) firstItem += ` +${items.length - 1} more`
              } catch {}
              const time = new Date(meal.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              return (
                <div key={meal.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-center gap-3">
                  {meal.photo_url && (
                    <img src={meal.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-900 dark:text-white text-sm font-medium truncate">{firstItem || 'Meal'}</p>
                    <p className="text-zinc-400 dark:text-zinc-600 text-xs">{time}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-zinc-900 dark:text-white text-sm font-bold tabular-nums">{Math.round(meal.total_calories)}</p>
                    <p className="text-zinc-400 dark:text-zinc-600 text-xs">cal</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBlock({
  value,
  unit,
  delta,
  label,
  positiveIsGood,
}: {
  value: string
  unit: string
  delta: number | null
  label: string
  positiveIsGood: boolean
}) {
  const isPositive = delta != null && delta > 0
  const deltaColor =
    delta == null
      ? ''
      : (isPositive === positiveIsGood)
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-amber-600 dark:text-amber-400'

  return (
    <div className="text-center">
      <p className="text-zinc-900 dark:text-white font-bold text-xl tabular-nums leading-tight">
        {value}<span className="text-zinc-400 dark:text-zinc-600 text-sm font-normal">{unit}</span>
      </p>
      <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">{label}</p>
      {delta != null && (
        <p className={`text-xs font-semibold mt-0.5 ${deltaColor}`}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unit} to goal
        </p>
      )}
    </div>
  )
}
