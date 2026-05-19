'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, ChevronLeft } from 'lucide-react'
import ISymbol from '@/components/ISymbol'

type Sex = 'male' | 'female'
type Goal = 'lose_fat' | 'gain_muscle' | 'recomp' | 'performance'
type Sport = 'soccer' | 'basketball' | 'running' | 'cycling' | 'other' | 'none'

const GOALS: { value: Goal; label: string; sub: string }[] = [
  { value: 'lose_fat',     label: 'Lose Fat',        sub: 'Caloric deficit, high protein' },
  { value: 'gain_muscle',  label: 'Gain Muscle',     sub: 'Moderate surplus, progressive overload' },
  { value: 'recomp',       label: 'Recomposition',   sub: 'Maintain weight, drop fat, build muscle' },
  { value: 'performance',  label: 'Performance',     sub: 'Fuel for training, optimize recovery' },
]

const SPORTS: { value: Sport; label: string }[] = [
  { value: 'none',       label: 'None' },
  { value: 'soccer',     label: 'Soccer' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'running',    label: 'Running' },
  { value: 'cycling',    label: 'Cycling' },
  { value: 'other',      label: 'Other' },
]

// Mifflin-St Jeor BMR → TDEE → goal-adjusted calories + macros
function calculatePlan(
  weightLbs: number, heightFt: number, heightIn: number,
  age: number, sex: Sex, liftDays: number, cardioDays: number, goal: Goal
) {
  const weightKg = weightLbs * 0.453592
  const heightCm = (heightFt * 12 + heightIn) * 2.54
  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161

  const totalDays = liftDays + cardioDays
  const activityFactor =
    totalDays === 0 ? 1.2 :
    totalDays <= 2  ? 1.375 :
    totalDays <= 4  ? 1.55 :
    totalDays <= 6  ? 1.725 : 1.9
  const tdee = Math.round(bmr * activityFactor)

  const goalAdjust: Record<Goal, number> = {
    lose_fat: -400, gain_muscle: 300, recomp: 0, performance: 100,
  }
  const calories = tdee + goalAdjust[goal]

  const proteinPerLb: Record<Goal, number> = {
    lose_fat: 1.0, gain_muscle: 0.9, recomp: 1.0, performance: 0.8,
  }
  const protein = Math.round(weightLbs * proteinPerLb[goal])
  const fatCals = Math.round(calories * 0.27)
  const fat = Math.round(fatCals / 9)
  const carbs = Math.round((calories - protein * 4 - fatCals) / 4)

  const targetWeightDefaults: Record<Goal, number> = {
    lose_fat: Math.round(weightLbs * 0.9),
    gain_muscle: Math.round(weightLbs * 1.05),
    recomp: weightLbs,
    performance: weightLbs,
  }
  const targetBfDefaults: Record<Goal, Record<Sex, number>> = {
    lose_fat:    { male: 12, female: 20 },
    gain_muscle: { male: 16, female: 24 },
    recomp:      { male: 12, female: 20 },
    performance: { male: 14, female: 22 },
  }

  return {
    calories,
    protein,
    carbs: Math.max(0, carbs),
    fat,
    tdee,
    targetWeight: targetWeightDefaults[goal],
    targetBf: targetBfDefaults[goal][sex],
  }
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex justify-center gap-2 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-200 ${
            i + 1 === current ? 'w-4 h-2 bg-brand' : 'w-2 h-2 bg-line'
          }`}
        />
      ))}
    </div>
  )
}

function Input({
  label, type = 'text', value, onChange, placeholder, unit,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; unit?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink3 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-surface border border-line rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:border-brand pr-10"
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink4 text-xs">{unit}</span>
        )}
      </div>
    </div>
  )
}

function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-brand text-page font-semibold py-3.5 rounded-full text-sm disabled:opacity-40 active:scale-95 transition-transform mt-2"
    >
      {children}
    </button>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-ink3 text-sm py-1 mt-2">
      <ChevronLeft size={14} /> Back
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1: Profile
  const [name, setName]           = useState('')
  const [age, setAge]             = useState('')
  const [sex, setSex]             = useState<Sex>('male')
  const [weightLbs, setWeightLbs] = useState('')
  const [heightFt, setHeightFt]   = useState('')
  const [heightIn, setHeightIn]   = useState('')

  // Step 2: Goal
  const [goal, setGoal]               = useState<Goal>('recomp')
  const [targetWeight, setTargetWeight] = useState('')
  const [targetBf, setTargetBf]         = useState('')

  // Step 3: Training
  const [liftDays, setLiftDays]     = useState(3)
  const [cardioDays, setCardioDays] = useState(2)
  const [sport, setSport]           = useState<Sport>('none')

  // Step 4: Computed plan (editable)
  const [calories, setCalories] = useState('')
  const [protein, setProtein]   = useState('')
  const [carbs, setCarbs]       = useState('')
  const [fat, setFat]           = useState('')

  // Recompute plan whenever step 4 is entered
  useEffect(() => {
    if (step === 4) {
      const plan = calculatePlan(
        parseFloat(weightLbs) || 185,
        parseInt(heightFt) || 5,
        parseInt(heightIn) || 11,
        parseInt(age) || 25,
        sex, liftDays, cardioDays, goal
      )
      setCalories(plan.calories.toString())
      setProtein(plan.protein.toString())
      setCarbs(plan.carbs.toString())
      setFat(plan.fat.toString())
      if (!targetWeight) setTargetWeight(plan.targetWeight.toString())
      if (!targetBf)     setTargetBf(plan.targetBf.toString())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function finish() {
    await Promise.all([
      fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          weightKg: Math.round((parseFloat(weightLbs) || 0) * 0.453592 * 10) / 10,
          heightCm: Math.round(((parseInt(heightFt) || 0) * 12 + (parseInt(heightIn) || 0)) * 2.54),
          age: parseInt(age) || null,
          sex,
          trainingProfile: liftDays >= 3 && cardioDays >= 2 ? 'hybrid' : liftDays >= 4 ? 'strength' : 'endurance',
          liftDays, cardioDays, sport, goal,
        }),
      }),
      fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_weight_lbs: parseFloat(targetWeight) || null,
          target_body_fat_pct: parseFloat(targetBf) || null,
          target_lean_mass_kg: 80,
          daily_calories: parseInt(calories) || 2500,
          daily_protein_g: parseInt(protein) || 180,
          daily_carbs_g: parseInt(carbs) || 200,
          daily_fat_g: parseInt(fat) || 80,
          daily_sleep_hours: 8,
        }),
      }),
    ])
  }

  const step1Valid = name.trim().length > 0 && weightLbs.trim().length > 0 && heightFt.trim().length > 0

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <div className="max-w-sm mx-auto px-5 w-full pt-14 pb-10 flex flex-col flex-1">

        <div className="flex items-center gap-2 mb-8">
          <ISymbol size={13} className="text-brand opacity-80" />
          <span className="eyebrow text-brand text-xs">Frame</span>
        </div>

        <StepDots current={step} total={5} />

        {/* ── Step 1: Profile ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">Who are you?</h1>
              <p className="text-ink3 text-sm mt-1">We use this to calculate your targets — nothing else.</p>
            </div>

            <Input label="First name" value={name} onChange={setName} placeholder="Will" />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Age" type="number" value={age} onChange={setAge} placeholder="28" unit="yrs" />
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1.5">Sex</label>
                <div className="flex rounded-2xl border border-line overflow-hidden bg-surface">
                  {(['male', 'female'] as Sex[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(s)}
                      className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                        sex === s ? 'bg-brand text-page' : 'text-ink3'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Input label="Body weight" type="number" value={weightLbs} onChange={setWeightLbs} placeholder="185" unit="lbs" />

            <div>
              <label className="block text-xs font-medium text-ink3 mb-1.5">Height</label>
              <div className="grid grid-cols-2 gap-3">
                <Input label="" type="number" value={heightFt} onChange={setHeightFt} placeholder="5" unit="ft" />
                <Input label="" type="number" value={heightIn} onChange={setHeightIn} placeholder="11" unit="in" />
              </div>
            </div>

            <PrimaryBtn onClick={() => setStep(2)} disabled={!step1Valid}>
              Next ›
            </PrimaryBtn>
          </div>
        )}

        {/* ── Step 2: Goal ── */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">What&apos;s your goal?</h1>
              <p className="text-ink3 text-sm mt-1">Pick the one that best matches where you&apos;re headed.</p>
            </div>

            <div className="flex flex-col gap-2">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={`text-left px-4 py-3.5 rounded-2xl border transition-colors ${
                    goal === g.value
                      ? 'border-brand bg-brand/10 text-ink'
                      : 'border-line bg-card text-ink3'
                  }`}
                >
                  <span className="block text-sm font-semibold">{g.label}</span>
                  <span className="block text-xs text-ink4 mt-0.5">{g.sub}</span>
                </button>
              ))}
            </div>

            <PrimaryBtn onClick={() => setStep(3)}>Next ›</PrimaryBtn>
            <BackBtn onClick={() => setStep(1)} />
          </div>
        )}

        {/* ── Step 3: Training ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">How do you train?</h1>
              <p className="text-ink3 text-sm mt-1">Used to estimate your activity level and calorie needs.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink3 mb-3">Lifting days / week</label>
              <div className="flex gap-2">
                {[0,1,2,3,4,5,6].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setLiftDays(d)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                      liftDays === d ? 'bg-brand text-page border-brand' : 'bg-surface text-ink3 border-line'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink3 mb-3">Cardio / sport days / week</label>
              <div className="flex gap-2">
                {[0,1,2,3,4,5,6].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCardioDays(d)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                      cardioDays === d ? 'bg-brand text-page border-brand' : 'bg-surface text-ink3 border-line'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink3 mb-2">Sport (optional)</label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSport(s.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                      sport === s.value ? 'bg-brand text-page border-brand' : 'bg-surface text-ink3 border-line'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <PrimaryBtn onClick={() => setStep(4)}>See my plan ›</PrimaryBtn>
            <BackBtn onClick={() => setStep(2)} />
          </div>
        )}

        {/* ── Step 4: Calculated plan ── */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">Your starting plan.</h1>
              <p className="text-ink3 text-sm mt-1">Calculated from your profile. Adjust anything that feels off.</p>
            </div>

            <div className="bg-card rounded-2xl border border-line p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink3 mb-1.5">Daily calories</label>
                  <div className="relative">
                    <input type="number" value={calories} onChange={e => setCalories(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-brand" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 text-xs">kcal</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink3 mb-1.5">Protein</label>
                  <div className="relative">
                    <input type="number" value={protein} onChange={e => setProtein(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-brand" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 text-xs">g</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink3 mb-1.5">Carbs</label>
                  <div className="relative">
                    <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-brand" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 text-xs">g</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink3 mb-1.5">Fat</label>
                  <div className="relative">
                    <input type="number" value={fat} onChange={e => setFat(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-brand" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 text-xs">g</span>
                  </div>
                </div>
              </div>

              <div className="pt-1 border-t border-line grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink3 mb-1.5">Target weight</label>
                  <div className="relative">
                    <input type="number" value={targetWeight} onChange={e => setTargetWeight(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-brand" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 text-xs">lbs</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink3 mb-1.5">Target body fat</label>
                  <div className="relative">
                    <input type="number" value={targetBf} onChange={e => setTargetBf(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-brand" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 text-xs">%</span>
                  </div>
                </div>
              </div>
            </div>

            <PrimaryBtn onClick={() => { finish(); setStep(5) }}>This looks good ›</PrimaryBtn>
            <BackBtn onClick={() => setStep(3)} />
          </div>
        )}

        {/* ── Step 5: Connect Whoop ── */}
        {step === 5 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">Connect Whoop.</h1>
              <p className="text-ink3 text-sm mt-1">Syncs your recovery, HRV, strain, sleep, and workouts automatically. You can skip this and connect later.</p>
            </div>

            <div className="bg-card rounded-2xl border border-line p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-bad/10 flex items-center justify-center shrink-0">
                <span className="text-bad font-bold text-base">W</span>
              </div>
              <div>
                <p className="text-ink font-semibold text-sm">Whoop</p>
                <p className="text-ink3 text-xs">Recovery · HRV · Strain · Sleep · Workouts</p>
              </div>
            </div>

            <a
              href="/api/whoop/auth"
              className="w-full flex items-center justify-center gap-2 bg-brand text-page font-semibold py-3.5 rounded-full text-sm active:scale-95 transition-transform mt-2"
            >
              <ExternalLink size={15} />
              Connect Whoop ›
            </a>

            <button
              type="button"
              onClick={() => router.replace('/')}
              className="text-ink3 text-sm text-center py-1"
            >
              Skip for now →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
