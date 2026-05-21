'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, SquarePen } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  "How's my recovery today?",
  'Am I hitting my protein goals?',
  'What should I focus on this week?',
  'Analyze my body composition trend',
]

const TODAY = new Date().toISOString().slice(0, 10)
const LS_SESSION = 'bcc-chat-session'
const LS_LAST_OPENED = 'bcc-chat-last-opened'

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [unread, setUnread] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Init: load sessionId, check unread dot, load history
  useEffect(() => {
    let sid = localStorage.getItem(LS_SESSION)
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem(LS_SESSION, sid)
    }
    setSessionId(sid)

    const lastOpened = localStorage.getItem(LS_LAST_OPENED)
    if (lastOpened !== TODAY) setUnread(true)

    // Load existing history
    fetch(`/api/chat/history?sessionId=${sid}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages?.length) setMessages(data.messages)
      })
      .catch(() => {})
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  function openDrawer() {
    setOpen(true)
    setUnread(false)
    localStorage.setItem(LS_LAST_OPENED, TODAY)
  }

  function closeDrawer() {
    setOpen(false)
  }

  function newChat() {
    const newId = crypto.randomUUID()
    localStorage.setItem(LS_SESSION, newId)
    setSessionId(newId)
    setMessages([])
  }

  async function send(text: string) {
    if (!text.trim() || loading) return
    const trimmed = text.trim()

    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, sessionId }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setMessages(prev => [...prev, { role: 'assistant', content: data.error ?? 'Something went wrong. Try again.' }])
        setLoading(false)
        return
      }

      // Add empty assistant message; stream chunks into it
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      setLoading(false)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => {
          const arr = [...prev]
          arr[arr.length - 1] = { role: 'assistant', content: arr[arr.length - 1].content + chunk }
          return arr
        })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }])
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[39]"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-[68px] left-0 right-0 bg-page rounded-t-2xl z-40 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '75vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-line shrink-0">
          <div>
            <h2 className="text-base font-semibold text-ink">Coach AI</h2>
            <p className="text-xs text-ink3 mt-0.5">Knows your meals, recovery &amp; body comp</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={newChat}
              className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-ink3 active:scale-95 transition-transform"
              aria-label="New chat"
              title="New chat"
            >
              <SquarePen size={15} />
            </button>
            <button
              onClick={closeDrawer}
              className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-ink3 active:scale-95 transition-transform"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="pt-1 space-y-3">
              <p className="text-ink3 text-xs font-semibold uppercase tracking-wider">Try asking</p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left bg-card border border-line rounded-xl px-4 py-2.5 text-sm text-ink2 active:scale-95 transition-transform"
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

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 px-4 pt-2 pb-3 border-t border-line">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your data..."
              className="flex-1 bg-card border border-line text-ink rounded-full px-5 py-3 text-sm focus:outline-none focus:border-linehi transition-colors placeholder-ink4"
              style={{ minHeight: '46px' }}
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

      {/* FAB */}
      <button
        onClick={open ? closeDrawer : openDrawer}
        className="fixed bottom-[76px] right-4 z-40 w-12 h-12 rounded-full bg-brand flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        aria-label="Open Coach AI"
      >
        {open ? (
          <X size={16} className="text-page" />
        ) : (
          <Sparkles size={16} className="text-page" />
        )}
        {unread && !open && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-500 border-2 border-page" />
        )}
      </button>
    </>
  )
}
