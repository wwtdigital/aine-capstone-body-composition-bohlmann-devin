'use client'

import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'

type ParsedRecord = {
  reading_date: string | null
  weight_kg: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
  body_water_kg: number | null
  visceral_fat_level: number | null
  raw_extracted_json: string
  filename: string
  accepted: boolean
  error?: string
  saved?: boolean
  duplicate?: boolean
}

type Step = 'upload' | 'parsing' | 'preview' | 'saving' | 'done'

export default function InBodyImportPage() {
  const [step, setStep] = useState<Step>('upload')
  const [records, setRecords] = useState<ParsedRecord[]>([])
  const [dragging, setDragging] = useState(false)
  const [parseProgress, setParseProgress] = useState({ done: 0, total: 0 })
  const [saveResults, setSaveResults] = useState<{ saved: number; duplicates: string[]; errors: string[] }>({ saved: 0, duplicates: [], errors: [] })
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function processFiles(files: File[]) {
    const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (pdfs.length === 0) return
    setParseProgress({ done: 0, total: pdfs.length })
    setStep('parsing')

    const results: ParsedRecord[] = []
    for (const file of pdfs) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/inbody/parse', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) {
          results.push({
            reading_date: null, weight_kg: null, body_fat_pct: null,
            lean_mass_kg: null, body_water_kg: null, visceral_fat_level: null,
            raw_extracted_json: '', filename: file.name,
            accepted: false, error: data.error ?? 'Parse failed',
          })
        } else {
          results.push({ ...data, filename: file.name, accepted: true })
        }
      } catch {
        results.push({
          reading_date: null, weight_kg: null, body_fat_pct: null,
          lean_mass_kg: null, body_water_kg: null, visceral_fat_level: null,
          raw_extracted_json: '', filename: file.name,
          accepted: false, error: 'Connection error',
        })
      }
      setParseProgress(p => ({ ...p, done: p.done + 1 }))
    }

    setRecords(results)
    setStep('preview')
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files ?? []))
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  function toggleAccept(idx: number) {
    setRecords(prev => prev.map((r, i) => i === idx ? { ...r, accepted: !r.accepted } : r))
  }

  function updateField(idx: number, field: keyof ParsedRecord, value: string) {
    setRecords(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const numFields = ['weight_kg', 'body_fat_pct', 'lean_mass_kg', 'body_water_kg', 'visceral_fat_level']
      return { ...r, [field]: numFields.includes(field) ? (value === '' ? null : Number(value)) : value }
    }))
  }

  async function handleConfirm() {
    const toSave = records.filter(r => r.accepted && !r.error && r.reading_date)
    if (toSave.length === 0) return
    setStep('saving')

    let saved = 0
    const duplicates: string[] = []
    const errors: string[] = []

    for (const record of toSave) {
      try {
        const res = await fetch('/api/inbody', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reading_date: record.reading_date,
            weight_kg: record.weight_kg,
            body_fat_pct: record.body_fat_pct,
            lean_mass_kg: record.lean_mass_kg,
            body_water_kg: record.body_water_kg,
            visceral_fat_level: record.visceral_fat_level,
            source: 'pdf',
            raw_extracted_json: record.raw_extracted_json,
          }),
        })
        const data = await res.json()
        if (res.status === 409) {
          duplicates.push(`${record.reading_date} (${record.filename})`)
        } else if (!res.ok) {
          errors.push(`${record.filename}: ${data.error ?? 'Save failed'}`)
        } else {
          saved++
        }
      } catch {
        errors.push(`${record.filename}: Connection error`)
      }
    }

    setSaveResults({ saved, duplicates, errors })
    setStep('done')
  }

  const accepted = records.filter(r => r.accepted && !r.error && r.reading_date)

  const inputClass = 'w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none border border-zinc-200 dark:border-zinc-700'

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <div className="px-4 pt-12 pb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Import PDFs</h1>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm">InBody report PDFs</p>
        </div>

        <div className="px-4 flex-1 flex flex-col items-center justify-center">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center py-16 px-6 text-center ${dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}
          >
            <Upload size={32} className="text-zinc-400 dark:text-zinc-600 mb-3" />
            <p className="text-zinc-900 dark:text-white font-semibold mb-1">Drop PDF reports here</p>
            <p className="text-zinc-500 dark:text-zinc-500 text-sm">or tap to choose files · multiple supported</p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileInput} />
        </div>
      </div>
    )
  }

  if (step === 'parsing') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-8 h-8 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-900 dark:text-white text-lg font-medium">
          Parsing {parseProgress.done} / {parseProgress.total}
        </p>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Extracting fields with Claude...</p>
      </div>
    )
  }

  if (step === 'preview' || step === 'saving') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-32">
        <div className="px-4 pt-12 pb-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Review</h1>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm">{records.length} file{records.length !== 1 ? 's' : ''} parsed</p>
        </div>

        <div className="px-4 space-y-3">
          {records.map((record, idx) => (
            <div key={idx} className={`rounded-2xl border p-4 space-y-3 ${record.error ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20' : record.accepted ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-50'}`}>
              <div className="flex items-center justify-between">
                <p className="text-zinc-500 dark:text-zinc-400 text-xs truncate flex-1 mr-2">{record.filename}</p>
                {!record.error && (
                  <button
                    onClick={() => toggleAccept(idx)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${record.accepted ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                    style={{ minHeight: '32px' }}
                  >
                    {record.accepted ? 'Accept' : 'Rejected'}
                  </button>
                )}
              </div>

              {record.error ? (
                <p className="text-red-600 dark:text-red-400 text-sm">{record.error}</p>
              ) : (
                <>
                  <div>
                    <label className="text-zinc-500 dark:text-zinc-500 text-xs block mb-1">Date</label>
                    <input type="date" value={record.reading_date ?? ''} onChange={e => updateField(idx, 'reading_date', e.target.value)} className={inputClass} style={{ minHeight: '40px' }} />
                    {!record.reading_date && <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">Date not found — enter manually to accept</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { field: 'weight_kg', label: 'Weight (kg)' },
                      { field: 'body_fat_pct', label: 'Body Fat (%)' },
                      { field: 'lean_mass_kg', label: 'Lean Mass (kg)' },
                      { field: 'body_water_kg', label: 'Body Water (kg)' },
                      { field: 'visceral_fat_level', label: 'Visceral Fat' },
                    ].map(({ field, label }) => (
                      <div key={field}>
                        <label className="text-zinc-500 dark:text-zinc-500 text-xs block mb-1">{label}</label>
                        <input
                          type="number" step="0.1"
                          value={record[field as keyof ParsedRecord] as number ?? ''}
                          onChange={e => updateField(idx, field as keyof ParsedRecord, e.target.value)}
                          placeholder="—"
                          className={inputClass}
                          style={{ minHeight: '40px' }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-900">
          <button
            onClick={handleConfirm}
            disabled={step === 'saving' || accepted.length === 0}
            className="w-full py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform"
            style={{ minHeight: '56px' }}
          >
            {step === 'saving' ? 'Saving...' : `Save ${accepted.length} reading${accepted.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4 gap-6 pb-24">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-zinc-900 dark:text-white text-2xl font-bold">{saveResults.saved} reading{saveResults.saved !== 1 ? 's' : ''} saved</h2>

          {saveResults.duplicates.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
              <p className="text-amber-700 dark:text-amber-400 text-sm font-semibold mb-2">Duplicates skipped ({saveResults.duplicates.length})</p>
              {saveResults.duplicates.map((d, i) => <p key={i} className="text-amber-600 dark:text-amber-500 text-xs">{d}</p>)}
            </div>
          )}

          {saveResults.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-4">
              <p className="text-red-600 dark:text-red-400 text-sm font-semibold mb-2">Errors ({saveResults.errors.length})</p>
              {saveResults.errors.map((e, i) => <p key={i} className="text-red-600 dark:text-red-500 text-xs">{e}</p>)}
            </div>
          )}

          <button
            onClick={() => router.push('/month')}
            className="w-full py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-base"
            style={{ minHeight: '56px' }}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return null
}
