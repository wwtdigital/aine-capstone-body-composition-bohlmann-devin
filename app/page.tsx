import { db } from '@/lib/db'
import { getGoals } from '@/lib/getGoals'
import Link from 'next/link'
import MacroRing from '@/components/MacroRing'
import MealList from '@/components/MealSheet'
import DailyInsight from '@/components/DailyInsight'
import { Dumbbell } from 'lucide-react'
import FramedCard from '@/components/FramedCard'
import ISymbol from '@/components/ISymbol'

export const revalidate = 0

type NutritionRow = { cal: number; prot: number; carbs: number; fat: number }
type InBodyRow = { reading_date: number; weight_kg: number | null; body_fat_pct: number | null; lean_mass_kg: number | null }
type MealRow = { id: string; logged_at: number; total_calories: number; total_protein: number; items_json: string; photo_url: string | null }
type WhoopRow = { date: string; recovery_score: number | null; strain: number | null; hrv_ms: number | null; rhr: number | null; sleep_minutes: number | null; sleep_efficiency: number | null }
type WhoopWeekRow = { date: string; hrv_ms: number | null; recovery_score: number | null; sleep_minutes: number | null; sleep_efficiency: number | null }
type WeekNutritionRow = { day: string; cal: number }

export default async function Today() {
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [GOALS, nutritionResult, inbodyResult, mealsResult, whoopResult, whoopWeekResult, weekNutritionResult] = await Promise.all([
    getGoals(),
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
      sql: `SELECT date, recovery_score, strain, hrv_ms, rhr, sleep_minutes, sleep_efficiency FROM whoop_daily WHERE user_id = 'will' AND date IN (?, ?) ORDER BY date DESC LIMIT 1`,
      args: [todayStr, yesterdayStr],
    }),
    db.execute({
      sql: `SELECT date, hrv_ms, recovery_score, sleep_minutes, sleep_efficiency FROM whoop_daily WHERE user_id = 'will' ORDER BY date DESC LIMIT 7`,
      args: [],
    }),
    db.execute({
      sql: `SELECT date(logged_at/1000, 'unixepoch') as day, ROUND(SUM(total_calories)) as cal FROM meals WHERE user_id = 'will' AND logged_at >= ? GROUP BY day`,
      args: [Date.now() - 7 * 24 * 60 * 60 * 1000],
    }),
  ])

  const n = nutritionResult.rows[0] as unknown as NutritionRow
  const latest = inbodyResult.rows[0] as unknown as InBodyRow | undefined
  const meals = mealsResult.rows as unknown as MealRow[]
  const whoop = whoopResult.rows[0] as unknown as WhoopRow | undefined
  const whoopWeek = whoopWeekResult.rows as unknown as WhoopWeekRow[]
  const weekNutrition = weekNutritionResult.rows as unknown as WeekNutritionRow[]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // HRV sparkline values — sorted oldest→newest for left-to-right display
  const hrvValues = [...whoopWeek].reverse().map(r => r.hrv_ms)

  // 7-day adherence: build array for last 7 calendar days
  const calMap: Record<string, number> = {}
  for (const row of weekNutrition) {
    calMap[row.day] = row.cal
  }
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const key = d.toISOString().split('T')[0]
    const initial = d.toLocaleDateString('en-US', { weekday: 'narrow' })
    const cal = calMap[key] ?? 0
    const pct = cal / GOALS.daily_calories
    const color = pct >= 0.9 ? 'bg-ok' : pct >= 0.5 ? 'bg-warn' : 'bg-surface'
    return { key, initial, color }
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

        {/* Recovery arc + HRV sparkline */}
        <div className="flex items-center gap-3 mb-4">
          <RecoveryArc score={whoop?.recovery_score ?? null} muted={!whoop} />
          <div className="flex-1 min-w-0">
            <HrvSparkline values={whoop ? hrvValues : [48, 51, 55, 50, 53, 54, 52]} muted={!whoop} />
            <p className="text-ink3 text-xs mt-1">HRV 7-day trend</p>
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
            },
            {
              label: 'Efficiency',
              value: whoop
                ? (whoop.sleep_efficiency != null ? `${Math.round(whoop.sleep_efficiency)}%` : '—')
                : '87%',
            },
            {
              label: 'HRV',
              value: whoop
                ? (whoop.hrv_ms != null ? `${Math.round(whoop.hrv_ms)}ms` : '—')
                : '52ms',
            },
            {
              label: 'Strain',
              value: whoop
                ? (whoop.strain != null ? whoop.strain.toFixed(1) : '—')
                : '11.2',
            },
            {
              label: 'RHR',
              value: whoop
                ? (whoop.rhr != null ? `${Math.round(whoop.rhr)}bpm` : '—')
                : '56bpm',
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className={`font-bold text-sm tabular-nums ${!whoop ? 'text-ink3' : 'text-ink'}`}>{value}</p>
              <p className="text-ink3 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Sleep stages */}
        <div className="mt-3 pt-3 border-t border-line">
          <p className="eyebrow mb-2">Sleep Stages</p>
          <SleepStagesBar minutes={whoop?.sleep_minutes ?? (whoop ? null : 432)} muted={!whoop} />
        </div>
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
              value={latest.weight_kg != null ? Math.round(latest.weight_kg * 2.20462).toString() : '—'}
              unit="lbs"
              delta={latest.weight_kg != null ? (Math.round(latest.weight_kg * 2.20462) - GOALS.target_weight_lbs) : null}
              label="Weight"
              positiveIsGood={false}
            />
            <StatBlock
              value={latest.body_fat_pct?.toFixed(1) ?? '—'}
              unit="%"
              delta={latest.body_fat_pct != null ? (latest.body_fat_pct - GOALS.target_body_fat_pct) : null}
              label="Body Fat"
              positiveIsGood={false}
            />
            <div className="text-center">
              <p className="text-ink font-bold text-xl tabular-nums leading-tight">
                {latest.lean_mass_kg != null ? Math.round(latest.lean_mass_kg * 2.20462) : '—'}
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

function HybridAthleteTip({ dayOfWeek }: { dayOfWeek: number }) {
  // Rotate through all tips based on day-of-year so each day shows a different tip
  const dayOfYear = Math.floor(Date.now() / 86400000)
  const tip = HYBRID_TIPS[dayOfYear % HYBRID_TIPS.length]

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
          <p className="text-ink4 text-[10px]">{(dayOfYear % HYBRID_TIPS.length) + 1}/{HYBRID_TIPS.length}</p>
        </div>
      </div>
    </div>
  )
}

function HrvSparkline({ values, muted = false }: { values: (number | null)[]; muted?: boolean }) {
  const valid = values.filter(v => v != null) as number[]
  if (valid.length < 2) return null
  const min = Math.min(...valid), max = Math.max(...valid)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = v != null ? 32 - ((v - min) / range) * 28 : null
      return y != null ? `${x},${y}` : null
    })
    .filter(Boolean)
    .join(' ')
  return (
    <svg viewBox="0 0 100 32" className={`w-full h-8 ${muted ? 'opacity-40' : ''}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand"
      />
    </svg>
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

function SleepStagesBar({ minutes, muted = false }: { minutes: number | null; muted?: boolean }) {
  const total = minutes ?? 432
  const stages = [
    { label: 'Awake', pct: 0.05, color: '#475569' },
    { label: 'Light', pct: 0.50, color: '#3b82f6' },
    { label: 'Deep',  pct: 0.20, color: '#6366f1' },
    { label: 'REM',   pct: 0.25, color: '#8b5cf6' },
  ]
  const fmt = (m: number) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`
  return (
    <div className={muted ? 'opacity-50' : ''}>
      <div className="flex rounded-full overflow-hidden h-2.5 mb-2">
        {stages.map(s => (
          <div key={s.label} style={{ width: `${s.pct * 100}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <div className="flex gap-4 flex-wrap">
        {stages.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-ink3 text-xs">{s.label} {fmt(total * s.pct)}</span>
          </div>
        ))}
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
