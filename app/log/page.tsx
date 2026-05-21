'use client'

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RotateCcw, Camera, X, Pencil, Trash2, Check } from 'lucide-react'
import FramedCard from '@/components/FramedCard'

type MealItem = {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: 'low' | 'medium' | 'high'
}

type Step = 'capture' | 'analyzing' | 'confirm' | 'saving' | 'error'

type SavedMeal = {
  id: string
  logged_at: number
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  items_json: string | null
}

const PHOTO_LOADING_MESSAGES = [
  'Reading the plate...',
  'Identifying portions...',
  'Calculating macros...',
  'Almost done...',
]

const TEXT_LOADING_MESSAGES = [
  'Estimating portions...',
  'Calculating macros...',
  'Almost done...',
]

async function resizeAndEncode(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX }
        else { width = Math.round((width * MAX) / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        const reader = new FileReader()
        reader.onload = () => resolve({ base64: (reader.result as string).split(',')[1], mediaType: 'image/jpeg' })
        reader.readAsDataURL(blob!)
      }, 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

function totals(items: MealItem[]) {
  return {
    calories: items.reduce((s, i) => s + (Number(i.calories) || 0), 0),
    protein: items.reduce((s, i) => s + (Number(i.protein) || 0), 0),
    carbs: items.reduce((s, i) => s + (Number(i.carbs) || 0), 0),
    fat: items.reduce((s, i) => s + (Number(i.fat) || 0), 0),
  }
}

export default function LogPage() {
  const [step, setStep] = useState<Step>('capture')
  const [mode, setMode] = useState<'photo' | 'text'>('photo')
  const [preview, setPreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState('image/jpeg')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<MealItem[]>([])
  const [notes, setNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingText, setLoadingText] = useState(PHOTO_LOADING_MESSAGES[0])
  const [loggedAt, setLoggedAt] = useState(() => Date.now())
  const [todayMeals, setTodayMeals] = useState<SavedMeal[]>([])
  const [weekMeals, setWeekMeals] = useState<SavedMeal[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMacros, setEditMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  async function fetchTodayMeals() {
    try {
      const res = await fetch('/api/meals')
      if (!res.ok) return
      const all: SavedMeal[] = await res.json()
      const toLocalDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const todayStr = toLocalDate(new Date())
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      setTodayMeals(all.filter(m => toLocalDate(new Date(m.logged_at)) === todayStr))
      setWeekMeals(all.filter(m => m.logged_at >= sevenDaysAgo))
    } catch { /* silent */ }
  }

  async function handleDeleteMeal(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/meals/${id}`, { method: 'DELETE' })
      await fetchTodayMeals()
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(meal: SavedMeal) {
    setEditingId(meal.id)
    setEditMacros({
      calories: Math.round(Number(meal.total_calories)),
      protein: Math.round(Number(meal.total_protein)),
      carbs: Math.round(Number(meal.total_carbs)),
      fat: Math.round(Number(meal.total_fat)),
    })
  }

  async function handleSaveEdit(id: string) {
    await fetch(`/api/meals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total_calories: editMacros.calories,
        total_protein: editMacros.protein,
        total_carbs: editMacros.carbs,
        total_fat: editMacros.fat,
      }),
    })
    setEditingId(null)
    await fetchTodayMeals()
  }

  useEffect(() => { fetchTodayMeals() }, [])

  useEffect(() => {
    if (step === 'analyzing') {
      const messages = mode === 'text' ? TEXT_LOADING_MESSAGES : PHOTO_LOADING_MESSAGES
      let idx = 0
      setLoadingText(messages[0])
      loadingInterval.current = setInterval(() => {
        idx = (idx + 1) % messages.length
        setLoadingText(messages[idx])
      }, 2500)
    } else {
      if (loadingInterval.current) clearInterval(loadingInterval.current)
    }
    return () => { if (loadingInterval.current) clearInterval(loadingInterval.current) }
  }, [step, mode])

  async function handleTextAnalyze() {
    if (!description.trim()) return
    setStep('analyzing')
    try {
      const res = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? 'Analysis failed. Try again.'); setStep('error'); return }
      setItems(data.items ?? [])
      setNotes(data.notes ?? '')
      setStep('confirm')
    } catch {
      setErrorMsg('Connection error. Try again.')
      setStep('error')
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setStep('analyzing')
    setLoadingText(PHOTO_LOADING_MESSAGES[0])

    try {
      const { base64, mediaType: mt } = await resizeAndEncode(file)
      setImageBase64(base64)
      setMediaType(mt)

      const res = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: mt }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? 'Analysis failed. Try again.'); setStep('error'); return }
      setItems(data.items ?? [])
      setNotes(data.notes ?? '')
      setStep('confirm')
    } catch {
      setErrorMsg('Connection error. Try again.')
      setStep('error')
    }
  }

  function updateItem(idx: number, field: keyof MealItem, value: string | number) {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: field === 'name' || field === 'portion' || field === 'confidence' ? value : Number(value) } : item
    ))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (items.length === 0) return
    setStep('saving')
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, imageBase64, mediaType, loggedAt, notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        setErrorMsg(data.error ?? 'Save failed. Try again.')
        setStep('error')
        return
      }
      router.push('/')
    } catch {
      setErrorMsg('Connection error. Try again.')
      setStep('error')
    }
  }

  const t = totals(items)

  function sumMeals(meals: SavedMeal[]) {
    return meals.reduce(
      (acc, m) => ({
        cal: acc.cal + Math.round(Number(m.total_calories)),
        pro: acc.pro + Math.round(Number(m.total_protein)),
        carb: acc.carb + Math.round(Number(m.total_carbs)),
        fat: acc.fat + Math.round(Number(m.total_fat)),
      }),
      { cal: 0, pro: 0, carb: 0, fat: 0 }
    )
  }

  if (step === 'capture') {
    return (
      <div className="min-h-screen bg-page pb-24">
        <div className="px-4 pt-12 pb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Log Meal</h1>
          <p className="text-ink3 text-sm">{mode === 'photo' ? 'Photo-based analysis' : 'Text-based analysis'}</p>
        </div>

        <div className="px-4 mb-4">
          <Link href="/log/workout" className="flex items-center justify-between bg-surface border border-line rounded-2xl px-4 py-3">
            <span className="text-ink3 text-sm">Lifting or soccer today?</span>
            <span className="text-brand text-sm font-semibold">Log Workout →</span>
          </Link>
        </div>

        {/* Meal time picker */}
        <div className="px-4 mb-4">
          <div className="bg-surface border border-line rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-ink3 text-sm">Meal time</span>
            <input
              type="time"
              value={new Date(loggedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              onChange={e => {
                const [h, m] = e.target.value.split(':').map(Number)
                const d = new Date(loggedAt)
                d.setHours(h, m, 0, 0)
                setLoggedAt(d.getTime())
              }}
              className="bg-transparent text-ink text-sm font-semibold focus:outline-none"
            />
          </div>
        </div>

        {/* Full-width pill toggle */}
        <div className="px-4 mb-5">
          <div className="bg-surface rounded-2xl p-1 flex border border-line">
            <button
              onClick={() => { setMode('photo'); setDescription('') }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${mode === 'photo' ? 'bg-card text-ink shadow-sm' : 'text-ink3'}`}
            >
              Photo
            </button>
            <button
              onClick={() => { setMode('text'); setPreview(null); setImageBase64(null) }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${mode === 'text' ? 'bg-card text-ink shadow-sm' : 'text-ink3'}`}
            >
              Text
            </button>
          </div>
        </div>

        <div className="px-4">
          {mode === 'photo' ? (
            <>
              <label
                htmlFor="meal-photo"
                className="relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed border-line bg-card cursor-pointer active:scale-95 transition-transform ring-2 ring-brand/10"
                style={{ minHeight: '260px' }}
              >
                <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center"><Camera size={28} className="text-ink3" /></div>
                  <div>
                    <p className="text-ink font-semibold text-lg">Take a photo</p>
                    <p className="text-ink3 text-sm mt-1">or choose from library</p>
                  </div>
                </div>
              </label>
              <input ref={fileRef} id="meal-photo" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            </>
          ) : (
            <div className="space-y-3">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your meal — e.g. 'grilled chicken breast, 1 cup white rice, steamed broccoli'"
                maxLength={1000}
                className="bg-surface rounded-xl border border-line px-4 py-3 text-ink w-full focus:outline-none focus:border-linehi resize-none"
                style={{ minHeight: '160px' }}
              />
              <button
                onClick={handleTextAnalyze}
                disabled={!description.trim()}
                className="bg-brand text-page font-semibold rounded-full py-4 w-full disabled:opacity-40 active:scale-95 transition-transform"
              >
                Analyze ›
              </button>
            </div>
          )}
        </div>

        {(todayMeals.length > 0 || weekMeals.length > 0) && (
          <div className="px-4 mt-8">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Today', s: sumMeals(todayMeals) },
                { label: 'This week', s: sumMeals(weekMeals) },
              ].map(({ label, s }) => (
                <div key={label} className="bg-card border border-line rounded-2xl p-4">
                  <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
                  <p className="text-ink font-bold text-xl tabular-nums">{s.cal} <span className="text-ink3 text-sm font-normal">cal</span></p>
                  <div className="flex gap-2 mt-1.5 tabular-nums text-xs">
                    <span className="text-ok font-medium">{s.pro}g P</span>
                    <span className="text-amber-500 font-medium">{s.carb}g C</span>
                    <span className="text-purple-400 font-medium">{s.fat}g F</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {todayMeals.length > 0 && (
          <div className="px-4 mt-6">
            <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-3">Today&apos;s meals</p>
            <div className="space-y-2">
              {todayMeals.map(meal => {
                const time = new Date(meal.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                const isEditing = editingId === meal.id
                const isDeleting = deletingId === meal.id

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
                            onClick={() => handleSaveEdit(meal.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand text-page text-sm font-semibold active:scale-95 transition-transform"
                          >
                            <Check size={14} /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
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
                          <div className="flex items-center gap-3 tabular-nums">
                            <span className="text-ink font-semibold text-sm">{Math.round(Number(meal.total_calories))} cal</span>
                            <span className="text-ok text-sm">{Math.round(Number(meal.total_protein))}g P</span>
                            <span className="text-amber-500 text-sm">{Math.round(Number(meal.total_carbs))}g C</span>
                            <span className="text-purple-400 text-sm">{Math.round(Number(meal.total_fat))}g F</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(meal)}
                            className="w-8 h-8 flex items-center justify-center text-ink3 hover:text-ink active:scale-90 transition-transform"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
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
        )}
      </div>
    )
  }

  if (step === 'analyzing') {
    return (
      <div className="min-h-screen bg-page flex flex-col pb-24">
        <div className="px-4 pt-12 pb-4">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Analyzing</h1>
        </div>
        {preview && (
          <div className="px-4 mb-6">
            <img src={preview} alt="Meal" className="w-full max-h-56 object-cover rounded-2xl" />
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-ink2 text-lg font-medium">{loadingText}</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-page flex flex-col pb-24">
        <div className="px-4 pt-12 pb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Log Meal</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          <p className="text-bad text-center">{errorMsg}</p>
          <button
            onClick={() => { setStep('capture'); setPreview(null) }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-line text-ink font-semibold"
          >
            <RotateCcw size={16} />
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (step === 'confirm' || step === 'saving') {
    return (
      <div className="min-h-screen bg-page pb-48">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Confirm</h1>
          <button
            onClick={() => setStep('capture')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-line text-ink3 text-sm font-medium active:scale-95 transition-transform"
          >
            <RotateCcw size={13} />
            Retake
          </button>
        </div>

        {/* Image preview */}
        {preview && (
          <div className="px-4 mb-4">
            <img src={preview} alt="Meal" className="w-full h-40 object-cover rounded-2xl" />
          </div>
        )}

        {/* Macro totals */}
        <div className="px-4 mb-5 grid grid-cols-4 gap-2">
          {[
            { label: 'Cal', value: String(Math.round(t.calories)), color: 'text-blue-500' },
            { label: 'Pro', value: `${Math.round(t.protein)}g`, color: 'text-ok' },
            { label: 'Carb', value: `${Math.round(t.carbs)}g`, color: 'text-amber-500' },
            { label: 'Fat', value: `${Math.round(t.fat)}g`, color: 'text-purple-400' },
          ].map(({ label, value, color }) => (
            <FramedCard key={label} className="bg-card rounded-2xl border border-line p-3 text-center">
              <p className={`font-bold text-lg tabular-nums ${color}`}>{value}</p>
              <p className="text-ink4 text-xs mt-0.5">{label}</p>
            </FramedCard>
          ))}
        </div>

        {/* Item cards */}
        <div className="px-4 space-y-3">
          {items.map((item, idx) => (
            <FramedCard key={idx} className="bg-card rounded-2xl border border-line p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateItem(idx, 'name', e.target.value)}
                    className="w-full bg-transparent text-ink font-semibold text-sm focus:outline-none"
                  />
                  <input
                    type="text"
                    value={item.portion}
                    onChange={e => updateItem(idx, 'portion', e.target.value)}
                    placeholder="Portion size"
                    className="w-full bg-transparent text-ink3 text-xs focus:outline-none mt-0.5"
                  />
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="w-7 h-7 flex items-center justify-center text-ink4 hover:text-ink3 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-line">
                {(['calories', 'protein', 'carbs', 'fat'] as const).map(field => (
                  <div key={field} className="text-center">
                    <p className="text-ink4 text-[10px] mb-1">
                      {field === 'calories' ? 'Cal' : field === 'protein' ? 'Pro' : field === 'carbs' ? 'Carb' : 'Fat'}
                    </p>
                    <input
                      type="number"
                      value={item[field]}
                      onChange={e => updateItem(idx, field, e.target.value)}
                      className="w-full bg-surface rounded-lg px-1 py-1.5 text-ink text-sm font-medium focus:outline-none text-center border border-line"
                    />
                  </div>
                ))}
              </div>
              {item.confidence === 'low' && (
                <p className="text-warn text-xs">Low confidence — verify this item</p>
              )}
            </FramedCard>
          ))}
        </div>

        {notes && <p className="px-4 mt-3 text-ink3 text-xs">{notes}</p>}

        {/* Save bar — sits above BottomNav */}
        <div className="fixed bottom-[68px] left-0 right-0 px-4 pb-3 pt-3 bg-page/95 backdrop-blur-md border-t border-line z-40">
          <button
            onClick={handleSave}
            disabled={step === 'saving' || items.length === 0}
            className="w-full py-4 rounded-full bg-brand text-page font-bold text-base disabled:opacity-40 active:scale-95 transition-transform"
          >
            {step === 'saving' ? 'Saving...' : `Log meal — ${Math.round(t.calories)} cal ›`}
          </button>
        </div>
      </div>
    )
  }

  return null
}
