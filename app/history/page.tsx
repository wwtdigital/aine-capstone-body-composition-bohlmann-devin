'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
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
    const key = d.toISOString().split('T')[0]
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

  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [workoutsLoading, setWorkoutsLoading] = useState(true)
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const [editWorkout, setEditWorkout] = useState<{ session_type: SessionType; duration: string; notes: string }>({ session_type: 'Strength', duration: '', notes: '' })
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null)
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)

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

  const mealDays = groupMealsByDay(meals)

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-ink tracking-tight">History</h1>
        <p className="text-ink3 text-sm">Last 90 days</p>
      </div>

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
                          {w.muscles.length > 0 && (
                            <button
                              onClick={() => setExpandedWorkoutId(isExpanded ? null : w.id)}
                              className="w-8 h-8 flex items-center justify-center text-ink3 hover:text-ink active:scale-90 transition-transform"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
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

                      {isExpanded && w.muscles.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-1.5">
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
