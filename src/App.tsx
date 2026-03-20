import { useCallback, useRef, useState, useEffect } from 'react'
import ClosetCanvas from './components/Canvas/ClosetCanvas'
import type { ClosetCanvasHandle } from './components/Canvas/ClosetCanvas'
import ComponentsPanel from './components/Panels/ComponentsPanel'
import PropertiesPanel from './components/Panels/PropertiesPanel'
import { useClosetStore } from './store/closetStore'
import type { ComponentTemplate } from './types/closet.types'

interface GhostState {
  template: ComponentTemplate
  x: number
  y: number
}

export default function App() {
  const { closet, clearAll, addElement } = useClosetStore()
  const canvasRef = useRef<ClosetCanvasHandle>(null)
  const ghostRef = useRef<GhostState | null>(null)
  const [ghost, setGhost] = useState<GhostState | null>(null)

  const totalElements = closet.sections.reduce((sum, s) => sum + s.elements.length, 0)
  const userElements = totalElements - closet.sections.length

  const handleAddFromPanel = useCallback(
    (template: ComponentTemplate) => {
      // Add to first section by default
      const firstSection = closet.sections[0]
      if (firstSection) {
        addElement(firstSection.id, template.kind)
      }
    },
    [addElement, closet.sections],
  )

  // ── Touch drag from panel ──
  const handleTouchDragStart = useCallback(
    (template: ComponentTemplate, x: number, y: number) => {
      const state = { template, x, y }
      ghostRef.current = state
      setGhost(state)

      const onMove = (e: PointerEvent) => {
        const next = { template, x: e.clientX, y: e.clientY }
        ghostRef.current = next
        setGhost(next)
      }

      const onUp = (e: PointerEvent) => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        const dropped = canvasRef.current?.tryDrop(template, e.clientX, e.clientY)
        if (!dropped) {
          const dx = Math.abs(e.clientX - x)
          const dy = Math.abs(e.clientY - y)
          if (dx < 10 && dy < 10) handleAddFromPanel(template)
        }
        ghostRef.current = null
        setGhost(null)
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [handleAddFromPanel],
  )

  // Prevent page scroll while dragging
  useEffect(() => {
    if (!ghost) return
    const prevent = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [!!ghost])

  return (
    <div className="h-screen flex flex-col select-none" dir="rtl">
      <header
        className="h-12 shrink-0 flex items-center justify-between px-4 md:px-6"
        style={{
          background: 'linear-gradient(90deg, #0f1623 0%, #131e2e 50%, #0f1623 100%)',
          borderBottom: '1px solid #1e2d40',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
            style={{
              background: 'linear-gradient(135deg, #c8a97e33, #c8a97e66)',
              border: '1px solid #c8a97e44',
            }}
          >
            🪵
          </div>
          <span className="text-sm font-semibold text-slate-100 tracking-wide">מעצב הארון</span>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <span className="text-[11px] text-slate-500 font-light hidden sm:block">
            {closet.dimensions.width} × {closet.dimensions.height} × {closet.dimensions.depth} ס״מ
          </span>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <span className="text-[11px] text-slate-500 font-light hidden sm:block">
            {closet.closetType === 'hinge' ? 'צירים' : 'הזזה'} · {closet.doors.count} דלתות
          </span>
        </div>
        <div className="flex items-center gap-3">
          {userElements > 0 && (
            <>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                {userElements} {userElements === 1 ? 'רכיב' : 'רכיבים'}
              </span>
              <button
                onClick={clearAll}
                className="text-[11px] text-red-400/80 hover:text-red-300 px-3 py-1.5 rounded-lg
                           border border-red-900/40 hover:border-red-800/60 hover:bg-red-950/30
                           transition-all min-h-[44px]"
              >
                נקה הכל
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <PropertiesPanel />
        <div className="flex-1 flex flex-col min-w-0">
          <ClosetCanvas ref={canvasRef} />
        </div>
        <ComponentsPanel onAdd={handleAddFromPanel} onTouchDragStart={handleTouchDragStart} />
      </div>

      {/* Touch drag ghost */}
      {ghost && (
        <div
          className="fixed pointer-events-none z-50 flex items-center gap-2.5 px-3 py-2.5 rounded-2xl shadow-2xl"
          style={{
            left: ghost.x - 48,
            top: ghost.y - 30,
            background: '#1e2d40',
            border: '1px solid rgba(200,169,126,0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(200,169,126,0.2)',
            transform: 'scale(1.08)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: 'rgba(200,169,126,0.2)', border: '1px solid rgba(200,169,126,0.35)' }}
          >
            {ghost.template.icon}
          </div>
          <span className="text-[13px] font-medium text-slate-200 whitespace-nowrap">
            {ghost.template.label}
          </span>
        </div>
      )}
    </div>
  )
}
