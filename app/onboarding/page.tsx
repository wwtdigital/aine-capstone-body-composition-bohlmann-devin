'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ISymbol from '@/components/ISymbol'
import FramedCard from '@/components/FramedCard'

type TrainingProfile = 'hybrid' | 'strength' | 'endurance'

const TRAINING_OPTIONS: { value: TrainingProfile; label: string; sub: string }[] = [
  { value: 'hybrid',    label: 'Hybrid Athlete',   sub: 'Lift + team sport' },
  { value: 'strength',  label: 'Strength Focus',   sub: 'Barbell-first training' },
  { value: 'endurance', label: 'Endurance Focus',  sub: 'Run, bike, or swim' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Profile fields
  const [name, setName] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [trainingProfile, setTrainingProfile] = useState<TrainingProfile>('hybrid')

  // Goals fields
  const [calories, setCalories] = useState('2500')
  const [protein, setProtein] = useState('200')
  const [targetBf, setTargetBf] = useState('12')

  async function finish() {
    await Promise.all([
      fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          weightKg: parseFloat(weightKg) || 0,
          heightCm: parseFloat(heightCm) || 0,
          trainingProfile,
        }),
      }),
      fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_calories: parseInt(calories) || 2500,
          daily_protein_g: parseInt(protein) || 200,
          daily_carbs_g: 200,
          daily_fat_g: 80,
          target_body_fat_pct: parseFloat(targetBf) || 12,
          target_lean_mass_kg: 80,
          daily_sleep_hours: 8,
        }),
      }),
    ])
  }

  return (
    <div className="min-h-screen bg-page flex flex-col pb-24">
      <div className="max-w-sm mx-auto px-5 w-full pt-16 flex flex-col flex-1">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-10">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${n === step ? 'bg-brand' : 'bg-line'}`}
            />
          ))}
        </div>

        {/* Step 1 — Profile */}
        {step === 1 && (
          <FramedCard className="bg-card rounded-2xl border border-line p-8">
            <div className="flex flex-col items-center mb-6">
              <ISymbol size={24} className="text-brand mb-4" />
              <h1 className="text-xl font-semibold text-ink text-center">Welcome to Body Comp Copilot</h1>
              <p className="text-sm text-ink3 text-center mt-1">Let&apos;s set up your profile.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1">First name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Will"
                  className="w-full bg-surface border border-line rounded-2xl px-4 py-2.5 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-ink3 mb-1">Body weight (kg)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    placeholder="85"
                    className="w-full bg-surface border border-line rounded-2xl px-4 py-2.5 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:border-brand"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-ink3 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={e => setHeightCm(e.target.value)}
                    placeholder="180"
                    className="w-full bg-surface border border-line rounded-2xl px-4 py-2.5 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink3 mb-2">Training profile</label>
                <div className="flex flex-col gap-2">
                  {TRAINING_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTrainingProfile(opt.value)}
                      className={`text-left px-4 py-3 rounded-2xl border transition-colors duration-150 ${trainingProfile === opt.value ? 'border-brand bg-brand/10 text-ink' : 'border-line bg-surface text-ink3'}`}
                    >
                      <span className="block text-sm font-medium">{opt.label}</span>
                      <span className="block text-xs text-ink4">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full mt-2 bg-brand text-white font-medium py-3 rounded-full text-sm"
              >
                Next ›
              </button>
            </div>
          </FramedCard>
        )}

        {/* Step 2 — Goals */}
        {step === 2 && (
          <FramedCard className="bg-card rounded-2xl border border-line p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-ink">Set your targets.</h1>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1">Daily calories</label>
                <input
                  type="number"
                  value={calories}
                  onChange={e => setCalories(e.target.value)}
                  className="w-full bg-surface border border-line rounded-2xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink3 mb-1">Daily protein (g)</label>
                <input
                  type="number"
                  value={protein}
                  onChange={e => setProtein(e.target.value)}
                  className="w-full bg-surface border border-line rounded-2xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink3 mb-1">Target body fat %</label>
                <input
                  type="number"
                  value={targetBf}
                  onChange={e => setTargetBf(e.target.value)}
                  className="w-full bg-surface border border-line rounded-2xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full mt-2 bg-brand text-white font-medium py-3 rounded-full text-sm"
              >
                Next ›
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-sm text-ink3 py-1"
              >
                ← Back
              </button>
            </div>
          </FramedCard>
        )}

        {/* Step 3 — Ready */}
        {step === 3 && (
          <Step3
            onMount={finish}
            onNavigate={(path) => router.push(path)}
          />
        )}
      </div>
    </div>
  )
}

function Step3({
  onMount,
  onNavigate,
}: {
  onMount: () => Promise<void>
  onNavigate: (path: string) => void
}) {
  useEffect(() => {
    onMount()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <FramedCard className="bg-card rounded-2xl border border-line p-8">
      <div className="flex flex-col items-center mb-6">
        <ISymbol size={24} className="text-brand mb-4" />
        <h1 className="text-xl font-semibold text-ink text-center">You&apos;re all set.</h1>
        <p className="text-sm text-ink3 text-center mt-2">
          Start by logging your first meal or connecting Whoop for recovery data.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onNavigate('/log')}
          className="flex-1 bg-brand text-white font-medium py-3 rounded-full text-sm text-center"
        >
          Log a meal ›
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/settings')}
          className="flex-1 bg-surface border border-line text-ink font-medium py-3 rounded-full text-sm text-center"
        >
          Connect Whoop ›
        </button>
      </div>
    </FramedCard>
  )
}
