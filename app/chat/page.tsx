'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, MessageCircle } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  "How's my protein this week?",
  'When was my last InBody?',
  'Am I on track for my goal?',
  "What's my average calories?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to get response.')
        setLoading(false)
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Connection error. Try again.')
    }
    setLoading(false)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 shrink-0">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Ask</h1>
        <p className="text-ink3 text-sm">Query your data in plain language</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {messages.length === 0 && (
          <div className="pt-4 space-y-3">
            <p className="text-ink3 text-xs font-semibold uppercase tracking-wider">Try asking</p>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left bg-card border border-line rounded-2xl px-4 py-3.5 text-ink2 text-sm font-medium active:scale-95 transition-transform hover:border-linehi"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <MessageCircle size={14} className="text-page" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand text-page rounded-br-sm'
                  : 'bg-card border border-line text-ink2 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center shrink-0">
              <MessageCircle size={14} className="text-page" />
            </div>
            <div className="bg-card border border-line rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-ink3 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-ink3 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-ink3 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-bad text-sm">{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-24 pt-2 bg-page/95 backdrop-blur-md border-t border-line">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your data..."
            className="flex-1 bg-card border border-line text-ink rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-linehi transition-colors placeholder-ink4"
            style={{ minHeight: '48px' }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Send size={16} className="text-page" />
          </button>
        </form>
      </div>
    </div>
  )
}
