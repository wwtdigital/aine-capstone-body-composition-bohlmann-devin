'use client'

import { useState, FormEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader, CheckCircle, ChevronDown } from 'lucide-react'

const LBS_PER_KG = 2.20462

function kgToLbs(kg: number | null): string {
  if (kg == null) return ''
  return String(Math.round(kg * LBS_PER_KG * 10) / 10)
}

function lbsToKg(lbs: string): number | null {
  const n = parseFloat(lbs)
  if (isNaN(n)) return null
  return Math.round((n / LBS_PER_KG) * 100) / 100
}

type Stage = 'scan' | 'scanning' | 'review'

export default function InBodyNewPage() {
  const [stage, setStage] = useState<Stage>('scan')
  const [scanned, setScanned] = useState(false)
  const [fields, setFields] = useState({
    reading_date: new Date().toISOString().split('T')[0],
    weight_lbs: '',
    body_fat_pct: '',
    lean_mass_lbs: '',
    body_water_lbs: '',
    visceral_fat_level: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleScan(file: File) {
    setStage('scanning')
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/inbody/parse', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'Could not extract data from this file.')
        setStage('scan')
        return
      }
      const data = await res.json()
      setFields(prev => ({
        reading_date: data.reading_date ?? prev.reading_date,
        weight_lbs: data.weight_kg != null ? kgToLbs(data.weight_kg) : prev.weight_lbs,
        body_fat_pct: data.body_fat_pct != null ? String(data.body_fat_pct) : prev.body_fat_pct,
        lean_mass_lbs: data.lean_mass_kg != null ? kgToLbs(data.lean_mass_kg) : prev.lean_mass_lbs,
        body_water_lbs: data.body_water_kg != null ? kgToLbs(data.body_water_kg) : prev.body_water_lbs,
        visceral_fat_level: data.visceral_fat_level != null ? String(data.visceral_fat_level) : prev.visceral_fat_level,
      }))
      setScanned(true)
      setStage('review')
    } catch {
      setError('Connection error. Try again.')
      setStage('scan')
    }
  }

  function set(field: string, value: string) {
    setFields(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body = {
      reading_date: fields.reading_date,
      weight_kg: lbsToKg(fields.weight_lbs),
      body_fat_pct: fields.body_fat_pct ? Number(fields.body_fat_pct) : null,
      lean_mass_kg: lbsToKg(fields.lean_mass_lbs),
      body_water_kg: lbsToKg(fields.body_water_lbs),
      visceral_fat_level: fields.visceral_fat_level ? Number(fields.visceral_fat_level) : null,
      source: scanned ? 'scan' : 'manual',
    }
    try {
      const res = await fetch('/api/inbody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? data.error ?? 'Save failed.'); setSaving(false); return }
      router.push('/month')
    } catch {
      setError('Connection error. Try again.')
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-card border border-line text-ink text-base focus:outline-none focus:border-linehi transition-colors'

  // ── Scan stage ────────────────────────────────────────────────────────────
  if (stage === 'scan') {
    return (
      <div className="min-h-screen bg-page pb-24">
        <div className="px-4 pt-12 pb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">New Reading</h1>
          <p className="text-ink3 text-sm">Upload your InBody report to extract metrics automatically</p>
        </div>

        <div className="px-4">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleScan(f); e.target.value = '' }}
          />

          <label
            htmlFor="inbody-file"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-4 w-full rounded-2xl border-2 border-dashed border-brand/30 bg-brand/5 cursor-pointer active:scale-95 transition-transform py-16 px-6 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Upload size={28} className="text-brand" />
            </div>
            <div>
              <p className="text-ink font-semibold text-lg">Upload InBody report</p>
              <p className="text-ink3 text-sm mt-1">PDF or photo — metrics extracted automatically</p>
            </div>
            <span className="bg-brand text-page text-sm font-semibold px-6 py-2.5 rounded-full">
              Choose file
            </span>
          </label>

          {error && <p className="text-bad text-sm mt-3 text-center">{error}</p>}

          <button
            onClick={() => setStage('review')}
            className="w-full flex items-center justify-center gap-1.5 mt-6 text-ink3 text-sm"
          >
            <ChevronDown size={14} />
            Enter manually instead
          </button>
        </div>
      </div>
    )
  }

  // ── Scanning stage ────────────────────────────────────────────────────────
  if (stage === 'scanning') {
    return (
      <div className="min-h-screen bg-page flex flex-col pb-24">
        <div className="px-4 pt-12 pb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Reading report...</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-ink2 text-base font-medium">Extracting your metrics</p>
          <p className="text-ink3 text-sm text-center">Claude is reading your InBody report and pulling weight, body fat, lean mass, and more</p>
        </div>
      </div>
    )
  }

  // ── Review stage (after scan or manual entry) ─────────────────────────────
  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          {scanned ? 'Review extracted data' : 'Enter manually'}
        </h1>
        {scanned && (
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle size={14} className="text-ok" />
            <p className="text-ok text-sm font-medium">Metrics extracted — verify and save</p>
          </div>
        )}
      </div>

      {scanned && (
        <div className="px-4 mb-4">
          <button
            type="button"
            onClick={() => { setStage('scan'); setError('') }}
            className="flex items-center gap-2 text-brand text-sm font-semibold"
          >
            <Upload size={13} /> Re-scan a different file
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 space-y-3">
        <div>
          <label className="text-ink3 text-xs font-semibold uppercase tracking-wider block mb-2">Date</label>
          <input
            type="date"
            value={fields.reading_date}
            onChange={e => set('reading_date', e.target.value)}
            required
            className={inputClass}
            style={{ minHeight: '48px' }}
          />
        </div>

        {[
          { field: 'weight_lbs',         label: 'Weight (lbs)',        step: '0.5', min: '50',  max: '700' },
          { field: 'body_fat_pct',       label: 'Body Fat (%)',        step: '0.1', min: '1',   max: '70'  },
          { field: 'lean_mass_lbs',      label: 'Lean Mass (lbs)',     step: '0.5', min: '30',  max: '500' },
          { field: 'body_water_lbs',     label: 'Body Water (lbs)',    step: '0.5', min: '20',  max: '300' },
          { field: 'visceral_fat_level', label: 'Visceral Fat Level',  step: '1',   min: '1',   max: '30'  },
        ].map(({ field, label, step, min, max }) => (
          <div key={field}>
            <label className="text-ink3 text-xs font-semibold uppercase tracking-wider block mb-2">{label}</label>
            <input
              type="number"
              step={step}
              min={min}
              max={max}
              value={fields[field as keyof typeof fields]}
              onChange={e => set(field, e.target.value)}
              placeholder="—"
              className={inputClass}
              style={{ minHeight: '48px' }}
            />
          </div>
        ))}

        {error && <p className="text-bad text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving || !fields.reading_date}
          className="w-full py-4 rounded-2xl bg-brand text-page font-bold text-base disabled:opacity-40 active:scale-95 transition-transform mt-2"
          style={{ minHeight: '56px' }}
        >
          {saving ? 'Saving...' : 'Save Reading'}
        </button>
      </form>
    </div>
  )
}
