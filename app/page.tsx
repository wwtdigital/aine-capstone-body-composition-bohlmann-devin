import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import Link from 'next/link'
import MacroRing from '@/components/MacroRing'
import MealList from '@/components/MealSheet'
import { Sparkles } from 'lucide-react'

export const revalidate = 0

type NutritionRow = { cal: number; prot: number; carbs: number; fat: number }
type InBodyRow = { reading_date: number; weight_kg: number | null; body_fat_pct: number | null; lean_mass_kg: number | null }
type MealRow = { id: string; logged_at: number; total_calories: number; total_protein: number; items_json: string; photo_url: string | null }
type WhoopRow = { date: string; recovery_score: number | null; strain: number | null; hrv_ms: number | null; rhr: number | null; sleep_minutes: number | null }

export default async function Today() {
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [nutritionResult, inbodyResult, mealsResult, whoopResult] = await Promise.all([
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
    db.execute({
      sql: `SELECT date, recovery_score, strain, hrv_ms, rhr, sleep_minutes FROM whoop_daily WHERE user_id = 'will' AND date IN (?, ?) ORDER BY date DESC LIMIT 1`,
      args: [todayStr, yesterdayStr],
    }),
  ])

  const n = nutritionResult.rows[0] as unknown as NutritionRow
  const latest = inbodyResult.rows[0] as unknown as InBodyRow | undefined
  const meals = mealsResult.rows as unknown as MealRow[]
  const whoop = whoopResult.rows[0] as unknown as WhoopRow | undefined

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Today</h1>
          <p className="text-ink3 text-sm">{today}</p>
        </div>
      </div>

      {/* Macro rings */}
      <div className="mx-4 mt-5 bg-card rounded-2xl border border-line p-5">
        <div className="flex items-center justify-around mb-4">
          <MacroRing
            value={Math.round(n.cal)}
            max={GOALS.daily_calories}
            color="#4a9eff"
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

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-line">
          {[
            { label: 'Carbs', value: Math.round(n.carbs), unit: 'g', color: 'text-warn' },
            { label: 'Fat', value: Math.round(n.fat), unit: 'g', color: 'text-nourish' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="text-center py-1">
              <span className={`text-lg font-bold tabular-nums ${color}`}>{value}<span className="text-sm font-normal">{unit}</span></span>
              <p className="text-ink3 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body comp snapshot */}
      {latest && (
        <div className="mx-4 mt-4 bg-card rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Body Comp</span>
            <span className="text-xs text-ink3">
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
              <p className="text-ink font-bold text-xl tabular-nums leading-tight">
                {latest.lean_mass_kg?.toFixed(1) ?? '—'}
              </p>
              <p className="text-ink3 text-xs mt-0.5">kg lean</p>
            </div>
          </div>
        </div>
      )}

      {/* Whoop recovery */}
      {whoop && (
        <div className="mx-4 mt-4 bg-card rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Recovery</span>
            <span className="text-xs text-ink3">{whoop.date === todayStr ? 'Today' : 'Yesterday'}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className={`font-bold text-xl tabular-nums ${whoop.recovery_score != null && whoop.recovery_score >= 67 ? 'text-ok' : whoop.recovery_score != null && whoop.recovery_score >= 34 ? 'text-warn' : 'text-bad'}`}>
                {whoop.recovery_score ?? '—'}
              </p>
              <p className="text-ink3 text-xs mt-0.5">recovery</p>
            </div>
            <div>
              <p className="text-ink font-bold text-xl tabular-nums">{whoop.strain?.toFixed(1) ?? '—'}</p>
              <p className="text-ink3 text-xs mt-0.5">strain</p>
            </div>
            <div>
              <p className="text-ink font-bold text-xl tabular-nums">{whoop.hrv_ms?.toFixed(0) ?? '—'}</p>
              <p className="text-ink3 text-xs mt-0.5">HRV ms</p>
            </div>
            <div>
              <p className="text-ink font-bold text-xl tabular-nums">
                {whoop.sleep_minutes != null ? `${Math.floor(whoop.sleep_minutes / 60)}h` : '—'}
              </p>
              <p className="text-ink3 text-xs mt-0.5">sleep</p>
            </div>
          </div>
        </div>
      )}

      {/* Gap analysis CTA */}
      <div className="mx-4 mt-4">
        <Link
          href="/gap"
          className="flex items-center gap-3 bg-brand/10 border border-brand/30 rounded-2xl p-4 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-brand" />
          </div>
          <div className="flex-1">
            <p className="text-brand font-semibold text-sm">Gap Analysis</p>
            <p className="text-ink3 text-xs mt-0.5">AI coaching based on your data</p>
          </div>
          <span className="text-brand/60 text-lg">→</span>
        </Link>
      </div>

      {/* Today's meals */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Meals</span>
          <div className="flex items-center gap-3">
            <Link href="/gallery" className="text-xs font-semibold text-ink3">Gallery</Link>
            <Link href="/log" className="text-xs font-semibold text-brand">+ Log meal</Link>
          </div>
        </div>

        {meals.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line p-6 text-center">
            <p className="text-ink3 text-sm">Nothing logged yet today</p>
            <Link href="/log" className="mt-3 inline-flex items-center gap-1.5 text-brand text-sm font-semibold">
              Take a photo →
            </Link>
          </div>
        ) : (
          <MealList meals={meals} />
        )}
      </div>
    </div>
  )
}

function StatBlock({
  value, unit, delta, label, positiveIsGood,
}: {
  value: string; unit: string; delta: number | null; label: string; positiveIsGood: boolean
}) {
  const isPositive = delta != null && delta > 0
  const deltaColor =
    delta == null ? '' :
    (isPositive === positiveIsGood) ? 'text-ok' : 'text-warn'

  return (
    <div className="text-center">
      <p className="text-ink font-bold text-xl tabular-nums leading-tight">
        {value}<span className="text-ink3 text-sm font-normal">{unit}</span>
      </p>
      <p className="text-ink3 text-xs mt-0.5">{label}</p>
      {delta != null && (
        <p className={`text-xs font-semibold mt-0.5 ${deltaColor}`}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unit} to goal
        </p>
      )}
    </div>
  )
}
