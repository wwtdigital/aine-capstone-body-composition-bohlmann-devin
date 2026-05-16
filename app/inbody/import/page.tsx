'use client'

import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    const files = Array.from(e.target.files ?? [])
    processFiles(files)
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

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-10 pb-6">
          <Link href="/inbody" className="text-zinc-400 text-sm">← Back</Link>
          <h1 className="text-xl font-bold text-white">Import InBody PDFs</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`w-full max-w-sm rounded-2xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center py-16 px-6 text-center ${dragging ? 'border-white bg-zinc-800' : 'border-zinc-700 bg-zinc-900'}`}
          >
            <p className="text-white font-semibold text-lg mb-2">Drop PDF reports here</p>
            <p className="text-zinc-400 text-sm mb-4">or tap to choose files</p>
            <p className="text-zinc-500 text-xs">Multiple files supported</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>
    )
  }

  if (step === 'parsing') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-white text-lg font-medium">
          Parsing {parseProgress.done} / {parseProgress.total}
        </p>
        <p className="text-zinc-400 text-sm">Extracting fields with Claude...</p>
      </div>
    )
  }

  if (step === 'preview' || step === 'saving') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col pb-32">
        <div className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={() => setStep('upload')} className="text-zinc-400 text-sm">← Re-upload</button>
          <h1 className="text-xl font-bold text-white">Review ({records.length})</h1>
        </div>

        <div className="px-4 space-y-4">
          {records.map((record, idx) => (
            <div key={idx} className={`rounded-xl border p-4 space-y-3 ${record.error ? 'border-red-900 bg-red-950/20' : record.accepted ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 bg-zinc-900 opacity-50'}`}>
              <div className="flex items-center justify-between">
                <p className="text-zinc-400 text-xs truncate flex-1 mr-2">{record.filename}</p>
                {!record.error && (
                  <button
                    onClick={() => toggleAccept(idx)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${record.accepted ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400'}`}
                    style={{ minHeight: '32px' }}
                  >
                    {record.accepted ? 'Accept' : 'Rejected'}
                  </button>
                )}
              </div>

              {record.error ? (
                <p className="text-red-400 text-sm">{record.error}</p>
              ) : (
                <>
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Date</label>
                    <input
                      type="date"
                      value={record.reading_date ?? ''}
                      onChange={e => updateField(idx, 'reading_date', e.target.value)}
                      className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none w-full"
                      style={{ minHeight: '40px' }}
                    />
                    {!record.reading_date && <p className="text-amber-500 text-xs mt-1">Date not found — enter manually to accept</p>}
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
                        <label className="text-zinc-500 text-xs block mb-1">{label}</label>
                        <input
                          type="number"
                          step="0.1"
                          value={record[field as keyof ParsedRecord] as number ?? ''}
                          onChange={e => updateField(idx, field as keyof ParsedRecord, e.target.value)}
                          placeholder="—"
                          className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
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

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-900">
          <button
            onClick={handleConfirm}
            disabled={step === 'saving' || accepted.length === 0}
            className="w-full py-4 rounded-xl bg-white text-zinc-900 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform"
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 gap-6">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-white text-xl font-bold">{saveResults.saved} reading{saveResults.saved !== 1 ? 's' : ''} saved</h2>

          {saveResults.duplicates.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-900 rounded-xl p-4">
              <p className="text-amber-400 text-sm font-semibold mb-2">Duplicates skipped ({saveResults.duplicates.length})</p>
              {saveResults.duplicates.map((d, i) => <p key={i} className="text-amber-500 text-xs">{d}</p>)}
            </div>
          )}

          {saveResults.errors.length > 0 && (
            <div className="bg-red-950/30 border border-red-900 rounded-xl p-4">
              <p className="text-red-400 text-sm font-semibold mb-2">Errors ({saveResults.errors.length})</p>
              {saveResults.errors.map((e, i) => <p key={i} className="text-red-500 text-xs">{e}</p>)}
            </div>
          )}

          <button
            onClick={() => router.push('/inbody')}
            className="w-full py-4 rounded-xl bg-white text-zinc-900 font-bold text-base"
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
