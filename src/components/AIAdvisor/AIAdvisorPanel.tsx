import { useState, useRef, useEffect } from 'react'
import { useWardrobeStore } from '../../store/wardrobeStore'
import { sendMessage } from '../../agents/wardrobeAgent'
import type { Message } from '../../agents/wardrobeAgent'

const QUICK_PROMPTS = [
  'נתח את העיצוב שלי',
  'איפה להוסיף מדפים?',
  'מה הגובה האידיאלי למגירות?',
  'כמה מקום נשאר לניצול?',
]

export default function AIAdvisorPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { wardrobe, elements } = useWardrobeStore()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || isStreaming) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setError(null)
    setIsStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      await sendMessage(
        text,
        messages,
        { wardrobe, elements },
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + chunk }
            }
            return updated
          })
        }
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה לא ידועה'
      setError(msg.includes('API key') || msg.includes('api_key')
        ? 'הגדר VITE_ANTHROPIC_API_KEY בקובץ .env כדי להפעיל את היועץ.'
        : msg)
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsStreaming(false)
    }
  }

  const hasApiKey = Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY)

  return (
    <div
      className={`flex flex-col transition-all duration-200 shrink-0 ${isOpen ? 'h-60' : 'h-11'}`}
      style={{ background: '#0c1420', borderTop: '1px solid #1e2d40' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer shrink-0"
        style={{ borderBottom: isOpen ? '1px solid #1e2d40' : 'none' }}
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm"
            style={{ background: '#1e3a5f55', border: '1px solid #3b82f633' }}>
            🤖
          </div>
          <span className="text-[12px] font-semibold text-slate-300">יועץ AI לעיצוב ארון</span>
          {isStreaming && (
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </div>
        <span className="text-slate-600 text-[11px]">{isOpen ? '▼' : '▲'}</span>
      </div>

      {isOpen && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
            {!hasApiKey && (
              <div className="px-3 py-2 rounded-lg text-[11px] text-amber-300/80"
                style={{ background: '#451a0322', border: '1px solid #78350f44' }}>
                הגדר{' '}
                <code className="font-mono px-1 rounded text-amber-200"
                  style={{ background: '#78350f44' }}>VITE_ANTHROPIC_API_KEY</code>{' '}
                בקובץ <code className="font-mono px-1 rounded text-amber-200"
                  style={{ background: '#78350f44' }}>.env</code> להפעלת היועץ.
              </div>
            )}

            {messages.length === 0 && hasApiKey && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="px-2.5 py-1 text-[11px] rounded-full transition-all"
                    style={{ background: '#1a2535', border: '1px solid #2d3f55', color: '#94a3b8' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#1e2d40'
                      e.currentTarget.style.color = '#e2e8f0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1a2535'
                      e.currentTarget.style.color = '#94a3b8'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className="max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap"
                  style={msg.role === 'user'
                    ? { background: '#1e3a5f', border: '1px solid #3b82f644', color: '#bfdbfe' }
                    : { background: '#1a2535', border: '1px solid #2d3f55', color: '#cbd5e1' }
                  }
                >
                  {msg.content || <span className="text-slate-600 animate-pulse">חושב…</span>}
                </div>
              </div>
            ))}

            {error && (
              <div className="text-[11px] rounded-lg px-3 py-2"
                style={{ background: '#450a0a22', border: '1px solid #7f1d1d44', color: '#fca5a5' }}>
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 shrink-0" style={{ borderTop: '1px solid #1e2d40' }}>
            <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={hasApiKey ? 'שאל שאלה על הארון שלך…' : 'נדרש מפתח API'}
                disabled={!hasApiKey || isStreaming}
                className="flex-1 px-3 py-2 text-[12px] rounded-xl text-slate-200 placeholder-slate-600
                           focus:outline-none transition-all disabled:opacity-50"
                style={{ background: '#1a2535', border: '1px solid #2d3f55' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#2d3f55' }}
              />
              <button
                type="submit"
                disabled={!hasApiKey || isStreaming || !input.trim()}
                className="px-4 py-2 text-[12px] font-medium text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
              >
                שלח
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
