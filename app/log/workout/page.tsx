'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import FramedCard from '@/components/FramedCard'

type SessionType = 'Strength' | 'Soccer' | 'Cardio' | 'Other'
type Volume = 'low' | 'medium' | 'high'

const MUSCLE_IDS = [
  'chest', 'front-delt', 'biceps', 'abs', 'quads', 'hip-flexors', 'calves',
  'traps', 'rear-delt', 'lats', 'triceps', 'lower-back', 'glutes', 'hamstrings',
]

const MUSCLE_LABELS: Record<string, string> = {
  'chest': 'Chest',
  'front-delt': 'Front Delt',
  'biceps': 'Biceps',
  'abs': 'Abs',
  'quads': 'Quads',
  'hip-flexors': 'Hip Flexors',
  'calves': 'Calves',
  'traps': 'Traps',
  'rear-delt': 'Rear Delt',
  'lats': 'Lats',
  'triceps': 'Triceps',
  'lower-back': 'Lower Back',
  'glutes': 'Glutes',
  'hamstrings': 'Hamstrings',
}

const SOCCER_AUTO_MUSCLES: { muscleId: string; volume: Volume }[] = [
  { muscleId: 'quads', volume: 'high' },
  { muscleId: 'hamstrings', volume: 'high' },
  { muscleId: 'calves', volume: 'high' },
  { muscleId: 'glutes', volume: 'high' },
  { muscleId: 'hip-flexors', volume: 'high' },
]

export default function LogWorkoutPage() {
  const [sessionType, setSessionType] = useState<SessionType>('Strength')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedMuscles, setSelectedMuscles] = useState<Record<string, Volume>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function toggleMuscle(id: string) {
    setSelectedMuscles(prev => {
      if (id in prev) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: 'medium' }
    })
  }

  function setVolume(id: string, volume: Volume) {
    setSelectedMuscles(prev => ({ ...prev, [id]: volume }))
  }

  const showMusclePicker = sessionType === 'Strength' || sessionType === 'Other'

  async function handleSave() {
    setSaving(true)
    setError('')

    const musclesWorked = sessionType === 'Soccer'
      ? SOCCER_AUTO_MUSCLES
      : Object.entries(selectedMuscles).map(([muscleId, volume]) => ({ muscleId, volume }))

    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType,
          musclesWorked,
          notes: notes.trim() || undefined,
          durationMinutes: duration ? parseInt(duration, 10) : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save. Try again.')
        setSaving(false)
        return
      }

      setSaved(true)
    } catch {
      setError('Connection error. Try again.')
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-page pb-24 flex flex-col items-center justify-center gap-6 px-4">
        <CheckCircle size={56} className="text-ok" />
        <p className="text-ink font-bold text-xl">Workout logged!</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setSaved(false)
              setSessionType('Strength')
              setDuration('')
              setNotes('')
              setSelectedMuscles({})
            }}
            className="bg-surface border border-line text-ink font-semibold rounded-2xl py-3 text-center"
          >
            Log another
          </button>
          <Link
            href="/"
            className="bg-brand text-page font-semibold rounded-2xl py-3 text-center"
          >
            Back to Today
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        <Link href="/log" className="text-ink3">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Log Workout</h1>
      </div>

      <FramedCard className="mx-4 bg-card rounded-2xl border border-line p-4">
      <div className="space-y-6">
        {/* Session type */}
        <div>
          <p className="eyebrow mb-3">Session Type</p>
          <div className="flex gap-2 flex-wrap">
            {(['Strength', 'Soccer', 'Cardio', 'Other'] as SessionType[]).map(type => (
              <button
                key={type}
                onClick={() => setSessionType(type)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  sessionType === type
                    ? 'bg-brand text-page border-brand'
                    : 'bg-surface text-ink3 border-line'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="eyebrow block mb-2">
            Duration (min)
          </label>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="e.g. 60"
            min={1}
            className="bg-surface border border-line rounded-xl px-4 py-3 text-ink w-full focus:outline-none focus:border-brand"
          />
        </div>

        {/* Soccer auto-log note */}
        {sessionType === 'Soccer' && (
          <div className="bg-ok/10 border border-ok/30 rounded-xl px-4 py-3">
            <p className="text-ok text-sm font-medium">Soccer session: leg + cardio muscles auto-logged</p>
            <p className="text-ink3 text-xs mt-1">Quads, hamstrings, calves, glutes, hip flexors — all at high volume</p>
          </div>
        )}

        {/* Muscle group selector */}
        {showMusclePicker && (
          <div>
            <p className="eyebrow mb-3">Muscles Worked</p>
            <div className="grid grid-cols-3 gap-2">
              {MUSCLE_IDS.map(id => {
                const selected = id in selectedMuscles
                return (
                  <div key={id}>
                    <button
                      onClick={() => toggleMuscle(id)}
                      className={`w-full rounded-xl border px-2 py-2.5 text-sm font-semibold text-center transition-colors ${
                        selected
                          ? 'bg-brand/20 border-brand text-ink'
                          : 'bg-surface border-line text-ink3'
                      }`}
                    >
                      {MUSCLE_LABELS[id]}
                    </button>
                    {selected && (
                      <div className="flex gap-1 mt-1">
                        {(['low', 'medium', 'high'] as Volume[]).map(v => (
                          <button
                            key={v}
                            onClick={() => setVolume(id, v)}
                            className={`flex-1 rounded-lg py-1 text-xs font-semibold transition-colors ${
                              selectedMuscles[id] === v
                                ? 'bg-brand text-page'
                                : 'bg-surface text-ink3 border border-line'
                            }`}
                          >
                            {v[0].toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="eyebrow block mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes..."
            className="bg-surface border border-line rounded-xl px-4 py-3 text-ink w-full focus:outline-none focus:border-brand resize-none"
            rows={3}
          />
        </div>

        {error && <p className="text-bad text-sm">{error}</p>}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-page font-bold rounded-full py-4 w-full disabled:opacity-40 active:scale-95 transition-transform"
        >
          {saving ? 'Saving...' : 'Save Workout ›'}
        </button>
      </div>
      </FramedCard>
    </div>
  )
}
