'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Sparkles } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  "How's my protein this week?",
  'When was my last InBody?',
  'Am I on track for my goals?',
  "What's my average calories this month?",
  "How's my recovery trend?",
  'What should I focus on today?',
]

const LS_SESSION = 'bcc-chat-page-session'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let sid = localStorage.getItem(LS_SESSION)
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem(LS_SESSION, sid)
    }
    setSessionId(sid)

    // Load existing history for this page session
    fetch(`/api/chat/history?sessionId=${sid}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages?.length) setMessages(data.messages)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    if (!text.trim() || loading || !sessionId) return
    const trimmed = text.trim()

    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, sessionId }),
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
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-ok" />
          <p className="text-ink3 text-sm">Your data is loaded as context</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {messages.length === 0 && (
          <div className="pt-2 space-y-3">
            <p className="text-ink3 text-xs font-semibold uppercase tracking-wider">Try asking</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 bg-card border border-line rounded-full px-4 py-2 text-sm text-ink2 whitespace-nowrap active:scale-95 transition-transform"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Sparkles size={12} className="text-brand" />
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

        {/* Typing indicator inside assistant bubble */}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
              <Sparkles size={12} className="text-brand" />
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

      {/* Input area */}
      <div className="shrink-0 px-4 pb-24 pt-2 bg-page/95 backdrop-blur-md border-t border-line">
        {messages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="shrink-0 bg-card border border-line rounded-full px-4 py-2 text-sm text-ink2 whitespace-nowrap active:scale-95 transition-transform"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your data..."
            className="flex-1 bg-card border border-line text-ink rounded-full px-5 py-3 text-sm focus:outline-none focus:border-linehi transition-colors placeholder-ink4"
            style={{ minHeight: '48px' }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Send size={15} className="text-page" />
          </button>
        </form>
      </div>
    </div>
  )
}
