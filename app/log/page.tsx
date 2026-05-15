'use client'

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

const LOADING_MESSAGES = [
  'Reading the plate...',
  'Identifying portions...',
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
        if (width > height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => {
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' })
          }
          reader.readAsDataURL(blob!)
        },
        'image/jpeg',
        0.85,
      )
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
  const [preview, setPreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState('image/jpeg')
  const [items, setItems] = useState<MealItem[]>([])
  const [notes, setNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingText, setLoadingText] = useState(LOADING_MESSAGES[0])
  const [loggedAt] = useState(() => Date.now())
  const fileRef = useRef<HTMLInputElement>(null)
  const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (step === 'analyzing') {
      let idx = 0
      loadingInterval.current = setInterval(() => {
        idx = (idx + 1) % LOADING_MESSAGES.length
        setLoadingText(LOADING_MESSAGES[idx])
      }, 2500)
    } else {
      if (loadingInterval.current) clearInterval(loadingInterval.current)
    }
    return () => {
      if (loadingInterval.current) clearInterval(loadingInterval.current)
    }
  }, [step])

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setStep('analyzing')
    setLoadingText(LOADING_MESSAGES[0])

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

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Analysis failed. Try again.')
        setStep('error')
        return
      }

      setItems(data.items ?? [])
      setNotes(data.notes ?? '')
      setStep('confirm')
    } catch {
      setErrorMsg('Connection error. Try again.')
      setStep('error')
    }
  }

  function updateItem(idx: number, field: keyof MealItem, value: string | number) {
    setItems(prev =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: field === 'name' || field === 'portion' || field === 'confidence' ? value : Number(value) } : item)),
    )
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
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-10 pb-6">
          <Link href="/" className="text-zinc-400 text-sm">← Back</Link>
          <h1 className="text-xl font-bold text-white">Log Meal</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          <div className="w-full max-w-sm">
            <label
              htmlFor="meal-photo"
              className="flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 cursor-pointer active:scale-95 transition-transform"
              style={{ minHeight: '240px' }}
            >
              <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                <div className="text-5xl">📷</div>
                <p className="text-white font-semibold text-lg">Take a photo</p>
                <p className="text-zinc-400 text-sm">or choose from library</p>
              </div>
            </label>
            <input
              ref={fileRef}
              id="meal-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    )
  }

  if (step === 'analyzing') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-10 pb-6">
          <h1 className="text-xl font-bold text-white">Log Meal</h1>
        </div>

        {preview && (
          <div className="px-4">
            <img src={preview} alt="Meal" className="w-full max-h-64 object-cover rounded-2xl" />
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg font-medium">{loadingText}</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-10 pb-6">
          <Link href="/" className="text-zinc-400 text-sm">← Back</Link>
          <h1 className="text-xl font-bold text-white">Log Meal</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          <p className="text-red-400 text-center">{errorMsg}</p>
          <button
            onClick={() => { setStep('capture'); setPreview(null) }}
            className="px-6 py-3 rounded-xl bg-zinc-800 text-white font-semibold"
            style={{ minHeight: '48px' }}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (step === 'confirm' || step === 'saving') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col pb-32">
        <div className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={() => setStep('capture')} className="text-zinc-400 text-sm">← Retake</button>
          <h1 className="text-xl font-bold text-white">Confirm</h1>
        </div>

        {preview && (
          <div className="px-4 mb-4">
            <img src={preview} alt="Meal" className="w-full max-h-48 object-cover rounded-xl" />
          </div>
        )}

        <div className="px-4 mb-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Cal', value: Math.round(t.calories) },
            { label: 'Pro', value: `${Math.round(t.protein)}g` },
            { label: 'Carb', value: `${Math.round(t.carbs)}g` },
            { label: 'Fat', value: `${Math.round(t.fat)}g` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-zinc-400 text-xs">{label}</p>
            </div>
          ))}
        </div>

        <div className="px-4 space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="bg-zinc-900 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={e => updateItem(idx, 'name', e.target.value)}
                  className="flex-1 bg-transparent text-white font-semibold text-base focus:outline-none border-b border-zinc-700 pb-1"
                />
                <button
                  onClick={() => removeItem(idx)}
                  className="text-zinc-500 text-sm shrink-0 pt-1"
                  style={{ minHeight: '32px', minWidth: '32px' }}
                >
                  ✕
                </button>
              </div>

              <input
                type="text"
                value={item.portion}
                onChange={e => updateItem(idx, 'portion', e.target.value)}
                placeholder="Portion"
                className="w-full bg-transparent text-zinc-400 text-sm focus:outline-none"
              />

              <div className="grid grid-cols-4 gap-2">
                {(['calories', 'protein', 'carbs', 'fat'] as const).map(field => (
                  <div key={field}>
                    <p className="text-zinc-500 text-xs mb-1 capitalize">{field === 'calories' ? 'Cal' : field === 'protein' ? 'Pro' : field === 'carbs' ? 'Carb' : 'Fat'}</p>
                    <input
                      type="number"
                      value={item[field]}
                      onChange={e => updateItem(idx, field, e.target.value)}
                      className="w-full bg-zinc-800 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 text-center"
                      style={{ minHeight: '36px' }}
                    />
                  </div>
                ))}
              </div>

              {item.confidence === 'low' && (
                <p className="text-amber-500 text-xs">Low confidence — verify this item</p>
              )}
            </div>
          ))}
        </div>

        {notes && (
          <p className="px-4 mt-3 text-zinc-500 text-sm">{notes}</p>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-900">
          <button
            onClick={handleSave}
            disabled={step === 'saving' || items.length === 0}
            className="w-full py-4 rounded-xl bg-white text-zinc-900 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform"
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
