'use client'

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'

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
  const [loggedAt] = useState(() => Date.now())
  const fileRef = useRef<HTMLInputElement>(null)
  const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

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

  if (step === 'capture') {
    return (
      <div className="min-h-screen bg-page pb-24">
        <div className="px-4 pt-12 pb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Log Meal</h1>
          <p className="text-ink3 text-sm">{mode === 'photo' ? 'Photo-based analysis' : 'Text-based analysis'}</p>
        </div>

        <div className="px-4 mb-4">
          <div className="inline-flex rounded-2xl bg-surface p-1 gap-1">
            <button
              onClick={() => { setMode('photo'); setDescription('') }}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-colors ${mode === 'photo' ? 'bg-brand text-page' : 'bg-surface text-ink3'}`}
            >
              Photo
            </button>
            <button
              onClick={() => { setMode('text'); setPreview(null); setImageBase64(null) }}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-colors ${mode === 'text' ? 'bg-brand text-page' : 'bg-surface text-ink3'}`}
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
                className="flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed border-line bg-card cursor-pointer active:scale-95 transition-transform"
                style={{ minHeight: '260px' }}
              >
                <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center text-3xl">📷</div>
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
                className="bg-card border border-line rounded-2xl px-4 py-3 text-ink w-full focus:outline-none resize-none"
                style={{ minHeight: '160px' }}
              />
              <button
                onClick={handleTextAnalyze}
                disabled={!description.trim()}
                className="bg-brand text-page font-semibold rounded-2xl py-4 w-full disabled:opacity-40 active:scale-95 transition-transform"
              >
                Analyze
              </button>
            </div>
          )}
        </div>
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
      <div className="min-h-screen bg-page pb-32">
        <div className="flex items-center justify-between px-4 pt-12 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">Confirm</h1>
            <p className="text-ink3 text-sm">{items.length} item{items.length !== 1 ? 's' : ''} detected</p>
          </div>
          <button
            onClick={() => setStep('capture')}
            className="flex items-center gap-1.5 text-ink3 text-sm font-medium"
          >
            <RotateCcw size={14} />
            Retake
          </button>
        </div>

        {preview && (
          <div className="px-4 mb-4">
            <img src={preview} alt="Meal" className="w-full max-h-44 object-cover rounded-2xl" />
          </div>
        )}

        <div className="px-4 mb-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Cal', value: Math.round(t.calories), color: 'text-brand' },
            { label: 'Pro', value: `${Math.round(t.protein)}g`, color: 'text-ok' },
            { label: 'Carb', value: `${Math.round(t.carbs)}g`, color: 'text-warn' },
            { label: 'Fat', value: `${Math.round(t.fat)}g`, color: 'text-nourish' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card rounded-2xl border border-line p-3 text-center">
              <p className={`font-bold text-base tabular-nums ${color}`}>{value}</p>
              <p className="text-ink3 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="px-4 space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="bg-card rounded-2xl border border-line p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={e => updateItem(idx, 'name', e.target.value)}
                  className="flex-1 bg-transparent text-ink font-semibold text-base focus:outline-none border-b border-line pb-1"
                />
                <button
                  onClick={() => removeItem(idx)}
                  className="text-ink3 text-sm shrink-0 pt-1 w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={item.portion}
                onChange={e => updateItem(idx, 'portion', e.target.value)}
                placeholder="Portion size"
                className="w-full bg-transparent text-ink3 text-sm focus:outline-none"
              />
              <div className="grid grid-cols-4 gap-2">
                {(['calories', 'protein', 'carbs', 'fat'] as const).map(field => (
                  <div key={field}>
                    <p className="text-ink3 text-xs mb-1 text-center capitalize">
                      {field === 'calories' ? 'Cal' : field === 'protein' ? 'Pro' : field === 'carbs' ? 'Carb' : 'Fat'}
                    </p>
                    <input
                      type="number"
                      value={item[field]}
                      onChange={e => updateItem(idx, field, e.target.value)}
                      className="w-full bg-surface rounded-lg px-2 py-1.5 text-ink text-sm focus:outline-none text-center"
                      style={{ minHeight: '36px' }}
                    />
                  </div>
                ))}
              </div>
              {item.confidence === 'low' && (
                <p className="text-warn text-xs">Low confidence — verify this item</p>
              )}
            </div>
          ))}
        </div>

        {notes && <p className="px-4 mt-3 text-ink3 text-sm">{notes}</p>}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-page/95 backdrop-blur-md border-t border-line">
          <button
            onClick={handleSave}
            disabled={step === 'saving' || items.length === 0}
            className="w-full py-4 rounded-2xl bg-brand text-page font-bold text-base disabled:opacity-40 active:scale-95 transition-transform"
            style={{ minHeight: '56px' }}
          >
            {step === 'saving' ? 'Saving...' : `Save — ${Math.round(t.calories)} cal`}
          </button>
        </div>
      </div>
    )
  }

  return null
}
