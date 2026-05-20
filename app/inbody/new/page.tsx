'use client'

import { useState, FormEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader } from 'lucide-react'

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

export default function InBodyNewPage() {
  const [fields, setFields] = useState({
    reading_date: new Date().toISOString().split('T')[0],
    weight_lbs: '',
    body_fat_pct: '',
    lean_mass_lbs: '',
    body_water_lbs: '',
    visceral_fat_level: '',
  })
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleScan(file: File) {
    setScanning(true)
    setScanMsg('Reading file...')
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/inbody/parse', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'Could not extract data from this file.')
        return
      }
      const data = await res.json()
      setScanMsg('Fields extracted — review below')
      setFields(prev => ({
        reading_date: data.reading_date ?? prev.reading_date,
        weight_lbs: data.weight_kg != null ? kgToLbs(data.weight_kg) : prev.weight_lbs,
        body_fat_pct: data.body_fat_pct != null ? String(data.body_fat_pct) : prev.body_fat_pct,
        lean_mass_lbs: data.lean_mass_kg != null ? kgToLbs(data.lean_mass_kg) : prev.lean_mass_lbs,
        body_water_lbs: data.body_water_kg != null ? kgToLbs(data.body_water_kg) : prev.body_water_lbs,
        visceral_fat_level: data.visceral_fat_level != null ? String(data.visceral_fat_level) : prev.visceral_fat_level,
      }))
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setScanning(false)
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
      source: 'manual',
    }

    try {
      const res = await fetch('/api/inbody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Save failed.')
        setSaving(false)
        return
      }
      router.push('/month')
    } catch {
      setError('Connection error. Try again.')
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-card border border-line text-ink text-base focus:outline-none focus:border-linehi transition-colors'

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-ink tracking-tight">New Reading</h1>
        <p className="text-ink3 text-sm">InBody measurement</p>
      </div>

      <div className="px-4 mb-4">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleScan(f); e.target.value = '' }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-line bg-surface text-ink3 text-sm font-medium active:scale-95 transition-transform disabled:opacity-50"
        >
          {scanning ? <Loader size={15} className="animate-spin" /> : <Upload size={15} />}
          {scanning ? scanMsg : 'Scan InBody PDF or photo'}
        </button>
        {scanMsg && !scanning && <p className="text-ok text-xs mt-2 text-center">{scanMsg}</p>}
      </div>

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
          { field: 'weight_lbs',        label: 'Weight (lbs)',        step: '0.5' },
          { field: 'body_fat_pct',      label: 'Body Fat (%)',        step: '0.1' },
          { field: 'lean_mass_lbs',     label: 'Lean Mass (lbs)',     step: '0.5' },
          { field: 'body_water_lbs',    label: 'Body Water (lbs)',    step: '0.5' },
          { field: 'visceral_fat_level', label: 'Visceral Fat Level', step: '1'   },
        ].map(({ field, label, step }) => (
          <div key={field}>
            <label className="text-ink3 text-xs font-semibold uppercase tracking-wider block mb-2">{label}</label>
            <input
              type="number"
              step={step}
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
