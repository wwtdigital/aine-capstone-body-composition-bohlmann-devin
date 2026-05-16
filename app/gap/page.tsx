'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react'

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
  high: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400' },
  low: { bg: 'bg-zinc-50 dark:bg-zinc-900', border: 'border-zinc-200 dark:border-zinc-800', text: 'text-zinc-700 dark:text-zinc-300', badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' },
}

const priorityConfig = {
  high: { dot: 'bg-blue-600 dark:bg-blue-400', text: 'text-blue-700 dark:text-blue-300' },
  medium: { dot: 'bg-emerald-600 dark:bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
  low: { dot: 'bg-zinc-400 dark:bg-zinc-600', text: 'text-zinc-600 dark:text-zinc-400' },
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="flex items-start justify-between px-4 pt-12 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Gap Analysis</h1>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm">AI coaching · powered by Claude</p>
        </div>
        {analysis && !loading && (
          <button
            onClick={runAnalysis}
            className="mt-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold active:scale-95 transition-transform"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        )}
      </div>

      <div className="px-4 space-y-4">
        {!analysis && !loading && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Sparkles size={28} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-900 dark:text-white font-semibold text-lg">Analyze your data</p>
              <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-1 max-w-xs">
                Claude will assess your nutrition, body comp readings, and distance from goal — then give you a concrete action plan.
              </p>
            </div>
            <button
              onClick={runAnalysis}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 dark:bg-blue-500 text-white font-semibold text-base active:scale-95 transition-transform"
            >
              <Sparkles size={18} />
              Run Analysis
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-zinc-900 dark:text-white font-medium">Analyzing your data...</p>
              <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-1">Claude is reviewing your readings and nutrition</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
              <button onClick={runAnalysis} className="text-red-600 dark:text-red-400 text-xs underline mt-1">Try again</button>
            </div>
          </div>
        )}

        {analysis && !loading && (
          <>
            {/* Headline */}
            <div className="bg-blue-600 dark:bg-blue-600 rounded-2xl p-5">
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">Summary</p>
              <p className="text-white font-semibold text-lg leading-snug">{analysis.headline}</p>
              <div className="flex items-center gap-1.5 mt-3">
                <TrendingDown size={14} className="text-blue-200" />
                <p className="text-blue-200 text-sm">{analysis.timeline}</p>
              </div>
            </div>

            {/* Gaps */}
            {analysis.gaps.length > 0 && (
              <div>
                <p className="text-zinc-500 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Gaps Identified</p>
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
                <p className="text-zinc-500 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Action Plan</p>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {analysis.recommendations.map((rec, i) => {
                    const cfg = priorityConfig[rec.priority]
                    return (
                      <div key={i} className="p-4 flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                        <div className="flex-1">
                          <p className="text-zinc-900 dark:text-white font-semibold text-sm">{rec.action}</p>
                          <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-0.5">{rec.detail}</p>
                        </div>
                        <span className={`text-xs font-medium shrink-0 mt-0.5 ${cfg.text}`}>{rec.priority}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Coaching note */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
                <p className="text-zinc-500 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider">Coach's Note</p>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">{analysis.coaching_note}</p>
            </div>

            {/* Context footer */}
            {context && (
              <p className="text-zinc-400 dark:text-zinc-600 text-xs text-center pb-2">
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
