'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, AlertCircle, TrendingDown } from 'lucide-react'

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

const severityConfig = {
  high:   { bg: 'bg-bad/10',  border: 'border-bad/30',  text: 'text-bad',  badge: 'bg-bad/20 text-bad' },
  medium: { bg: 'bg-warn/10', border: 'border-warn/30', text: 'text-warn', badge: 'bg-warn/20 text-warn' },
  low:    { bg: 'bg-card',    border: 'border-line',     text: 'text-ink2', badge: 'bg-surface text-ink3' },
}

const priorityConfig = {
  high:   { dot: 'bg-brand',  text: 'text-brand' },
  medium: { dot: 'bg-ok',     text: 'text-ok' },
  low:    { dot: 'bg-ink4',   text: 'text-ink3' },
}

export default function GapPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [context, setContext] = useState<Context | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function runAnalysis() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/gap')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Analysis failed.')
        setLoading(false)
        return
      }
      setAnalysis(data.analysis)
      setContext(data.context)
    } catch {
      setError('Connection error. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="flex items-start justify-between px-4 pt-12 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Gap Analysis</h1>
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

      <div className="px-4 space-y-4">
        {!analysis && !loading && (
          <div className="bg-card rounded-2xl border border-line p-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Sparkles size={28} className="text-brand" />
            </div>
            <div>
              <p className="text-ink font-semibold text-lg">Analyze your data</p>
              <p className="text-ink3 text-sm mt-1 max-w-xs">
                Claude will assess your nutrition, body comp readings, and distance from goal — then give you a concrete action plan.
              </p>
            </div>
            <button
              onClick={runAnalysis}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand text-page font-semibold text-base active:scale-95 transition-transform"
            >
              <Sparkles size={18} />
              Run Analysis
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-card rounded-2xl border border-line p-10 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-ink font-medium">Analyzing your data...</p>
              <p className="text-ink3 text-sm mt-1">Claude is reviewing your readings and nutrition</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-bad/10 border border-bad/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-bad shrink-0 mt-0.5" />
            <div>
              <p className="text-bad text-sm font-medium">{error}</p>
              <button onClick={runAnalysis} className="text-bad text-xs underline mt-1">Try again</button>
            </div>
          </div>
        )}

        {analysis && !loading && (
          <>
            {/* Headline */}
            <div className="bg-brand/10 border border-brand/30 rounded-2xl p-5">
              <p className="text-brand text-xs font-semibold uppercase tracking-wider mb-2">Summary</p>
              <p className="text-ink font-semibold text-lg leading-snug">{analysis.headline}</p>
              <div className="flex items-center gap-1.5 mt-3">
                <TrendingDown size={14} className="text-ink3" />
                <p className="text-ink3 text-sm">{analysis.timeline}</p>
              </div>
            </div>

            {/* Gaps */}
            {analysis.gaps.length > 0 && (
              <div>
                <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Gaps Identified</p>
                <div className="space-y-2">
                  {analysis.gaps.map((gap, i) => {
                    const cfg = severityConfig[gap.severity]
                    return (
                      <div key={i} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`font-semibold text-sm ${cfg.text}`}>{gap.area}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{gap.severity}</span>
                        </div>
                        <p className={`text-sm ${cfg.text} opacity-90`}>{gap.detail}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div>
                <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Action Plan</p>
                <div className="bg-card rounded-2xl border border-line divide-y divide-line">
                  {analysis.recommendations.map((rec, i) => {
                    const cfg = priorityConfig[rec.priority]
                    return (
                      <div key={i} className="p-4 flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                        <div className="flex-1">
                          <p className="text-ink font-semibold text-sm">{rec.action}</p>
                          <p className="text-ink3 text-sm mt-0.5">{rec.detail}</p>
                        </div>
                        <span className={`text-xs font-medium shrink-0 mt-0.5 ${cfg.text}`}>{rec.priority}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Coaching note */}
            <div className="bg-card rounded-2xl border border-line p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-brand" />
                <p className="text-ink3 text-xs font-semibold uppercase tracking-wider">Coach's Note</p>
              </div>
              <p className="text-ink2 text-sm leading-relaxed">{analysis.coaching_note}</p>
            </div>

            {context && (
              <p className="text-ink3 text-xs text-center pb-2">
                Based on {context.days_with_data} days of nutrition data · {context.avg_calories} avg cal · {context.avg_protein}g avg protein
                {' · '}Generated {new Date(context.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
