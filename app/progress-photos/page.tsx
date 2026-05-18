'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, Plus, X } from 'lucide-react'
import FramedCard from '@/components/FramedCard'

type Photo = {
  id: string
  pose: string
  photo_url: string
  weight_kg: number | null
  taken_at: number
}

type GroupedWeek = {
  label: string
  photos: Photo[]
}

function weekLabel(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function startOfWeek(ts: number): string {
  const d = new Date(ts)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day
  const monday = new Date(d)
  monday.setUTCDate(diff)
  return monday.toISOString().split('T')[0]
}

function groupByWeek(photos: Photo[]): GroupedWeek[] {
  const map = new Map<string, Photo[]>()
  for (const p of photos) {
    const key = startOfWeek(p.taken_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return Array.from(map.entries()).map(([key, photos]) => ({
    label: `Week of ${new Date(key + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    photos,
  }))
}

const POSES = ['front', 'side', 'back'] as const
type Pose = typeof POSES[number]

export default function ProgressPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [pose, setPose] = useState<Pose>('front')
  const [weightKg, setWeightKg] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/progress-photos')
      .then(r => r.json())
      .then(data => setPhotos(data.photos ?? []))
      .catch(() => {})
  }, [])

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        const base64 = dataUrl.split(',')[1]
        const mediaType = file.type || 'image/jpeg'

        const res = await fetch('/api/progress-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mediaType,
            pose,
            weightKg: weightKg ? parseFloat(weightKg) : undefined,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          setError(err.error ?? 'Upload failed')
          setUploading(false)
          return
        }

        const newPhoto = await res.json()
        setPhotos(prev => [
          {
            id: newPhoto.id,
            pose,
            photo_url: newPhoto.photo_url,
            weight_kg: weightKg ? parseFloat(weightKg) : null,
            taken_at: newPhoto.taken_at,
          },
          ...prev,
        ])
        setModalOpen(false)
        setFile(null)
        setWeightKg('')
        setPose('front')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Upload failed')
      setUploading(false)
    }
  }

  const grouped = groupByWeek(photos)

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/progress" className="text-ink3 active:opacity-60">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Progress Photos</h1>
        </div>
        <p className="text-ink3 text-sm pl-8">Weekly check-in</p>
      </div>

      <div className="px-4 space-y-6">
        {/* New Check-in button */}
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand text-page text-sm font-semibold active:scale-95 transition-transform"
        >
          <Plus size={16} />
          New Check-in
        </button>

        {/* Photo timeline */}
        {photos.length === 0 ? (
          <FramedCard className="bg-card rounded-2xl border border-line p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center">
              <Camera size={26} className="text-ink3" />
            </div>
            <p className="text-ink3 text-sm">Take your first progress photo to start tracking your physique over time.</p>
          </FramedCard>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => (
              <div key={group.label}>
                <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-3">{group.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {POSES.map(p => {
                    const photo = group.photos.find(ph => ph.pose === p)
                    return (
                      <div key={p} className="flex flex-col gap-1">
                        {photo ? (
                          <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-surface">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.photo_url}
                              alt={`${p} pose`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/60">
                              <span className="text-white text-xs font-medium capitalize">{p}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl aspect-[3/4] bg-surface border border-line border-dashed flex items-center justify-center">
                            <span className="text-ink4 text-xs capitalize">{p}</span>
                          </div>
                        )}
                        {photo && (
                          <p className="text-ink4 text-xs text-center">{weekLabel(photo.taken_at)}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-line p-6 pb-10 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-ink font-semibold text-lg">New Check-in</h2>
              <button onClick={() => setModalOpen(false)} className="text-ink3 active:opacity-60">
                <X size={20} />
              </button>
            </div>

            {/* Pose selector */}
            <div className="space-y-2">
              <p className="text-ink3 text-xs font-semibold uppercase tracking-wider">Pose</p>
              <div className="flex gap-2">
                {POSES.map(p => (
                  <button
                    key={p}
                    onClick={() => setPose(p)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
                      pose === p
                        ? 'bg-brand text-page'
                        : 'bg-surface border border-line text-ink3'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight input */}
            <div className="space-y-2">
              <p className="text-ink3 text-xs font-semibold uppercase tracking-wider">Weight (kg) — optional</p>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 83.4"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-ink text-sm outline-none focus:border-brand"
              />
            </div>

            {/* File input */}
            <div className="space-y-2">
              <p className="text-ink3 text-xs font-semibold uppercase tracking-wider">Photo</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-surface border border-line border-dashed rounded-xl py-6 text-ink3 text-sm active:opacity-60"
              >
                <Camera size={18} />
                {file ? file.name : 'Take or choose a photo'}
              </button>
            </div>

            {error && <p className="text-bad text-sm">{error}</p>}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full py-3 rounded-full bg-brand text-page font-semibold text-sm disabled:opacity-40 active:scale-95 transition-transform"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
