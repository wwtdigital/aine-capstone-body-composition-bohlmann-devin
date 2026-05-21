import { db } from '@/lib/db'
import { getGoals } from '@/lib/getGoals'
import { USER_ID } from '@/lib/userId'
import Link from 'next/link'
import MacroRing from '@/components/MacroRing'
import MealList from '@/components/MealSheet'
import DailyInsight from '@/components/DailyInsight'
import { Dumbbell, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import FramedCard from '@/components/FramedCard'
import ISymbol from '@/components/ISymbol'

export const revalidate = 0

const USER_TZ = 'America/Chicago'

function getLocalToday() {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: USER_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const p = Object.fromEntries(fmt.formatToParts(now).map(x => [x.type, x.value]))
  const todayStr = `${p.year}-${p.month}-${p.day}`
  const h = p.hour === '24' ? '00' : p.hour
  const offsetMs = now.getTime() - Date.parse(`${todayStr}T${h}:${p.minute}:${p.second}Z`)
  const todayStartMs = Date.parse(`${todayStr}T00:00:00Z`) + offsetMs
  const yesterdayStr = new Intl.DateTimeFormat('en-CA', { timeZone: USER_TZ })
    .format(new Date(todayStartMs - 86400000))
  return { todayStr, yesterdayStr, todayStartMs, tzOffsetSec: -Math.round(offsetMs / 1000) }
}

type NutritionRow = { cal: number; prot: number; carbs: number; fat: number }
type InBodyRow = { reading_date: number; weight_kg: number | null; body_fat_pct: number | null; lean_mass_kg: number | null }
type MealRow = { id: string; logged_at: number; total_calories: number; total_protein: number; total_carbs: number; items_json: string; photo_url: string | null }
type WhoopRow = { date: string; recovery_score: number | null; strain: number | null; hrv_ms: number | null; rhr: number | null; sleep_minutes: number | null; sleep_efficiency: number | null }
type TodayWorkoutRow = { logged_at: number; session_type: string }
type MealFlag = { type: 'ok' | 'warn' | 'bad'; label: string; detail: string }
type WhoopWeekRow = { date: string; hrv_ms: number | null; recovery_score: number | null; sleep_minutes: number | null; sleep_efficiency: number | null }
type WeekNutritionRow = { day: string; cal: number }

export default async function Today() {
  const { todayStr, yesterdayStr, todayStartMs, tzOffsetSec } = getLocalToday()

  const [GOALS, nutritionResult, inbodyResult, mealsResult, whoopResult, whoopWeekResult, weekNutritionResult, todayWorkoutsResult] = await Promise.all([
    getGoals(),
    db.execute({
      sql: `SELECT COALESCE(SUM(total_calories),0) as cal, COALESCE(SUM(total_protein),0) as prot, COALESCE(SUM(total_carbs),0) as carbs, COALESCE(SUM(total_fat),0) as fat FROM meals WHERE user_id = ? AND logged_at >= ?`,
      args: [USER_ID, todayStartMs],
    }),
    db.execute({
      sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = ? ORDER BY reading_date DESC LIMIT 1`,
      args: [USER_ID],
    }),
    db.execute({
      sql: `SELECT id, logged_at, total_calories, total_protein, total_carbs, items_json, photo_url FROM meals WHERE user_id = ? AND logged_at >= ? ORDER BY logged_at DESC LIMIT 8`,
      args: [USER_ID, todayStartMs],
    }),
    db.execute({
      sql: `SELECT date, recovery_score, strain, hrv_ms, rhr, sleep_minutes, sleep_efficiency FROM whoop_daily WHERE user_id = ? AND date IN (?, ?) ORDER BY date DESC LIMIT 1`,
      args: [USER_ID, todayStr, yesterdayStr],
    }),
    db.execute({
      sql: `SELECT date, hrv_ms, recovery_score, sleep_minutes, sleep_efficiency FROM whoop_daily WHERE user_id = ? ORDER BY date DESC LIMIT 7`,
      args: [USER_ID],
    }),
    db.execute({
      sql: `SELECT date(logged_at/1000 + ?, 'unixepoch') as day, ROUND(SUM(total_calories)) as cal FROM meals WHERE user_id = ? AND logged_at >= ? GROUP BY day`,
      args: [tzOffsetSec, USER_ID, Date.now() - 7 * 24 * 60 * 60 * 1000],
    }),
    db.execute({
      sql: `SELECT logged_at, session_type FROM workout_sessions WHERE user_id = ? AND logged_at >= ? ORDER BY logged_at ASC`,
      args: [USER_ID, todayStartMs],
    }).catch(() => ({ rows: [] })),
  ])

  const n = nutritionResult.rows[0] as unknown as NutritionRow
  const latest = inbodyResult.rows[0] as unknown as InBodyRow | undefined
  const meals = mealsResult.rows as unknown as MealRow[]
  const whoop = whoopResult.rows[0] as unknown as WhoopRow | undefined
  const whoopWeek = whoopWeekResult.rows as unknown as WhoopWeekRow[]
  const weekNutrition = weekNutritionResult.rows as unknown as WeekNutritionRow[]
  const todayWorkouts = (todayWorkoutsResult as unknown as { rows: TodayWorkoutRow[] }).rows

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const recoveryValues = [...whoopWeek].reverse().map(r => ({ score: r.recovery_score, date: r.date }))
  const sleepValues = [...whoopWeek].reverse().map(r => r.sleep_minutes)
  const hrv7DayAvg = (() => {
    const v = whoopWeek.map(r => r.hrv_ms).filter((x): x is number => x != null)
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
  })()
  const hrvNonNullCount = whoopWeek.filter(r => r.hrv_ms != null).length
  const sleepNonNullCount = whoopWeek.filter(r => r.sleep_minutes != null).length

  // 7-day adherence: build array for last 7 calendar days
  const calMap: Record<string, number> = {}
  for (const row of weekNutrition) {
    calMap[row.day] = row.cal
  }
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayStartMs - (6 - i) * 86400000 + 43200000)
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: USER_TZ }).format(d)
    const initial = new Intl.DateTimeFormat('en-US', { weekday: 'narrow', timeZone: USER_TZ }).format(d)
    const cal = calMap[key] ?? 0
    const pct = cal / GOALS.daily_calories
    const color = pct >= 0.9 ? 'bg-ok' : pct >= 0.5 ? 'bg-warn' : 'bg-surface'
    return { key, initial, color }
  })

  const mealFlags = computeMealFlags({
    meals,
    workouts: todayWorkouts,
    strain: whoop?.strain ?? null,
    recovery: whoop?.recovery_score ?? null,
    totalCal: Number(n.cal),
    calGoal: GOALS.daily_calories,
  })

  // Streak: consecutive days from today with any meals logged
  const streakDays = [...last7Days].reverse() // today first
  let streak = 0
  for (const day of streakDays) {
    if (day.color !== 'bg-surface') streak++
    else break
  }

  return (
    <div className="min-h-screen bg-page pb-24">

      {/* Section 1: Header */}
      <div className="px-4 pt-10 pb-2">
        {/* Brand mark */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <ISymbol size={13} className="text-brand" />
            <span className="text-brand font-semibold text-xs tracking-[0.12em] uppercase">Frame</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-brand/10 border border-brand/20 rounded-full px-3 py-1">
              <span className="text-brand text-xs font-semibold">{streak}-day streak</span>
            </div>
          )}
        </div>
        <h1 className="text-3xl font-semibold text-ink tracking-tight">Today</h1>
        <p className="text-ink4 text-sm mt-0.5">{today}</p>
      </div>

      {/* AI Daily Insight — top of page, most actionable info first */}
      <DailyInsight />

      {/* Section 2: Recovery */}
      <FramedCard className="mx-4 mt-4 bg-card rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ISymbol size={14} className="text-ink3 opacity-60" />
            <span className="eyebrow">Recovery</span>
          </div>
          {whoop && (
            <span className="text-xs text-ink3">{whoop.date === todayStr ? 'Today' : 'Yesterday'}</span>
          )}
        </div>

        {!whoop && (
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 bg-brand text-page text-xs font-medium px-4 py-2 rounded-full mb-3"
          >
            Connect Whoop ›
          </Link>
        )}

        {/* Recovery arc + 7-day recovery bars */}
        <div className="flex items-center gap-3 mb-4">
          <RecoveryArc score={whoop?.recovery_score ?? null} muted={!whoop} />
          <div className="flex-1 min-w-0">
            <RecoveryBars values={whoop ? recoveryValues : null} muted={!whoop} />
            {!whoop && <p className="text-ink4 text-xs mt-1">Demo data — connect Whoop</p>}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-5 gap-2 text-center pt-3 border-t border-line">
          {[
            {
              label: 'Sleep',
              value: (() => {
                const mins = whoop?.sleep_minutes ?? (whoop ? null : 7 * 60 + 12)
                if (mins == null) return '—'
                return `${Math.floor(mins / 60)}h ${mins % 60}m`
              })(),
              sub: null as string | null,
            },
            {
              label: 'Efficiency',
              value: whoop
                ? (whoop.sleep_efficiency != null ? `${Math.round(whoop.sleep_efficiency)}%` : '—')
                : '87%',
              sub: null as string | null,
            },
            {
              label: 'HRV',
              value: whoop
                ? (whoop.hrv_ms != null ? `${Math.round(whoop.hrv_ms)}ms` : '—')
                : '52ms',
              sub: (whoop && whoop.hrv_ms != null && hrv7DayAvg != null)
                ? `${whoop.hrv_ms > hrv7DayAvg ? '+' : ''}${Math.round(whoop.hrv_ms - hrv7DayAvg)} vs 7d`
                : null,
            },
            {
              label: 'Strain',
              value: whoop
                ? (whoop.strain != null ? whoop.strain.toFixed(1) : '—')
                : '11.2',
              sub: null as string | null,
            },
            {
              label: 'RHR',
              value: whoop
                ? (whoop.rhr != null ? `${Math.round(whoop.rhr)}bpm` : '—')
                : '56bpm',
              sub: null as string | null,
            },
          ].map(({ label, value, sub }) => (
            <div key={label}>
              <p className={`font-bold text-sm tabular-nums ${!whoop ? 'text-ink3' : 'text-ink'}`}>{value}</p>
              <p className="text-ink3 text-xs mt-0.5">{label}</p>
              {sub && (
                <p className={`text-[10px] mt-0.5 tabular-nums leading-none ${sub.startsWith('+') ? 'text-ok' : 'text-warn'}`}>{sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* 7-day HRV — only render when we have real data or are in demo mode */}
        {(!whoop || hrvNonNullCount >= 3) && (
          <div className="mt-3 pt-3 border-t border-line">
            <p className="eyebrow mb-2">HRV 7-day</p>
            <HrvWeekBars values={whoop ? [...whoopWeek].reverse().map(r => r.hrv_ms) : null} avg={hrv7DayAvg} muted={!whoop} />
          </div>
        )}

        {/* 7-day sleep — only render when we have real data or are in demo mode */}
        {(!whoop || sleepNonNullCount >= 3) && (
          <div className="mt-3 pt-3 border-t border-line">
            <p className="eyebrow mb-2">Sleep</p>
            <SleepWeekBars values={whoop ? sleepValues : null} muted={!whoop} />
          </div>
        )}
      </FramedCard>

      {/* Section 3: Nutrition */}
      <FramedCard className="mx-4 mt-6 bg-card rounded-2xl border border-line p-5">
        <div className="flex items-center gap-2 mb-3">
          <ISymbol size={14} className="text-ink3 opacity-60" />
          <span className="eyebrow">Nutrition</span>
        </div>
        <div className="flex items-center justify-around mt-4 mb-4">
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
        {whoop && whoop.recovery_score != null && (
          <RecoveryAdjustedMacros score={whoop.recovery_score} baseCalories={GOALS.daily_calories} />
        )}
      </FramedCard>

      {/* 7-day adherence strip */}
      <FramedCard className="mx-4 mt-6 bg-card rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ISymbol size={14} className="text-ink3 opacity-60" />
            <span className="eyebrow">7-Day Adherence</span>
          </div>
          {streak > 0 && (
            <span className="text-xs font-semibold text-ok tabular-nums">{streak}-day streak</span>
          )}
        </div>
        <div className="flex items-end justify-between gap-1">
          {last7Days.map(({ key, initial, color }) => (
            <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-full h-2 rounded-full ${color}`} />
              <span className="text-ink3 text-xs">{initial}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-ok" /><span className="text-ink3 text-xs">≥90%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warn" /><span className="text-ink3 text-xs">50–89%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-surface" /><span className="text-ink3 text-xs">&lt;50%</span></div>
        </div>
      </FramedCard>

      {/* Section 4: Body Composition */}
      {latest ? (
        <FramedCard className="mx-4 mt-6 bg-card rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ISymbol size={14} className="text-ink3 opacity-60" />
              <span className="eyebrow">Body Comp</span>
            </div>
            <span className="text-xs text-ink3">
              {new Date(latest.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatBlock
              value={latest.weight_kg != null && latest.weight_kg < 400 ? Math.round(latest.weight_kg * 2.20462).toString() : '—'}
              unit="lbs"
              delta={latest.weight_kg != null && latest.weight_kg < 400 ? (Math.round(latest.weight_kg * 2.20462) - GOALS.target_weight_lbs) : null}
              label="Weight"
              positiveIsGood={false}
            />
            <StatBlock
              value={latest.body_fat_pct != null && latest.body_fat_pct <= 100 ? latest.body_fat_pct.toFixed(1) : '—'}
              unit="%"
              delta={latest.body_fat_pct != null && latest.body_fat_pct <= 100 ? (latest.body_fat_pct - GOALS.target_body_fat_pct) : null}
              label="Body Fat"
              positiveIsGood={false}
            />
            <div className="text-center">
              <p className="text-ink font-bold text-xl tabular-nums leading-tight">
                {latest.lean_mass_kg != null && latest.lean_mass_kg < 300 ? Math.round(latest.lean_mass_kg * 2.20462) : '—'}
              </p>
              <p className="text-ink3 text-xs mt-0.5">lbs lean</p>
            </div>
          </div>
        </FramedCard>
      ) : (
        <FramedCard className="mx-4 mt-6 bg-card rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ISymbol size={14} className="text-ink3 opacity-60" />
              <span className="eyebrow">Body Comp</span>
            </div>
          </div>
          <Link
            href="/inbody/new"
            className="inline-flex items-center gap-2 bg-brand text-page text-xs font-medium px-4 py-2 rounded-full mb-3"
          >
            Add InBody readings ›
          </Link>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-ink3 font-bold text-xl tabular-nums leading-tight">195<span className="text-sm font-normal">lbs</span></p>
              <p className="text-ink3 text-xs mt-0.5">Weight</p>
            </div>
            <div className="text-center">
              <p className="text-ink3 font-bold text-xl tabular-nums leading-tight">18.4<span className="text-sm font-normal">%</span></p>
              <p className="text-ink3 text-xs mt-0.5">Body Fat</p>
            </div>
            <div className="text-center">
              <p className="text-ink3 font-bold text-xl tabular-nums leading-tight">159</p>
              <p className="text-ink3 text-xs mt-0.5">lbs lean</p>
            </div>
          </div>
        </FramedCard>
      )}

      {/* Section 5: Hybrid Athlete Pro Tip */}
      <HybridAthleteTip dayOfWeek={new Date().getDay()} />

      {/* Section 6: Meals Today */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ISymbol size={14} className="text-ink3 opacity-60" />
            <span className="eyebrow">Meals</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/gallery" className="text-xs font-semibold text-ink3">Gallery</Link>
            <Link href="/log/workout" className="text-xs font-semibold text-ink3">Log workout ›</Link>
            <Link href="/log" className="text-xs font-semibold text-brand">Log meal ›</Link>
          </div>
        </div>

        {mealFlags.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {mealFlags.map((f, i) => <MealFlagChip key={i} flag={f} />)}
          </div>
        )}

        {meals.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line p-6 text-center">
            <p className="text-ink3 text-sm">Nothing logged yet today</p>
            <Link href="/log" className="mt-3 inline-flex items-center gap-1.5 text-brand text-sm font-semibold">
              Take a photo ›
            </Link>
          </div>
        ) : (
          <MealList meals={meals} />
        )}
      </div>
    </div>
  )
}

const HYBRID_TIPS: { title: string; body: string; tag: string }[] = [
  {
    tag: 'Session Order',
    title: 'Lift before you run — always.',
    body: 'On concurrent-training days (gym + soccer), strength first preserves mTOR signaling. Aerobic work activates AMPK which suppresses mTOR; reversing the order blunts hypertrophy by up to 30%. Keep ≥6h between sessions when possible.',
  },
  {
    tag: 'Protein Distribution',
    title: '4 doses of 40g beat 3 doses of 55g.',
    body: 'With 8 sessions per week, your muscle protein synthesis cycles faster than a typical lifter. Hitting the ~0.05g/kg leucine threshold 4× daily (every ~4–5h) drives more MPS per gram of protein than larger, less frequent doses.',
  },
  {
    tag: 'Carb Periodization',
    title: 'Front-load carbs on soccer days, reduce on lift-only days.',
    body: '60–70g low-GI carbs (oats, sweet potato) 2–3h before kick-off. Post-match: 1.2g/kg body weight of high-GI carbs (white rice, banana) within 30min for maximal glycogen resynthesis — you\'re likely training again within 24h. Cut carbs 15–20% on lifting-only days when glycolytic demand is lower.',
  },
  {
    tag: 'Peri-Workout Fat',
    title: 'Keep fat <15g in the 2h window around any session.',
    body: 'Dietary fat slows gastric emptying and competes with carbohydrate oxidation at the 70–85% VO₂max zones typical of team sport. Save fat-dense meals for evenings when glycolytic demand drops.',
  },
  {
    tag: 'Creatine',
    title: 'Creatine helps soccer sprints as much as lifts.',
    body: '3–5g/day creatine monohydrate tops up phosphocreatine for both maximal-effort sprints (PCr system) and reduces blood lactate accumulation at submaximal intensities. At 8 sessions/week, the anti-inflammatory secondary effect on DOMS is a real daily benefit.',
  },
  {
    tag: 'Sleep Quality',
    title: '7.5h minimum — non-negotiable for concurrent athletes.',
    body: 'At <7h sleep, GH pulse amplitude drops ~50% and the cortisol:testosterone ratio shifts unfavorably. For concurrent athletes this is more damaging than for single-sport athletes because both aerobic and neural adaptations require overnight consolidation.',
  },
  {
    tag: 'Anti-Inflammatory',
    title: 'Omega-3s reduce the adaptation interference effect.',
    body: '2–3g EPA+DHA/day attenuates the elevated systemic inflammation unique to concurrent training, preserving satellite cell activity. Time it away from immediately post-training (antioxidants can blunt some acute signaling) — take with a main meal 3+ hours post-session.',
  },
  {
    tag: 'Body Recomp',
    title: 'To lose fat but keep muscle at this volume: eat at ~−250 kcal deficit on rest days only.',
    body: 'Running a deficit on training days at 8 sessions/week impairs recovery and MPS. Restrict only on full rest days. On any training day, eat at maintenance or slight surplus. This cycling approach has been shown to preserve LBM better than a continuous deficit at high training frequencies.',
  },
  {
    tag: 'Periodization',
    title: 'Block your training: don\'t peak strength and soccer fitness simultaneously.',
    body: 'Concurrent adaptation conflicts are worst when both modalities are at high intensity simultaneously. Schedule 4–6 week blocks that prioritize one: e.g., strength block (4×/week lift, 2×/week soccer maintenance), then a soccer conditioning block. Muscle mass gains compound faster this way than grinding both hard year-round.',
  },
  {
    tag: 'Electrolytes',
    title: 'Pre-load sodium the night before hard soccer days.',
    body: 'Sweat rate in high-intensity team sport can hit 1.5–2L/h. A 500mg sodium pre-load the evening before, with adequate water, expands plasma volume by ~4–5% and reduces cardiovascular strain — measurably reducing RPE at the same pace.',
  },
  {
    tag: 'Caffeine Timing',
    title: 'Caffeine 45–60min pre-session; avoid post-6pm on double days.',
    body: '3–6mg/kg caffeine improves both maximal strength output and endurance performance. For double-day sessions, take it before the morning session only — afternoon caffeine extends adenosine half-life, compromising the deep sleep needed for recovery between sessions.',
  },
  {
    tag: 'Micronutrition',
    title: 'Iron and Vitamin D are the two most likely deficiencies at this volume.',
    body: 'High-intensity endurance sport increases red cell turnover (footstrike hemolysis in running, micro-bleeds). Vitamin D deficiency is near-universal in athletes training indoors and correlates with both strength and VO₂max. Get levels tested; don\'t guess.',
  },
  {
    tag: 'Recovery Nutrition',
    title: 'Tart cherry + collagen beats most recovery supplements.',
    body: '30mL tart cherry concentrate twice daily reduces DOMS by 20–25% via anthocyanin-driven COX-2 inhibition without blunting adaptation. 15g collagen + 200mg Vitamin C 30–60min before a session reduces connective tissue injury risk — relevant when loading tendons and ligaments across 8 sessions/week.',
  },
  {
    tag: 'VO₂ + Muscle Balance',
    title: 'Don\'t let aerobic base erode in heavy lifting blocks.',
    body: 'Two 30-min Zone 2 sessions per week (cycling preferred — lower eccentric load) maintain mitochondrial density and cardiac output without activating the AMPK cascade strongly enough to interfere with hypertrophy. Below this threshold, aerobic base declines within 2 weeks.',
  },
]

function HybridAthleteTip({ dayOfWeek: _ }: { dayOfWeek: number }) {
  const tip = HYBRID_TIPS[Math.floor(Math.random() * HYBRID_TIPS.length)]

  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Dumbbell size={13} className="text-ink3" />
        <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Hybrid Athlete</span>
      </div>
      <div className="bg-gradient-to-br from-brand/8 via-card to-card rounded-2xl border border-brand/20 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded-full">
            {tip.tag}
          </span>
        </div>
        <p className="text-ink font-semibold text-sm mt-2 leading-snug">{tip.title}</p>
        <p className="text-ink3 text-xs mt-1.5 leading-relaxed">{tip.body}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
          <p className="text-ink4 text-[10px] font-medium uppercase tracking-wide">Science-backed · 5× lift + 3× soccer</p>
          <p className="text-ink4 text-[10px]">{HYBRID_TIPS.length} tips · refreshes each visit</p>
        </div>
      </div>
    </div>
  )
}

function RecoveryBars({ values, muted = false }: {
  values: { score: number | null; date: string }[] | null
  muted?: boolean
}) {
  const demo = [
    { score: 74, date: '' }, { score: 61, date: '' }, { score: 82, date: '' },
    { score: 45, date: '' }, { score: 78, date: '' }, { score: 65, date: '' }, { score: 70, date: '' },
  ]
  const data = values ?? demo
  return (
    <div className={muted ? 'opacity-40' : ''}>
      <div className="flex items-end gap-1 h-10">
        {data.map((d, i) => {
          const pct = d.score != null ? d.score / 100 : 0
          const color = d.score == null ? 'var(--color-surface)'
            : d.score >= 67 ? '#10b981'
            : d.score >= 34 ? '#f59e0b'
            : '#ef4444'
          const isToday = i === data.length - 1
          return (
            <div key={i} className="flex-1 h-full flex flex-col justify-end">
              <div
                className="w-full rounded-sm"
                style={{ height: `${Math.max(10, pct * 100)}%`, backgroundColor: color, opacity: isToday ? 1 : 0.55 }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => {
          const label = d.date
            ? new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
            : ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i % 7]
          return (
            <div key={i} className="flex-1 text-center">
              <span className="text-ink4 text-[9px]">{label}</span>
            </div>
          )
        })}
      </div>
      <p className="text-ink3 text-xs mt-1">Recovery 7-day</p>
    </div>
  )
}

function RecoveryArc({ score, muted = false }: { score: number | null; muted?: boolean }) {
  const pct = score != null ? Math.min(1, score / 100) : 0.74
  const r = 48
  const cx = 60, cy = 60
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const startAngle = 150
  const sweep = 240
  const endAngle = startAngle + sweep
  const sx = cx + r * Math.cos(toRad(startAngle))
  const sy = cy + r * Math.sin(toRad(startAngle))
  const ex = cx + r * Math.cos(toRad(endAngle))
  const ey = cy + r * Math.sin(toRad(endAngle))
  const fillAngle = startAngle + sweep * pct
  const fx = cx + r * Math.cos(toRad(fillAngle))
  const fy = cy + r * Math.sin(toRad(fillAngle))
  const largeArc = sweep * pct > 180 ? 1 : 0
  const fillLargeArc = sweep > 180 ? 1 : 0

  const color = score == null ? '#64748b'
    : score >= 67 ? '#10b981'
    : score >= 34 ? '#f59e0b'
    : '#ef4444'

  return (
    <svg viewBox="0 0 120 120" className={`w-28 h-28 shrink-0 ${muted ? 'opacity-50' : ''}`}>
      {/* Track */}
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${fillLargeArc} 1 ${ex} ${ey}`}
        fill="none" strokeWidth="10" strokeLinecap="round"
        style={{ stroke: 'var(--color-surface)' }}
      />
      {/* Fill */}
      {pct > 0.01 && (
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${fx} ${fy}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        />
      )}
      {/* Score */}
      <text x="60" y="55" textAnchor="middle" fontSize="24" fontWeight="700" fontFamily="Inter, sans-serif"
        style={{ fill: muted ? 'var(--color-ink3)' : 'var(--color-ink)' }}>
        {score ?? '74'}
      </text>
      <text x="60" y="70" textAnchor="middle" fontSize="9" fontFamily="Inter, sans-serif" letterSpacing="1"
        style={{ fill: 'var(--color-ink3)' }}>
        RECOVERY
      </text>
    </svg>
  )
}

function HrvWeekBars({ values, avg, muted = false }: {
  values: (number | null)[] | null
  avg: number | null
  muted?: boolean
}) {
  const demo = [48, 55, 51, 62, 44, 58, 52]
  const data = values ?? demo
  const demoAvg = 53
  const baseline = avg ?? demoAvg
  const maxVal = Math.max(...(data.filter((v): v is number => v != null)), baseline * 1.2, 1)

  return (
    <div className={muted ? 'opacity-50' : ''}>
      <div className="flex items-end gap-1 h-10">
        {data.map((hrv, i) => {
          const pct = hrv != null ? hrv / maxVal : 0
          const isToday = i === data.length - 1
          const color = hrv == null ? 'var(--color-surface)'
            : hrv >= baseline * 1.05 ? '#10b981'
            : hrv >= baseline * 0.9 ? '#6366f1'
            : '#f59e0b'
          return (
            <div key={i} className="flex-1 h-full flex flex-col justify-end">
              <div
                className="w-full rounded-sm"
                style={{ height: `${Math.max(10, pct * 100)}%`, backgroundColor: color, opacity: isToday ? 1 : 0.55 }}
              />
            </div>
          )
        })}
      </div>
      {/* Avg baseline label */}
      <div className="flex gap-1 mt-1">
        {data.map((_, i) => {
          const daysAgo = data.length - 1 - i
          const label = new Date(Date.now() - daysAgo * 86400000).toLocaleDateString('en-US', { weekday: 'narrow' })
          return (
            <div key={i} className="flex-1 text-center">
              <span className="text-ink4 text-[9px]">{label}</span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-1">
        <p className="text-ink3 text-xs">HRV 7-day</p>
        {baseline > 0 && (
          <p className="text-ink3 text-xs tabular-nums">{baseline}ms avg</p>
        )}
      </div>
    </div>
  )
}

function SleepWeekBars({ values, muted = false }: {
  values: (number | null)[] | null
  muted?: boolean
}) {
  const demo = [432, 445, 418, 460, 390, 475, 450]
  const data = values ?? demo
  const maxMins = Math.max(...(data.filter((v): v is number => v != null)), 480)
  const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`
  return (
    <div className={muted ? 'opacity-50' : ''}>
      <div className="flex items-end gap-1 h-10">
        {data.map((mins, i) => {
          const pct = mins != null ? mins / maxMins : 0
          const isToday = i === data.length - 1
          return (
            <div key={i} className="flex-1 h-full flex flex-col justify-end">
              <div
                className="w-full rounded-sm"
                style={{ height: `${Math.max(10, pct * 100)}%`, backgroundColor: isToday ? '#6366f1' : '#475569', opacity: isToday ? 1 : 0.5 }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((_, i) => {
          const daysAgo = data.length - 1 - i
          const label = new Date(Date.now() - daysAgo * 86400000).toLocaleDateString('en-US', { weekday: 'narrow' })
          return (
            <div key={i} className="flex-1 text-center">
              <span className="text-ink4 text-[9px]">{label}</span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-1">
        <p className="text-ink3 text-xs">Sleep 7-day</p>
        {data[data.length - 1] != null && (
          <p className="text-ink3 text-xs tabular-nums">{fmt(data[data.length - 1]!)}</p>
        )}
      </div>
    </div>
  )
}

function computeMealFlags({
  meals, workouts, strain, recovery: _recovery, totalCal, calGoal,
}: {
  meals: MealRow[]
  workouts: TodayWorkoutRow[]
  strain: number | null
  recovery: number | null
  totalCal: number
  calGoal: number
}): MealFlag[] {
  const flags: MealFlag[] = []
  const sorted = [...meals].sort((a, b) => a.logged_at - b.logged_at)
  const H = 3600000

  // Protein spike >50g single sitting
  for (const m of sorted) {
    const prot = Number(m.total_protein)
    if (prot > 50) {
      const time = new Date(m.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      flags.push({ type: 'warn', label: `${Math.round(prot)}g protein at ${time}`, detail: 'MPS plateaus above ~50g — split across two meals for better utilization' })
    }
  }

  // Protein gap >5h between consecutive meals
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].logged_at - sorted[i - 1].logged_at
    if (gap > 5 * H) {
      flags.push({ type: 'warn', label: `${(gap / H).toFixed(1)}h without protein`, detail: 'Leucine threshold resets after ~5h — add a meal or shake to maintain MPS' })
    }
  }

  // Per-workout: pre-carbs + post-protein
  for (const w of workouts) {
    const preMeals = sorted.filter(m => m.logged_at >= w.logged_at - 2 * H && m.logged_at < w.logged_at)
    const preCarbs = preMeals.reduce((s, m) => s + Number(m.total_carbs ?? 0), 0)
    const elapsed = Date.now() - w.logged_at
    const postMeals = sorted.filter(m => m.logged_at > w.logged_at && m.logged_at <= w.logged_at + H)
    const postProt = postMeals.reduce((s, m) => s + Number(m.total_protein), 0)
    const tooSoon = elapsed < 30 * 60000

    if (preCarbs < 30) {
      flags.push({ type: 'warn', label: `Low pre-${w.session_type} carbs`, detail: `${Math.round(preCarbs)}g in 2h window — target ≥30g to top up glycogen` })
    }
    if (!tooSoon && postProt < 25) {
      flags.push({ type: 'warn', label: `Post-${w.session_type} protein missing`, detail: `${Math.round(postProt)}g in 1h window — get ≥25g within the hour to start recovery` })
    }
    if (preCarbs >= 30 && (tooSoon || postProt >= 25)) {
      flags.push({ type: 'ok', label: `${w.session_type} — well fueled`, detail: `${Math.round(preCarbs)}g pre carbs${!tooSoon ? ` · ${Math.round(postProt)}g post protein` : ''}` })
    }
  }

  // High strain, under-fueled
  if (strain != null && strain > 15 && meals.length > 0 && totalCal / calGoal < 0.8) {
    flags.push({ type: 'bad', label: `High strain (${strain.toFixed(1)}) — fuel up`, detail: `Only ${Math.round((totalCal / calGoal) * 100)}% of calories — under-eating on a high-strain day delays recovery` })
  }

  return flags.slice(0, 5)
}

function MealFlagChip({ flag }: { flag: MealFlag }) {
  const cfg = {
    ok: { bg: 'bg-ok/10 border-ok/20', text: 'text-ok', Icon: CheckCircle },
    warn: { bg: 'bg-warn/10 border-warn/20', text: 'text-warn', Icon: AlertTriangle },
    bad: { bg: 'bg-bad/10 border-bad/20', text: 'text-bad', Icon: AlertCircle },
  }[flag.type]
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${cfg.bg}`}>
      <cfg.Icon size={13} className={`shrink-0 mt-0.5 ${cfg.text}`} />
      <div>
        <p className={`text-xs font-semibold leading-snug ${cfg.text}`}>{flag.label}</p>
        <p className="text-ink4 text-xs mt-0.5 leading-snug">{flag.detail}</p>
      </div>
    </div>
  )
}

function RecoveryAdjustedMacros({ score, baseCalories }: { score: number; baseCalories: number }) {
  const green = score >= 67
  const amber = score >= 34
  if (green) return null
  const adjustedCal = amber ? Math.round(baseCalories * 0.9) : baseCalories - 200
  const label = amber
    ? `Moderate recovery — ${Math.round(baseCalories * 0.1)} cal reduction suggested`
    : 'Poor recovery — reduce by 200 cal, prioritize rest'
  const color = amber ? 'text-warn' : 'text-bad'
  const border = amber ? 'border-warn/20 bg-warn/8' : 'border-bad/20 bg-bad/8'
  return (
    <div className="mt-3 pt-3 border-t border-line">
      <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${border}`}>
        <p className={`text-xs font-semibold ${color}`}>{label}</p>
        <p className="text-ink3 text-xs tabular-nums shrink-0">{adjustedCal.toLocaleString()} cal</p>
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
          {delta > 0 ? '+' : ''}{Math.round(Math.abs(delta))}{unit} {delta > 0 ? 'over' : 'to'} goal
        </p>
      )}
    </div>
  )
}
