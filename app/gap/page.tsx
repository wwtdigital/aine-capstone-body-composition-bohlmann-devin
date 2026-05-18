'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, RefreshCw, AlertCircle, TrendingDown, ChevronDown, ChevronUp, Apple, Scale } from 'lucide-react'
import FramedCard from '@/components/FramedCard'
import ISymbol from '@/components/ISymbol'

type Gap = { area: string; severity: 'high' | 'medium' | 'low'; detail: string }
type Rec = { action: string; detail: string; priority: 'high' | 'medium' | 'low' }
type Analysis = {
  headline: string
  timeline: string
  gaps: Gap[]
  recommendations: Rec[]
  coaching_note: string
}
type Context = {
  days_with_data: number
  avg_calories: number
  avg_protein: number
  generated_at: string
}
type HistoryEntry = {
  analysis: Analysis
  context: Context | null
  timestamp: string
  mode: string
}

const severityConfig = {
  high:   { bg: 'bg-bad/10',  border: 'border-bad/30',  text: 'text-bad',  badge: 'bg-bad/20 text-bad',  leftBorder: 'border-l-bad' },
  medium: { bg: 'bg-warn/10', border: 'border-warn/30', text: 'text-warn', badge: 'bg-warn/20 text-warn', leftBorder: 'border-l-warn' },
  low:    { bg: 'bg-card',    border: 'border-line',     text: 'text-ink2', badge: 'bg-surface text-ink3', leftBorder: 'border-l-ink4' },
}

const priorityConfig = {
  high:   { dot: 'bg-brand',  text: 'text-brand',  badge: 'bg-brand/10 text-brand' },
  medium: { dot: 'bg-ok',     text: 'text-ok',     badge: 'bg-ok/10 text-ok' },
  low:    { dot: 'bg-ink4',   text: 'text-ink3',   badge: 'bg-surface text-ink3' },
}

const MODES = [
  {
    id: 'full',
    label: 'Full Check-In',
    subtitle: 'Nutrition, body comp, recovery gaps',
    icon: Sparkles,
  },
  {
    id: 'nutrition',
    label: 'Nutrition Focus',
    subtitle: 'Deep dive on macros and calorie timing',
    icon: Apple,
  },
  {
    id: 'body',
    label: 'Body Composition',
    subtitle: 'Weight, lean mass, BF% trajectory',
    icon: Scale,
  },
]

export default function GapPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [context, setContext] = useState<Context | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedMode, setSelectedMode] = useState('full')
  const [checkedRecs, setCheckedRecs] = useState<Set<number>>(new Set())
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set())

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setCheckedRecs(new Set())
    try {
      const res = await fetch('/api/gap')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Analysis failed.')
        setLoading(false)
        return
      }
      if (analysis && context) {
        setHistory(prev => [
          { analysis, context, timestamp: context.generated_at, mode: selectedMode },
          ...prev.slice(0, 2),
        ])
      }
      setAnalysis(data.analysis)
      setContext(data.context)
    } catch {
      setError('Connection error. Try again.')
    }
    setLoading(false)
  }

  function toggleRec(i: number) {
    setCheckedRecs(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleHistoryExpand(i: number) {
    setExpandedHistory(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const modeName = MODES.find(m => m.id === selectedMode)?.label ?? 'Full Check-In'

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-12 pb-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink tracking-tight">AI Analysis</h1>
          <p className="text-ink3 text-sm">AI coaching · powered by Claude</p>
        </div>
        {analysis && !loading && (
          <button
            onClick={runAnalysis}
            className="mt-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-line text-ink3 text-xs font-semibold active:scale-95 transition-transform"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="px-4 pb-4">
        <div className="bg-surface rounded-xl p-1 flex gap-1">
          <div className="flex-1 bg-card shadow-sm rounded-lg px-4 py-2 text-center text-ink font-semibold text-sm">
            Analysis
          </div>
          <Link
            href="/chat"
            className="flex-1 rounded-lg px-4 py-2 text-center text-ink3 text-sm"
          >
            Ask
          </Link>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-bad/10 border border-bad/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-bad shrink-0 mt-0.5" />
            <div>
              <p className="text-bad text-sm font-medium">{error}</p>
              <button onClick={runAnalysis} className="text-bad text-xs underline mt-1">Try again</button>
            </div>
          </div>
        )}

        {/* Empty state — mode selector + run button */}
        {!analysis && !loading && (
          <>
            <div className="space-y-3">
              {MODES.map(mode => {
                const Icon = mode.icon
                const active = selectedMode === mode.id
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={`w-full text-left bg-card rounded-2xl border p-4 flex items-center gap-4 transition-colors active:scale-[0.99] ${
                      active ? 'border-brand bg-brand/5' : 'border-line'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-brand/15' : 'bg-surface'}`}>
                      <Icon size={18} className={active ? 'text-brand' : 'text-ink3'} />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${active ? 'text-ink' : 'text-ink2'}`}>{mode.label}</p>
                      <p className="text-ink3 text-xs mt-0.5">{mode.subtitle}</p>
                    </div>
                    {active && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-brand flex items-center justify-center shrink-0">
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              onClick={runAnalysis}
              className="w-full py-4 rounded-full bg-brand text-page font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Sparkles size={20} />
              Run Analysis ›
            </button>

            {context && (
              <p className="text-ink3 text-xs text-center">
                Based on your last {context.days_with_data} days of meals and your InBody readings
              </p>
            )}
          </>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            <FramedCard className="bg-card rounded-2xl border border-line p-5 space-y-3">
              <div className="h-3 bg-surface rounded-full w-1/4 animate-pulse" />
              <div className="h-5 bg-surface rounded-full w-3/4 animate-pulse" />
              <div className="h-4 bg-surface rounded-full w-1/2 animate-pulse" />
            </FramedCard>
            <FramedCard className="bg-card rounded-2xl border border-line p-4 space-y-2">
              <div className="h-3 bg-surface rounded-full w-1/3 animate-pulse" />
              <div className="h-12 bg-surface rounded-xl animate-pulse" />
              <div className="h-12 bg-surface rounded-xl animate-pulse" />
            </FramedCard>
            <FramedCard className="bg-card rounded-2xl border border-line p-4 space-y-2">
              <div className="h-3 bg-surface rounded-full w-1/3 animate-pulse" />
              <div className="h-14 bg-surface rounded-xl animate-pulse" />
              <div className="h-14 bg-surface rounded-xl animate-pulse" />
              <div className="h-14 bg-surface rounded-xl animate-pulse" />
            </FramedCard>
          </div>
        )}

        {/* Results */}
        {analysis && !loading && (
          <>
            {/* Headline card */}
            <FramedCard className="bg-gradient-to-br from-brand/15 to-brand/5 border border-brand/30 rounded-2xl p-5">
              <p className="text-brand text-xs font-semibold uppercase tracking-wider mb-2">Summary · {modeName}</p>
              <p className="text-ink font-semibold text-lg leading-snug">{analysis.headline}</p>
              <div className="flex items-center gap-1.5 mt-3">
                <TrendingDown size={14} className="text-ink3" />
                <p className="text-ink3 text-sm">{analysis.timeline}</p>
              </div>
            </FramedCard>

            {/* Gaps */}
            {analysis.gaps.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <ISymbol size={14} className="text-ink3 opacity-60" />
                  <span className="eyebrow">Gaps Identified</span>
                </div>
                <div className="space-y-2">
                  {analysis.gaps.map((gap, i) => {
                    const cfg = severityConfig[gap.severity]
                    return (
                      <FramedCard key={i} className={`rounded-2xl border-l-4 border border-line bg-card p-4 ${cfg.leftBorder}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`font-semibold text-sm ${cfg.text}`}>{gap.area}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{gap.severity}</span>
                        </div>
                        <p className="text-ink3 text-sm">{gap.detail}</p>
                      </FramedCard>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Action plan with checkboxes */}
            {analysis.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <ISymbol size={14} className="text-ink3 opacity-60" />
                  <span className="eyebrow">Action Plan</span>
                </div>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, i) => {
                    const cfg = priorityConfig[rec.priority]
                    const checked = checkedRecs.has(i)
                    return (
                      <button
                        key={i}
                        onClick={() => toggleRec(i)}
                        className="w-full text-left bg-card rounded-2xl border border-line p-4 flex items-start gap-3 active:scale-[0.99] transition-transform"
                      >
                        {/* Custom checkbox */}
                        <div className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                          checked ? 'bg-brand border-brand' : 'border-line'
                        }`}>
                          {checked && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm transition-all ${checked ? 'line-through text-ink4' : 'text-ink'}`}>
                            {rec.action}
                          </p>
                          <p className={`text-sm mt-0.5 transition-all ${checked ? 'text-ink4' : 'text-ink3'}`}>
                            {rec.detail}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${cfg.badge}`}>
                          {rec.priority}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Coach's note */}
            <FramedCard className="bg-surface rounded-2xl border border-line p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg width="20" height="16" viewBox="0 0 20 16" fill="none" className="text-brand shrink-0">
                  <path d="M0 16V9.6C0 7.04 0.586667 4.82667 1.76 2.96C2.96 1.09333 4.69333 0 7 0L7.6 1.2C6.13333 1.73333 5.01333 2.68 4.24 4.04C3.49333 5.4 3.12 6.77333 3.12 8.16H6.4V16H0ZM12.4 16V9.6C12.4 7.04 12.9867 4.82667 14.16 2.96C15.36 1.09333 17.0933 0 19.4 0L20 1.2C18.5333 1.73333 17.4133 2.68 16.64 4.04C15.8933 5.4 15.52 6.77333 15.52 8.16H18.8V16H12.4Z" fill="currentColor" opacity="0.3" />
                </svg>
                <div className="flex items-center gap-2">
                  <ISymbol size={14} className="text-ink3 opacity-60" />
                  <span className="eyebrow">Coach's Note</span>
                </div>
              </div>
              <p className="text-ink2 text-sm leading-relaxed">{analysis.coaching_note}</p>
            </FramedCard>

            {context && (
              <p className="text-ink3 text-xs text-center pb-2">
                Based on {context.days_with_data} days · {context.avg_calories} avg cal · {context.avg_protein}g avg protein
                {' · '}Generated {new Date(context.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}

            {/* Previous analyses */}
            {history.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <ISymbol size={14} className="text-ink3 opacity-60" />
                  <span className="eyebrow">Previous Analyses</span>
                </div>
                <div className="space-y-2">
                  {history.map((entry, i) => {
                    const expanded = expandedHistory.has(i)
                    return (
                      <FramedCard key={i} className="bg-card rounded-2xl border border-line overflow-hidden">
                        <button
                          onClick={() => toggleHistoryExpand(i)}
                          className="w-full text-left p-4 flex items-start justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-ink2 text-sm font-medium leading-snug line-clamp-2">{entry.analysis.headline}</p>
                            <p className="text-ink3 text-xs mt-1">
                              {entry.mode} · {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                              {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                          {expanded ? <ChevronUp size={16} className="text-ink4 shrink-0 mt-0.5" /> : <ChevronDown size={16} className="text-ink4 shrink-0 mt-0.5" />}
                        </button>
                        {expanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-line pt-3">
                            {entry.analysis.gaps.map((gap, gi) => {
                              const cfg = severityConfig[gap.severity]
                              return (
                                <div key={gi} className={`rounded-xl border-l-4 border border-line bg-surface p-3 ${cfg.leftBorder}`}>
                                  <p className={`font-semibold text-xs ${cfg.text}`}>{gap.area}</p>
                                  <p className="text-ink3 text-xs mt-0.5">{gap.detail}</p>
                                </div>
                              )
                            })}
                            <p className="text-ink3 text-xs italic leading-relaxed">{entry.analysis.coaching_note}</p>
                          </div>
                        )}
                      </FramedCard>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
