'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function InBodyNewPage() {
  const [fields, setFields] = useState({
    reading_date: new Date().toISOString().split('T')[0],
    weight_kg: '',
    body_fat_pct: '',
    lean_mass_kg: '',
    body_water_kg: '',
    visceral_fat_level: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function set(field: string, value: string) {
    setFields(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const body = {
      reading_date: fields.reading_date,
      weight_kg: fields.weight_kg ? Number(fields.weight_kg) : null,
      body_fat_pct: fields.body_fat_pct ? Number(fields.body_fat_pct) : null,
      lean_mass_kg: fields.lean_mass_kg ? Number(fields.lean_mass_kg) : null,
      body_water_kg: fields.body_water_kg ? Number(fields.body_water_kg) : null,
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
          { field: 'weight_kg', label: 'Weight (kg)' },
          { field: 'body_fat_pct', label: 'Body Fat (%)' },
          { field: 'lean_mass_kg', label: 'Lean Mass (kg)' },
          { field: 'body_water_kg', label: 'Body Water (kg)' },
          { field: 'visceral_fat_level', label: 'Visceral Fat Level' },
        ].map(({ field, label }) => (
          <div key={field}>
            <label className="text-ink3 text-xs font-semibold uppercase tracking-wider block mb-2">{label}</label>
            <input
              type="number"
              step="0.1"
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
