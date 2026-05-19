'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Camera, X } from 'lucide-react'
import FramedCard from '@/components/FramedCard'
import ISymbol from '@/components/ISymbol'

type Volume = 'low' | 'medium' | 'high'
type Region = 'front' | 'back'
type Tab = 'recovery' | 'development'

interface Muscle {
  id: string
  name: string
  region: Region
  devScore: number
  lastTrainedHoursAgo: number
  volume: Volume
  synthetic: boolean // true = no real data for this muscle yet
}

// Base data — synthetic fallback values preserved exactly as before
const BASE_MUSCLES: Omit<Muscle, 'synthetic'>[] = [
  // Front body
  { id: 'chest',       name: 'Chest',       region: 'front', devScore: 6.5, lastTrainedHoursAgo: 20, volume: 'high' },
  { id: 'front-delt',  name: 'Front Delt',  region: 'front', devScore: 7.0, lastTrainedHoursAgo: 20, volume: 'medium' },
  { id: 'biceps',      name: 'Biceps',      region: 'front', devScore: 5.5, lastTrainedHoursAgo: 44, volume: 'medium' },
  { id: 'abs',         name: 'Abs',         region: 'front', devScore: 4.0, lastTrainedHoursAgo: 96, volume: 'low' },
  { id: 'quads',       name: 'Quads',       region: 'front', devScore: 7.5, lastTrainedHoursAgo: 8,  volume: 'high' },
  { id: 'hip-flexors', name: 'Hip Flexors', region: 'front', devScore: 8.0, lastTrainedHoursAgo: 8,  volume: 'high' },
  { id: 'calves',      name: 'Calves',      region: 'front', devScore: 5.0, lastTrainedHoursAgo: 8,  volume: 'high' },
  // Back body
  { id: 'traps',       name: 'Traps',       region: 'back',  devScore: 6.0, lastTrainedHoursAgo: 44, volume: 'medium' },
  { id: 'rear-delt',   name: 'Rear Delt',   region: 'back',  devScore: 3.5, lastTrainedHoursAgo: 44, volume: 'low' },
  { id: 'lats',        name: 'Lats',        region: 'back',  devScore: 6.5, lastTrainedHoursAgo: 44, volume: 'high' },
  { id: 'triceps',     name: 'Triceps',     region: 'back',  devScore: 5.5, lastTrainedHoursAgo: 20, volume: 'medium' },
  { id: 'lower-back',  name: 'Lower Back',  region: 'back',  devScore: 4.5, lastTrainedHoursAgo: 96, volume: 'low' },
  { id: 'glutes',      name: 'Glutes',      region: 'back',  devScore: 6.0, lastTrainedHoursAgo: 8,  volume: 'high' },
  { id: 'hamstrings',  name: 'Hamstrings',  region: 'back',  devScore: 4.5, lastTrainedHoursAgo: 8,  volume: 'high' },
]

function recoveryPct(m: Muscle): number {
  const window = m.volume === 'high' ? 72 : m.volume === 'medium' ? 48 : 36
  return Math.min(100, (m.lastTrainedHoursAgo / window) * 100)
}

// Hex values pulled directly from design tokens
const HEX_OK      = '#10b981'
const HEX_WARN    = '#f59e0b'
const HEX_BAD     = '#ef4444'
const HEX_BRAND   = '#4a9eff'
const HEX_INK3    = '#64748b'

function recoveryColor(m: Muscle): string {
  const pct = recoveryPct(m)
  if (pct < 33) return HEX_BAD
  if (pct < 66) return HEX_WARN
  return HEX_OK
}

function devColor(m: Muscle): string {
  if (m.devScore < 4) return HEX_BAD
  if (m.devScore > 6) return HEX_BRAND
  return HEX_INK3
}

function muscleColor(m: Muscle, tab: Tab): string {
  return tab === 'recovery' ? recoveryColor(m) : devColor(m)
}

// ── SVG Body Diagram ──────────────────────────────────────────────────────────

interface EllipseProps {
  cx: number
  cy: number
  rx: number
  ry: number
  color: string
  selected: boolean
  onClick: () => void
}

function MuscleEllipse({ cx, cy, rx, ry, color, selected, onClick }: EllipseProps) {
  return (
    <ellipse
      cx={cx} cy={cy} rx={rx} ry={ry}
      fill={color}
      fillOpacity={selected ? 0.9 : 0.72}
      stroke={selected ? '#ffffff' : color}
      strokeWidth={selected ? 2 : 0.8}
      strokeOpacity={selected ? 1 : 0.5}
      style={{ cursor: 'pointer', filter: selected ? `drop-shadow(0 0 5px ${color})` : undefined }}
      onClick={onClick}
    />
  )
}

interface BodyDiagramProps {
  region: Region
  muscles: Muscle[]
  tab: Tab
  selectedId: string | null
  onSelect: (id: string) => void
}

function BodyDiagram({ region, muscles, tab, selectedId, onSelect }: BodyDiagramProps) {
  const byId = Object.fromEntries(muscles.map(m => [m.id, m]))
  const color = (id: string) => {
    const m = byId[id]
    return m ? muscleColor(m, tab) : HEX_INK3
  }
  const sel = (id: string) => selectedId === id
  const click = (id: string) => () => onSelect(id)

  return (
    <svg viewBox="0 0 200 388" width="200" height="388" className="w-full block" style={{ height: 'auto' }} aria-label={`${region} body diagram`}>
      {/* ── Body silhouette ── */}
      {/* Head */}
      <circle cx={100} cy={40} r={28} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      {/* Neck */}
      <rect x={88} y={65} width={24} height={20} rx={4} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      {/* Torso */}
      <rect x={58} y={83} width={84} height={155} rx={12} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      {/* Upper arms */}
      <rect x={30} y={88} width={22} height={80} rx={10} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      <rect x={148} y={88} width={22} height={80} rx={10} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      {/* Forearms */}
      <rect x={34} y={168} width={18} height={70} rx={8} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      <rect x={148} y={168} width={18} height={70} rx={8} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      {/* Thighs */}
      <rect x={62} y={238} width={34} height={90} rx={12} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      <rect x={104} y={238} width={34} height={90} rx={12} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      {/* Shins */}
      <rect x={65} y={328} width={28} height={60} rx={10} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />
      <rect x={107} y={328} width={28} height={60} rx={10} style={{ fill: 'var(--color-surface)', opacity: 0.9 }} />

      {/* ── Muscle regions ── */}
      {region === 'front' && (
        <>
          {/* Chest */}
          <MuscleEllipse cx={100} cy={135} rx={40} ry={22} color={color('chest')} selected={sel('chest')} onClick={click('chest')} />
          {/* Front Delts */}
          <MuscleEllipse cx={52}  cy={120} rx={16} ry={18} color={color('front-delt')} selected={sel('front-delt')} onClick={click('front-delt')} />
          <MuscleEllipse cx={148} cy={120} rx={16} ry={18} color={color('front-delt')} selected={sel('front-delt')} onClick={click('front-delt')} />
          {/* Biceps */}
          <MuscleEllipse cx={48}  cy={160} rx={12} ry={22} color={color('biceps')} selected={sel('biceps')} onClick={click('biceps')} />
          <MuscleEllipse cx={152} cy={160} rx={12} ry={22} color={color('biceps')} selected={sel('biceps')} onClick={click('biceps')} />
          {/* Abs */}
          <MuscleEllipse cx={100} cy={185} rx={28} ry={30} color={color('abs')} selected={sel('abs')} onClick={click('abs')} />
          {/* Hip Flexors */}
          <MuscleEllipse cx={78}  cy={245} rx={18} ry={15} color={color('hip-flexors')} selected={sel('hip-flexors')} onClick={click('hip-flexors')} />
          <MuscleEllipse cx={122} cy={245} rx={18} ry={15} color={color('hip-flexors')} selected={sel('hip-flexors')} onClick={click('hip-flexors')} />
          {/* Quads */}
          <MuscleEllipse cx={78}  cy={275} rx={22} ry={40} color={color('quads')} selected={sel('quads')} onClick={click('quads')} />
          <MuscleEllipse cx={122} cy={275} rx={22} ry={40} color={color('quads')} selected={sel('quads')} onClick={click('quads')} />
          {/* Calves */}
          <MuscleEllipse cx={78}  cy={340} rx={14} ry={28} color={color('calves')} selected={sel('calves')} onClick={click('calves')} />
          <MuscleEllipse cx={122} cy={340} rx={14} ry={28} color={color('calves')} selected={sel('calves')} onClick={click('calves')} />
        </>
      )}

      {region === 'back' && (
        <>
          {/* Traps */}
          <MuscleEllipse cx={100} cy={115} rx={38} ry={16} color={color('traps')} selected={sel('traps')} onClick={click('traps')} />
          {/* Rear Delts */}
          <MuscleEllipse cx={52}  cy={120} rx={16} ry={16} color={color('rear-delt')} selected={sel('rear-delt')} onClick={click('rear-delt')} />
          <MuscleEllipse cx={148} cy={120} rx={16} ry={16} color={color('rear-delt')} selected={sel('rear-delt')} onClick={click('rear-delt')} />
          {/* Lats */}
          <MuscleEllipse cx={60}  cy={155} rx={22} ry={35} color={color('lats')} selected={sel('lats')} onClick={click('lats')} />
          <MuscleEllipse cx={140} cy={155} rx={22} ry={35} color={color('lats')} selected={sel('lats')} onClick={click('lats')} />
          {/* Triceps */}
          <MuscleEllipse cx={48}  cy={165} rx={11} ry={20} color={color('triceps')} selected={sel('triceps')} onClick={click('triceps')} />
          <MuscleEllipse cx={152} cy={165} rx={11} ry={20} color={color('triceps')} selected={sel('triceps')} onClick={click('triceps')} />
          {/* Lower Back */}
          <MuscleEllipse cx={100} cy={210} rx={24} ry={18} color={color('lower-back')} selected={sel('lower-back')} onClick={click('lower-back')} />
          {/* Glutes */}
          <MuscleEllipse cx={80}  cy={245} rx={26} ry={22} color={color('glutes')} selected={sel('glutes')} onClick={click('glutes')} />
          <MuscleEllipse cx={120} cy={245} rx={26} ry={22} color={color('glutes')} selected={sel('glutes')} onClick={click('glutes')} />
          {/* Hamstrings */}
          <MuscleEllipse cx={78}  cy={290} rx={20} ry={38} color={color('hamstrings')} selected={sel('hamstrings')} onClick={click('hamstrings')} />
          <MuscleEllipse cx={122} cy={290} rx={20} ry={38} color={color('hamstrings')} selected={sel('hamstrings')} onClick={click('hamstrings')} />
        </>
      )}
    </svg>
  )
}

// ── Muscle List Item ──────────────────────────────────────────────────────────

function RecoveryBar({ pct }: { pct: number }) {
  const barColor = pct < 33 ? 'bg-bad' : pct < 66 ? 'bg-warn' : 'bg-ok'
  return (
    <div className="mt-1.5 h-1.5 bg-surface rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function DevBar({ score }: { score: number }) {
  const barColor = score < 4 ? 'bg-bad' : score > 6 ? 'bg-brand' : 'bg-ink3'
  return (
    <div className="mt-1.5 h-1.5 bg-surface rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${(score / 10) * 100}%` }} />
    </div>
  )
}

interface MuscleListItemProps {
  muscle: Muscle
  tab: Tab
  selected: boolean
  onSelect: () => void
}

function MuscleListItem({ muscle, tab, selected, onSelect }: MuscleListItemProps) {
  const color = muscleColor(muscle, tab)
  const pct = Math.round(recoveryPct(muscle))

  const dotClass =
    tab === 'recovery'
      ? pct < 33 ? 'bg-bad' : pct < 66 ? 'bg-warn' : 'bg-ok'
      : muscle.devScore < 4 ? 'bg-bad' : muscle.devScore > 6 ? 'bg-brand' : 'bg-ink3'

  return (
    <button
      id={`muscle-${muscle.id}`}
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b border-line last:border-b-0 transition-colors ${
        selected ? 'bg-surface' : 'hover:bg-surface/50'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`}
          style={{ boxShadow: selected ? `0 0 6px ${color}` : undefined }}
        />
        <span className={`text-sm font-semibold ${selected ? 'text-ink' : 'text-ink2'}`}>
          {muscle.name}
        </span>
      </div>

      {tab === 'recovery' ? (
        <div className="mt-1 pl-5">
          <p className="text-ink3 text-xs">
            {Math.round(muscle.lastTrainedHoursAgo)}h ago · {pct}% recovered
          </p>
          <RecoveryBar pct={pct} />
        </div>
      ) : (
        <div className="mt-1 pl-5">
          <p className="text-ink3 text-xs">
            Score {muscle.devScore}/10 ·{' '}
            {muscle.devScore < 4
              ? 'Underdeveloped'
              : muscle.devScore > 6
              ? 'Overdeveloped'
              : 'Balanced'}
          </p>
          <DevBar score={muscle.devScore} />
        </div>
      )}
    </button>
  )
}

// ── Scan Modal ────────────────────────────────────────────────────────────────

interface ScanModalProps {
  onClose: () => void
  onSuccess: (scores: Record<string, number>, notes: string) => void
}

function ScanModal({ onClose, onSuccess }: ScanModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function handleFile(f: File) {
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Strip data URI prefix — send raw base64 only
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/muscles/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analysis failed')
      }

      const data = await res.json()
      setSuccessMsg(data.notes || 'Assessment complete.')
      onSuccess(data.scores, data.notes)

      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-card border border-line rounded-2xl w-full max-w-sm p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink3 hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="text-ink font-bold text-base mb-0.5">Physique Assessment</h2>
        <p className="text-ink3 text-xs mb-4">
          Take or upload a front or back pose photo. Claude will assess muscle development.
        </p>

        {/* Upload area */}
        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center py-6 transition-colors ${preview ? 'border-brand/50' : 'hover:border-brand/40'}`}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected physique" className="max-h-48 rounded-lg object-contain" />
            ) : (
              <>
                <Camera size={28} className="text-ink3 mb-2" />
                <span className="text-ink3 text-xs">Tap to select or capture photo</span>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </label>

        {successMsg ? (
          <div className="mt-4 rounded-xl bg-surface border border-line px-3 py-2.5">
            <p className="text-ok text-xs font-semibold mb-0.5">Assessment saved</p>
            <p className="text-ink3 text-xs">{successMsg}</p>
          </div>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              file && !loading
                ? 'bg-brand text-page hover:bg-brand/90'
                : 'bg-surface text-ink4 cursor-not-allowed'
            }`}
          >
            {loading ? 'Analyzing physique...' : 'Analyze'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MusclesPage() {
  const [tab, setTab] = useState<Tab>('recovery')
  const [region, setRegion] = useState<Region>('front')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showScan, setShowScan] = useState(false)

  // Recovery overrides from real workout data: muscleId → { lastTrainedAt, volume }
  const [recoveryData, setRecoveryData] = useState<
    Record<string, { lastTrainedAt: number; volume: Volume }>
  >({})

  // Dev score overrides from physique assessment: muscleId → score
  const [devScores, setDevScores] = useState<Record<string, number>>({})

  // Last assessment timestamp (ms)
  const [lastAssessedAt, setLastAssessedAt] = useState<number | null>(null)

  // Whether ALL muscles are still on synthetic recovery data
  const allSynthetic = useMemo(
    () => BASE_MUSCLES.every(m => !recoveryData[m.id]),
    [recoveryData]
  )

  // Merged muscle list — derived from base + real data overrides
  const muscles: Muscle[] = useMemo(() => {
    const now = Date.now()
    return BASE_MUSCLES.map(base => {
      const real = recoveryData[base.id]
      const hoursAgo = real
        ? (now - real.lastTrainedAt) / 3_600_000
        : base.lastTrainedHoursAgo
      const volume = real ? real.volume : base.volume
      const devScore = devScores[base.id] ?? base.devScore
      return {
        ...base,
        lastTrainedHoursAgo: hoursAgo,
        volume,
        devScore,
        synthetic: !real,
      }
    })
  }, [recoveryData, devScores])

  // Fetch real recovery data on mount
  useEffect(() => {
    fetch('/api/workouts/recent-by-muscle')
      .then(r => r.json())
      .then((data: Record<string, { lastTrainedAt: number; volume: Volume }>) => {
        if (data && typeof data === 'object') setRecoveryData(data)
      })
      .catch(() => { /* silent — synthetic data stays */ })
  }, [])

  // Fetch latest physique assessment on mount
  useEffect(() => {
    fetch('/api/muscles/latest-assessment')
      .then(r => r.json())
      .then((data: { scores: Record<string, number>; notes: string; assessedAt: number } | null) => {
        if (data?.scores) {
          setDevScores(data.scores)
          setLastAssessedAt(data.assessedAt)
        }
      })
      .catch(() => { /* silent */ })
  }, [])

  const visibleMuscles = useMemo(
    () => muscles.filter(m => m.region === region),
    [muscles, region]
  )

  function handleSelectMuscle(id: string) {
    setSelectedId(prev => (prev === id ? null : id))
    setTimeout(() => {
      const el = document.getElementById(`muscle-${id}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  function handleDiagramSelect(id: string) {
    const muscle = muscles.find(m => m.id === id)
    if (muscle && muscle.region !== region) setRegion(muscle.region)
    handleSelectMuscle(id)
  }

  const handleScanSuccess = useCallback(
    (scores: Record<string, number>, _notes: string) => {
      setDevScores(prev => ({ ...prev, ...scores }))
      setLastAssessedAt(Date.now())
    },
    []
  )

  const lastAssessedLabel = lastAssessedAt
    ? new Date(lastAssessedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <ISymbol size={14} className="text-ink3 opacity-60" />
            <h1 className="text-2xl font-bold text-ink tracking-tight">Muscles</h1>
          </div>
          <p className="text-ink3 text-sm mt-0.5">Hybrid Athlete Tracker</p>
        </div>
        <button
          onClick={() => setShowScan(true)}
          className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-line text-ink3 hover:text-ink text-xs font-semibold transition-colors"
          aria-label="Scan physique"
        >
          <Camera size={14} />
          Scan Physique ›
        </button>
      </div>

      {/* Synthetic data banner — only shown when ALL muscles lack real data */}
      {allSynthetic && (
        <div className="mx-4 mb-4 rounded-xl bg-surface border border-line px-4 py-3">
          <p className="text-warn text-xs font-medium">
            Using synthetic data — log workouts to see real recovery
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className="px-4 pb-3 flex gap-2 items-center">
        <button
          onClick={() => setTab('recovery')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            tab === 'recovery'
              ? 'bg-brand text-page border-brand'
              : 'bg-surface text-ink2 border-line'
          }`}
        >
          Recovery
        </button>
        <button
          onClick={() => setTab('development')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            tab === 'development'
              ? 'bg-brand text-page border-brand'
              : 'bg-surface text-ink2 border-line'
          }`}
        >
          Development
        </button>
        {tab === 'development' && lastAssessedLabel && (
          <span className="text-ink4 text-xs ml-1">Last assessed: {lastAssessedLabel}</span>
        )}
      </div>

      {/* Region toggle */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => { setRegion('front'); setSelectedId(null) }}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
            region === 'front'
              ? 'bg-pressed text-ink border-linehi'
              : 'bg-surface text-ink3 border-line'
          }`}
        >
          Front
        </button>
        <button
          onClick={() => { setRegion('back'); setSelectedId(null) }}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
            region === 'back'
              ? 'bg-pressed text-ink border-linehi'
              : 'bg-surface text-ink3 border-line'
          }`}
        >
          Back
        </button>
      </div>

      {/* Two-column layout */}
      <div className="px-4 flex gap-4 items-start">
        {/* Left: SVG diagram */}
        <div className="w-[44%] shrink-0">
          <FramedCard className="bg-card rounded-2xl border border-line p-2 overflow-hidden">
            <BodyDiagram
              region={region}
              muscles={visibleMuscles}
              tab={tab}
              selectedId={selectedId}
              onSelect={handleDiagramSelect}
            />
          </FramedCard>

          {/* Legend */}
          <div className="mt-3 space-y-1.5">
            {tab === 'recovery' ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-ok shrink-0" />
                  <span className="text-ink3 text-xs">&gt;66% recovered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warn shrink-0" />
                  <span className="text-ink3 text-xs">33–66%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-bad shrink-0" />
                  <span className="text-ink3 text-xs">&lt;33% (fatigued)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                  <span className="text-ink3 text-xs">Overdeveloped</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-ink3 shrink-0" />
                  <span className="text-ink3 text-xs">Balanced</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-bad shrink-0" />
                  <span className="text-ink3 text-xs">Underdeveloped</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: muscle list */}
        <div className="flex-1 min-w-0">
          <FramedCard className="bg-card rounded-2xl border border-line overflow-hidden">
            {visibleMuscles.map(m => (
              <MuscleListItem
                key={m.id}
                muscle={m}
                tab={tab}
                selected={selectedId === m.id}
                onSelect={() => handleSelectMuscle(m.id)}
              />
            ))}
          </FramedCard>
        </div>
      </div>

      {/* Back to Progress */}
      <div className="px-4 mt-8">
        <Link href="/progress" className="text-brand text-sm font-semibold">
          ← Progress
        </Link>
      </div>

      {/* Scan modal */}
      {showScan && (
        <ScanModal
          onClose={() => setShowScan(false)}
          onSuccess={handleScanSuccess}
        />
      )}
    </div>
  )
}
