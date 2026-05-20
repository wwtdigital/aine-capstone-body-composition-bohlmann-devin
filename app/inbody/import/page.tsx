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
    const supported = files.filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') || f.type.startsWith('image/')
    )
    if (supported.length === 0) return
    setParseProgress({ done: 0, total: supported.length })
    setStep('parsing')

    const results: ParsedRecord[] = []
    for (const file of supported) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/inbody/parse', { method: 'POST', body: formData })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          results.push({
            reading_date: null, weight_kg: null, body_fat_pct: null,
            lean_mass_kg: null, body_water_kg: null, visceral_fat_level: null,
            raw_extracted_json: '', filename: file.name,
            accepted: false, error: data.error ?? `Error ${res.status}`,
          })
        } else {
          const data = await res.json()
          results.push({ ...data, filename: file.name, accepted: true })
        }
      } catch {
        results.push({
          reading_date: null, weight_kg: null, body_fat_pct: null,
          lean_mass_kg: null, body_water_kg: null, visceral_fat_level: null,
          raw_extracted_json: '', filename: file.name,
          accepted: false, error: 'Connection error — try again',
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

  const inputClass = 'w-full bg-surface text-ink rounded-xl px-3 py-2 text-sm focus:outline-none border border-line focus:border-linehi'

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-page pb-24">
        <div className="px-4 pt-12 pb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Import InBody</h1>
          <p className="text-ink3 text-sm">PDF reports or photos</p>
        </div>

        <div className="px-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center py-16 px-6 text-center ${dragging ? 'border-brand bg-brand/10' : 'border-line bg-card'}`}
          >
            <Upload size={32} className="text-ink3 mb-3" />
            <p className="text-ink font-semibold mb-1">Drop reports here</p>
            <p className="text-ink3 text-sm">PDF or photo · multiple supported</p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,application/pdf,image/*" multiple className="hidden" onChange={handleFileInput} />
        </div>
      </div>
    )
  }

  if (step === 'parsing') {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-ink text-lg font-medium">Parsing {parseProgress.done} / {parseProgress.total}</p>
        <p className="text-ink3 text-sm">Extracting fields with Claude...</p>
      </div>
    )
  }

  if (step === 'preview' || step === 'saving') {
    return (
      <div className="min-h-screen bg-page pb-32">
        <div className="px-4 pt-12 pb-4">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Review</h1>
          <p className="text-ink3 text-sm">{records.length} file{records.length !== 1 ? 's' : ''} parsed</p>
        </div>

        <div className="px-4 space-y-3">
          {records.map((record, idx) => (
            <div key={idx} className={`rounded-2xl border p-4 space-y-3 ${record.error ? 'border-bad/30 bg-bad/10' : record.accepted ? 'border-line bg-card' : 'border-line bg-card opacity-50'}`}>
              <div className="flex items-center justify-between">
                <p className="text-ink3 text-xs truncate flex-1 mr-2">{record.filename}</p>
                {!record.error && (
                  <button
                    onClick={() => toggleAccept(idx)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${record.accepted ? 'bg-brand text-page' : 'bg-surface text-ink3'}`}
                    style={{ minHeight: '32px' }}
                  >
                    {record.accepted ? 'Accept' : 'Rejected'}
                  </button>
                )}
              </div>

              {record.error ? (
                <p className="text-bad text-sm">{record.error}</p>
              ) : (
                <>
                  <div>
                    <label className="text-ink3 text-xs block mb-1">Date</label>
                    <input type="date" value={record.reading_date ?? ''} onChange={e => updateField(idx, 'reading_date', e.target.value)} className={inputClass} style={{ minHeight: '40px', colorScheme: 'dark' }} />
                    {!record.reading_date && <p className="text-warn text-xs mt-1">Date not found — enter manually to accept</p>}
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
                        <label className="text-ink3 text-xs block mb-1">{label}</label>
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

        <div className="fixed bottom-[68px] left-0 right-0 px-4 pb-3 pt-3 bg-page/95 backdrop-blur-md border-t border-line z-40">
          <button
            onClick={handleConfirm}
            disabled={step === 'saving' || accepted.length === 0}
            className="w-full py-4 rounded-full bg-brand text-page font-bold text-base disabled:opacity-40 active:scale-95 transition-transform"
          >
            {step === 'saving' ? 'Saving...' : `Save ${accepted.length} reading${accepted.length !== 1 ? 's' : ''} ›`}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center px-4 gap-6 pb-24">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-ink text-2xl font-bold">{saveResults.saved} reading{saveResults.saved !== 1 ? 's' : ''} saved</h2>

          {saveResults.duplicates.length > 0 && (
            <div className="bg-warn/10 border border-warn/30 rounded-2xl p-4">
              <p className="text-warn text-sm font-semibold mb-2">Duplicates skipped ({saveResults.duplicates.length})</p>
              {saveResults.duplicates.map((d, i) => <p key={i} className="text-warn/80 text-xs">{d}</p>)}
            </div>
          )}

          {saveResults.errors.length > 0 && (
            <div className="bg-bad/10 border border-bad/30 rounded-2xl p-4">
              <p className="text-bad text-sm font-semibold mb-2">Errors ({saveResults.errors.length})</p>
              {saveResults.errors.map((e, i) => <p key={i} className="text-bad/80 text-xs">{e}</p>)}
            </div>
          )}

          <button
            onClick={() => router.push('/month')}
            className="w-full py-4 rounded-2xl bg-brand text-page font-bold text-base"
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
