'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Share2, Loader2 } from 'lucide-react'
import FramedCard from '@/components/FramedCard'

type Meal = {
  id: string
  logged_at: number
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  items_json: string | null
}

type MealDay = { dateLabel: string; dateStr: string; meals: Meal[] }

type Workout = {
  id: string
  logged_at: number
  session_type: string
  duration_minutes: number | null
  notes: string | null
  strain: number | null
  muscles: { muscle_id: string; volume: string }[]
}

type Tab = 'meals' | 'workouts'
type SessionType = 'Strength' | 'Soccer' | 'Cardio' | 'Other'

type PeriMeal = { id: string; logged_at: number; total_calories: number; total_protein: number }
type WorkoutSet = { exercise: string; set_num: number; reps: number | null; weight_lbs: number | null }
type DigestData = {
  totalWorkouts: number
  workoutBreakdown: { session_type: string; cnt: number }[]
  avgCal: number | null
  avgProt: number | null
  daysLogged: number
  avgRecovery: number | null
  calPct: number | null
  protPct: number | null
}

const SESSION_COLORS: Record<string, string> = {
  Strength: 'bg-blue-500/15 text-blue-400',
  Soccer: 'bg-ok/15 text-ok',
  Cardio: 'bg-amber-500/15 text-amber-400',
  Other: 'bg-ink4/20 text-ink3',
}

function formatDate(ts: number) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function groupMealsByDay(meals: Meal[]): MealDay[] {
  const map = new Map<string, Meal[]>()
  for (const m of meals) {
    const d = new Date(m.logged_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateStr, meals]) => ({
      dateStr,
      dateLabel: formatDate(meals[0].logged_at),
      meals: meals.sort((a, b) => b.logged_at - a.logged_at),
    }))
}

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>('meals')

  const [meals, setMeals] = useState<Meal[]>([])
  const [mealsLoading, setMealsLoading] = useState(true)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editMacros, setEditMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null)

  const [sharing, setSharing] = useState(false)

  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [workoutsLoading, setWorkoutsLoading] = useState(true)
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const [editWorkout, setEditWorkout] = useState<{ session_type: SessionType; duration: string; notes: string }>({ session_type: 'Strength', duration: '', notes: '' })
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null)
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
  const [periMeals, setPeriMeals] = useState<Record<string, PeriMeal[]>>({})
  const [setsData, setSetsData] = useState<Record<string, WorkoutSet[]>>({})
  const [loadedWorkouts, setLoadedWorkouts] = useState<Set<string>>(new Set())
  const [digest, setDigest] = useState<DigestData | null>(null)

  const fetchMeals = useCallback(async () => {
    setMealsLoading(true)
    try {
      const res = await fetch('/api/meals?limit=200')
      if (res.ok) setMeals(await res.json())
    } finally {
      setMealsLoading(false)
    }
  }, [])

  const fetchWorkouts = useCallback(async () => {
    setWorkoutsLoading(true)
    try {
      const res = await fetch('/api/workouts?days=90')
      if (res.ok) {
        const data = await res.json()
        setWorkouts(data.sessions ?? [])
      }
    } finally {
      setWorkoutsLoading(false)
    }
  }, [])

  useEffect(() => { fetchMeals() }, [fetchMeals])
  useEffect(() => { fetchWorkouts() }, [fetchWorkouts])
  useEffect(() => {
    fetch('/api/digest/weekly').then(r => r.ok ? r.json() : null).then(d => { if (d) setDigest(d) })
  }, [])

  async function loadWorkoutDetails(w: Workout) {
    setLoadedWorkouts(prev => new Set(prev).add(w.id))
    const window2h = 2 * 60 * 60 * 1000
    const [mealsRes, setsRes] = await Promise.all([
      fetch(`/api/meals?from=${w.logged_at - window2h}&to=${w.logged_at + window2h}`),
      w.session_type === 'Strength' ? fetch(`/api/workouts/sets?sessionId=${w.id}`) : Promise.resolve(null),
    ])
    if (mealsRes.ok) {
      const meals = await mealsRes.json()
      setPeriMeals(prev => ({ ...prev, [w.id]: meals }))
    }
    if (setsRes && setsRes.ok) {
      const { sets } = await setsRes.json()
      setSetsData(prev => ({ ...prev, [w.id]: sets }))
    }
  }

  // Meal handlers
  function startEditMeal(meal: Meal) {
    setEditingMealId(meal.id)
    setEditMacros({
      calories: Math.round(Number(meal.total_calories)),
      protein: Math.round(Number(meal.total_protein)),
      carbs: Math.round(Number(meal.total_carbs)),
      fat: Math.round(Number(meal.total_fat)),
    })
  }

  async function saveMealEdit(id: string) {
    await fetch(`/api/meals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_calories: editMacros.calories, total_protein: editMacros.protein, total_carbs: editMacros.carbs, total_fat: editMacros.fat }),
    })
    setEditingMealId(null)
    fetchMeals()
  }

  async function deleteMeal(id: string) {
    setDeletingMealId(id)
    try {
      await fetch(`/api/meals/${id}`, { method: 'DELETE' })
      fetchMeals()
    } finally {
      setDeletingMealId(null)
    }
  }

  // Workout handlers
  function startEditWorkout(w: Workout) {
    setEditingWorkoutId(w.id)
    setEditWorkout({
      session_type: w.session_type as SessionType,
      duration: w.duration_minutes != null ? String(w.duration_minutes) : '',
      notes: w.notes ?? '',
    })
  }

  async function saveWorkoutEdit(id: string) {
    await fetch(`/api/workouts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_type: editWorkout.session_type,
        duration_minutes: editWorkout.duration ? parseInt(editWorkout.duration, 10) : null,
        notes: editWorkout.notes.trim() || null,
      }),
    })
    setEditingWorkoutId(null)
    fetchWorkouts()
  }

  async function deleteWorkout(id: string) {
    setDeletingWorkoutId(id)
    try {
      await fetch(`/api/workouts/${id}`, { method: 'DELETE' })
      fetchWorkouts()
    } finally {
      setDeletingWorkoutId(null)
    }
  }

  async function shareWeeklyCard() {
    setSharing(true)
    try {
      const res = await fetch('/api/share/weekly-card')
      if (!res.ok) return
      const blob = await res.blob()
      const file = new File([blob], 'frame-weekly.png', { type: 'image/png' })
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Week on Frame' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'frame-weekly.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setSharing(false)
    }
  }

  const mealDays = groupMealsByDay(meals)

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">History</h1>
            <p className="text-ink3 text-sm">Last 90 days</p>
          </div>
          <button
            onClick={shareWeeklyCard}
            disabled={sharing}
            className="flex items-center gap-1.5 bg-surface border border-line text-ink3 text-xs font-semibold px-3 py-2 rounded-full active:scale-95 transition-transform disabled:opacity-40 mt-1"
          >
            {sharing
              ? <Loader2 size={13} className="animate-spin" />
              : <Share2 size={13} />
            }
            Share week
          </button>
        </div>
      </div>

      {/* Weekly digest */}
      {digest && (
        <div className="px-4 mb-5">
          <div className="bg-gradient-to-br from-brand/8 to-card rounded-2xl border border-brand/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow">This Week</span>
              <span className="text-ink4 text-xs">{digest.daysLogged}/7 days logged</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-ink font-bold text-lg tabular-nums">{digest.totalWorkouts}</p>
                <p className="text-ink3 text-xs">sessions</p>
              </div>
              <div>
                <p className={`font-bold text-lg tabular-nums ${digest.calPct != null && digest.calPct >= 90 ? 'text-ok' : 'text-warn'}`}>
                  {digest.calPct != null ? `${digest.calPct}%` : '—'}
                </p>
                <p className="text-ink3 text-xs">cal goal</p>
              </div>
              <div>
                <p className={`font-bold text-lg tabular-nums ${digest.protPct != null && digest.protPct >= 90 ? 'text-ok' : 'text-warn'}`}>
                  {digest.protPct != null ? `${digest.protPct}%` : '—'}
                </p>
                <p className="text-ink3 text-xs">prot goal</p>
              </div>
              <div>
                <p className={`font-bold text-lg tabular-nums ${
                  digest.avgRecovery == null ? 'text-ink3' :
                  digest.avgRecovery >= 67 ? 'text-ok' :
                  digest.avgRecovery >= 34 ? 'text-warn' : 'text-bad'
                }`}>
                  {digest.avgRecovery ?? '—'}
                </p>
                <p className="text-ink3 text-xs">recovery</p>
              </div>
            </div>
            {digest.workoutBreakdown.length > 0 && (
              <div className="flex gap-1.5 mt-3 pt-3 border-t border-line flex-wrap">
                {digest.workoutBreakdown.map(b => (
                  <span key={b.session_type} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SESSION_COLORS[b.session_type] ?? SESSION_COLORS.Other}`}>
                    {b.cnt}× {b.session_type}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab toggle */}
      <div className="px-4 mb-5">
        <div className="bg-surface rounded-2xl p-1 flex border border-line">
          {(['meals', 'workouts'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-colors capitalize ${
                tab === t ? 'bg-card text-ink shadow-sm' : 'text-ink3'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Meals tab */}
      {tab === 'meals' && (
        <div className="px-4 space-y-6">
          {mealsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : mealDays.length === 0 ? (
            <p className="text-ink3 text-sm text-center py-16">No meals logged yet.</p>
          ) : (
            mealDays.map(day => {
              const dayTotal = day.meals.reduce((s, m) => ({
                cal: s.cal + Number(m.total_calories),
                prot: s.prot + Number(m.total_protein),
              }), { cal: 0, prot: 0 })

              return (
                <div key={day.dateStr}>
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-ink font-semibold text-sm">{day.dateLabel}</p>
                    <p className="text-ink3 text-xs tabular-nums">
                      {Math.round(dayTotal.cal)} cal · {Math.round(dayTotal.prot)}g P
                    </p>
                  </div>
                  <div className="space-y-2">
                    {day.meals.map(meal => {
                      const time = new Date(meal.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      const isEditing = editingMealId === meal.id
                      const isDeleting = deletingMealId === meal.id

                      return (
                        <FramedCard key={meal.id} className="bg-card rounded-2xl border border-line p-4">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-4 gap-2">
                                {(['calories', 'protein', 'carbs', 'fat'] as const).map(field => (
                                  <div key={field} className="text-center">
                                    <p className="text-ink4 text-[10px] mb-1">
                                      {field === 'calories' ? 'Cal' : field === 'protein' ? 'Pro' : field === 'carbs' ? 'Carb' : 'Fat'}
                                    </p>
                                    <input
                                      type="number"
                                      value={editMacros[field]}
                                      onChange={e => setEditMacros(prev => ({ ...prev, [field]: Number(e.target.value) }))}
                                      className="w-full bg-surface rounded-lg px-1 py-1.5 text-ink text-sm font-medium focus:outline-none text-center border border-line"
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveMealEdit(meal.id)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand text-page text-sm font-semibold active:scale-95 transition-transform"
                                >
                                  <Check size={14} /> Save
                                </button>
                                <button
                                  onClick={() => setEditingMealId(null)}
                                  className="flex-1 py-2 rounded-xl bg-surface border border-line text-ink3 text-sm font-medium active:scale-95 transition-transform"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-ink3 text-xs mb-0.5">{time}</p>
                                <div className="flex items-center gap-3 tabular-nums flex-wrap">
                                  <span className="text-ink font-semibold text-sm">{Math.round(Number(meal.total_calories))} cal</span>
                                  <span className="text-ok text-sm">{Math.round(Number(meal.total_protein))}g P</span>
                                  <span className="text-amber-500 text-sm">{Math.round(Number(meal.total_carbs))}g C</span>
                                  <span className="text-purple-400 text-sm">{Math.round(Number(meal.total_fat))}g F</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => startEditMeal(meal)}
                                  className="w-8 h-8 flex items-center justify-center text-ink3 hover:text-ink active:scale-90 transition-transform"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => deleteMeal(meal.id)}
                                  disabled={isDeleting}
                                  className="w-8 h-8 flex items-center justify-center text-bad/70 hover:text-bad active:scale-90 transition-transform disabled:opacity-40"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </FramedCard>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Workouts tab */}
      {tab === 'workouts' && (
        <div className="px-4 space-y-2">
          {workoutsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : workouts.length === 0 ? (
            <p className="text-ink3 text-sm text-center py-16">No workouts logged yet.</p>
          ) : (
            workouts.map(w => {
              const isEditing = editingWorkoutId === w.id
              const isDeleting = deletingWorkoutId === w.id
              const isExpanded = expandedWorkoutId === w.id
              const sessionColor = SESSION_COLORS[w.session_type] ?? SESSION_COLORS.Other
              const dateLabel = formatDate(w.logged_at)
              const time = new Date(w.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

              return (
                <FramedCard key={w.id} className="bg-card rounded-2xl border border-line p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2">Session Type</p>
                        <div className="flex gap-2 flex-wrap">
                          {(['Strength', 'Soccer', 'Cardio', 'Other'] as SessionType[]).map(type => (
                            <button
                              key={type}
                              onClick={() => setEditWorkout(prev => ({ ...prev, session_type: type }))}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                editWorkout.session_type === type
                                  ? 'bg-brand text-page border-brand'
                                  : 'bg-surface text-ink3 border-line'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-ink4 text-[10px] mb-1">Duration (min)</p>
                          <input
                            type="number"
                            value={editWorkout.duration}
                            onChange={e => setEditWorkout(prev => ({ ...prev, duration: e.target.value }))}
                            placeholder="—"
                            className="w-full bg-surface rounded-lg px-3 py-1.5 text-ink text-sm focus:outline-none border border-line"
                          />
                        </div>
                        <div>
                          <p className="text-ink4 text-[10px] mb-1">Notes</p>
                          <input
                            type="text"
                            value={editWorkout.notes}
                            onChange={e => setEditWorkout(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="—"
                            className="w-full bg-surface rounded-lg px-3 py-1.5 text-ink text-sm focus:outline-none border border-line"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveWorkoutEdit(w.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand text-page text-sm font-semibold active:scale-95 transition-transform"
                        >
                          <Check size={14} /> Save
                        </button>
                        <button
                          onClick={() => setEditingWorkoutId(null)}
                          className="flex-1 py-2 rounded-xl bg-surface border border-line text-ink3 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sessionColor}`}>
                              {w.session_type}
                            </span>
                            {w.duration_minutes != null && (
                              <span className="text-ink3 text-xs">{w.duration_minutes} min</span>
                            )}
                            {w.strain != null && (
                              <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                                {w.strain.toFixed(1)} strain
                              </span>
                            )}
                          </div>
                          <p className="text-ink3 text-xs">{dateLabel} · {time}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              const next = isExpanded ? null : w.id
                              setExpandedWorkoutId(next)
                              if (next && !loadedWorkouts.has(next)) loadWorkoutDetails(w)
                            }}
                            className="w-8 h-8 flex items-center justify-center text-ink3 hover:text-ink active:scale-90 transition-transform"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button
                            onClick={() => startEditWorkout(w)}
                            className="w-8 h-8 flex items-center justify-center text-ink3 hover:text-ink active:scale-90 transition-transform"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteWorkout(w.id)}
                            disabled={isDeleting}
                            className="w-8 h-8 flex items-center justify-center text-bad/70 hover:text-bad active:scale-90 transition-transform disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {w.notes && (
                        <p className="text-ink3 text-xs mt-1.5 truncate">{w.notes}</p>
                      )}

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-line space-y-3">
                          {/* Muscle tags */}
                          {w.muscles.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {w.muscles.map(m => (
                                <span
                                  key={m.muscle_id}
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                    m.volume === 'high' ? 'bg-brand/15 border-brand/30 text-brand' :
                                    m.volume === 'medium' ? 'bg-ok/10 border-ok/20 text-ok' :
                                    'bg-surface border-line text-ink3'
                                  }`}
                                >
                                  {m.muscle_id.replace(/-/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Sets (Strength) */}
                          {w.session_type === 'Strength' && setsData[w.id] && setsData[w.id].length > 0 && (() => {
                            const byExercise: Record<string, WorkoutSet[]> = {}
                            for (const s of setsData[w.id]) {
                              if (!byExercise[s.exercise]) byExercise[s.exercise] = []
                              byExercise[s.exercise].push(s)
                            }
                            return (
                              <div className="space-y-1.5">
                                <p className="text-ink4 text-[10px] font-semibold uppercase tracking-wider">Sets</p>
                                {Object.entries(byExercise).map(([exercise, exSets]) => (
                                  <div key={exercise} className="flex items-start gap-2">
                                    <p className="text-ink3 text-xs font-medium w-28 shrink-0 truncate">{exercise}</p>
                                    <div className="flex flex-wrap gap-1">
                                      {exSets.map((s, i) => (
                                        <span key={i} className="text-[11px] bg-surface border border-line rounded-lg px-2 py-0.5 tabular-nums text-ink3">
                                          {s.reps ?? '—'}×{s.weight_lbs != null ? `${s.weight_lbs}lb` : '—'}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}

                          {/* Peri-workout meals */}
                          {periMeals[w.id] && periMeals[w.id].length > 0 && (() => {
                            const pre = periMeals[w.id].filter(m => m.logged_at < w.logged_at)
                            const post = periMeals[w.id].filter(m => m.logged_at >= w.logged_at)
                            return (
                              <div className="space-y-1.5">
                                <p className="text-ink4 text-[10px] font-semibold uppercase tracking-wider">Peri-workout meals</p>
                                {pre.length > 0 && (
                                  <div>
                                    <p className="text-ink4 text-[10px] mb-1">Pre</p>
                                    {pre.map(m => (
                                      <div key={m.id} className="flex items-center justify-between text-xs py-0.5">
                                        <span className="text-ink3">{new Date(m.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                                        <div className="flex gap-2 tabular-nums">
                                          <span className="text-ink font-medium">{Math.round(Number(m.total_calories))} cal</span>
                                          <span className="text-ok">{Math.round(Number(m.total_protein))}g P</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {post.length > 0 && (
                                  <div>
                                    <p className="text-ink4 text-[10px] mb-1">Post</p>
                                    {post.map(m => (
                                      <div key={m.id} className="flex items-center justify-between text-xs py-0.5">
                                        <span className="text-ink3">{new Date(m.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                                        <div className="flex gap-2 tabular-nums">
                                          <span className="text-ink font-medium">{Math.round(Number(m.total_calories))} cal</span>
                                          <span className="text-ok">{Math.round(Number(m.total_protein))}g P</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </FramedCard>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
