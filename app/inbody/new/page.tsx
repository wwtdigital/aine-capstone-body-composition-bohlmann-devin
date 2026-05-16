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

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-base focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">New Reading</h1>
        <p className="text-zinc-500 dark:text-zinc-500 text-sm">InBody measurement</p>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-3">
        <div>
          <label className="text-zinc-500 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider block mb-2">Date</label>
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
            <label className="text-zinc-500 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider block mb-2">{label}</label>
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

        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving || !fields.reading_date}
          className="w-full py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform mt-2"
          style={{ minHeight: '56px' }}
        >
          {saving ? 'Saving...' : 'Save Reading'}
        </button>
      </form>
    </div>
  )
}
