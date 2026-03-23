import { useCallback, useRef, useState, useEffect } from 'react'
import ClosetCanvas from './components/Canvas/ClosetCanvas'
import type { ClosetCanvasHandle } from './components/Canvas/ClosetCanvas'
import ComponentsPanel from './components/Panels/ComponentsPanel'
import PropertiesPanel from './components/Panels/PropertiesPanel'
import CustomerModal from './components/Modals/CustomerModal'
import SearchModal from './components/Modals/SearchModal'
import { useClosetStore } from './store/closetStore'
import type { ComponentTemplate, CustomerDetails } from './types/closet.types'
import { supabase } from './lib/supabase'
import { saveDesign, updateDesign, loadDesign, type DesignRecord } from './services/designService'
import { generatePdf } from './services/pdfService'

interface GhostState {
  template: ComponentTemplate
  x: number
  y: number
}

type PendingAction = 'save' | 'export' | null
type MobilePanel = null | 'properties' | 'components'

// ── Breakpoint hook ──
function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

export default function App() {
  const {
    closet, customer, designId,
    clearAll, addElement, setCustomer, setDesignId, loadFromConfig,
    undo, redo, canUndo, canRedo,
  } = useClosetStore()

  const canvasRef = useRef<ClosetCanvasHandle>(null)
  const ghostRef = useRef<GhostState | null>(null)
  const [ghost, setGhost] = useState<GhostState | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null)

  const isMobile = useIsMobile()
  const totalElements = closet.sections.reduce((sum, s) => sum + s.elements.length, 0)
  const userElements = totalElements - closet.sections.length

  // ── Keyboard shortcuts for undo/redo ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) { redo() } else { undo() }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // ── Toast helper ──
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load design from URL on mount ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('design')
    if (!id) return

    loadDesign(id).then(rec => {
      if (rec) {
        loadFromConfig(
          rec.closet_config,
          { name: rec.customer_name, phone: rec.customer_phone },
          rec.id,
        )
        showToast(`נטען עיצוב של ${rec.customer_name}`)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Action execution (after customer details are confirmed) ──
  const executeAction = useCallback(async (action: PendingAction, cust: CustomerDetails) => {
    if (action === 'save') {
      setSaving(true)
      try {
        if (designId) {
          await updateDesign(designId, cust, closet)
          showToast('העיצוב עודכן בהצלחה')
        } else {
          const newId = await saveDesign(cust, closet)
          setDesignId(newId)
          const url = new URL(window.location.href)
          url.searchParams.set('design', newId)
          window.history.replaceState({}, '', url.toString())
          showToast('העיצוב נשמר בהצלחה')
        }
      } catch {
        showToast('שגיאה בשמירה — בדוק חיבור Supabase')
      }
      setSaving(false)
    }

    if (action === 'export') {
      try {
        showToast('מכין PDF...')
        const views = await canvasRef.current?.captureBothViews()
        if (!views) {
          showToast('שגיאה בייצוא — נסה שוב')
          return
        }
        await generatePdf({
          customer: cust,
          closet,
          internalDataUrl: views.internal,
          externalDataUrl: views.external,
        })
        showToast('PDF נוצר בהצלחה')
      } catch {
        showToast('שגיאה בייצוא PDF — נסה שוב')
      }
    }
  }, [closet, designId, setDesignId])

  // ── Button handlers ──
  const handleAction = (action: 'save' | 'export') => {
    if (!customer) {
      setPendingAction(action)
      setShowCustomerModal(true)
    } else {
      executeAction(action, customer)
    }
  }

  const handleCustomerSubmit = (details: CustomerDetails) => {
    setCustomer(details)
    setShowCustomerModal(false)
    if (pendingAction) {
      executeAction(pendingAction, details)
      setPendingAction(null)
    }
  }

  const handleLoadDesign = (rec: DesignRecord) => {
    loadFromConfig(
      rec.closet_config,
      { name: rec.customer_name, phone: rec.customer_phone },
      rec.id,
    )
    setShowSearchModal(false)
    const url = new URL(window.location.href)
    url.searchParams.set('design', rec.id)
    window.history.replaceState({}, '', url.toString())
    showToast(`נטען עיצוב של ${rec.customer_name}`)
  }

  // ── Panel callbacks ──
  const handleAddFromPanel = useCallback(
    (template: ComponentTemplate) => {
      const firstSection = closet.sections[0]
      if (firstSection) addElement(firstSection.id, template.kind)
    },
    [addElement, closet.sections],
  )

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

  useEffect(() => {
    if (!ghost) return
    const prevent = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [!!ghost])

  // Close mobile panel when switching to desktop
  useEffect(() => {
    if (!isMobile) setMobilePanel(null)
  }, [isMobile])

  return (
    <div className="h-screen flex flex-col select-none overflow-hidden" dir="rtl">
      {/* ═══ HEADER ═══ */}
      <header
        className="h-12 shrink-0 flex items-center justify-between px-3 md:px-6"
        style={{
          background: 'linear-gradient(90deg, #0f1623 0%, #131e2e 50%, #0f1623 100%)',
          borderBottom: '1px solid #1e2d40',
        }}
      >
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
            style={{
              background: 'linear-gradient(135deg, #c8a97e33, #c8a97e66)',
              border: '1px solid #c8a97e44',
            }}
          >
            🪵
          </div>
          <span className="text-sm font-semibold text-slate-100 tracking-wide hidden sm:block">מעצב הארון</span>
          <div className="h-4 w-px bg-slate-700 hidden md:block" />
          <span className="text-[11px] text-slate-500 font-light hidden md:block">
            {closet.dimensions.width} × {closet.dimensions.height} × {closet.dimensions.depth} ס״מ
          </span>
          <div className="h-4 w-px bg-slate-700 hidden lg:block" />
          <span className="text-[11px] text-slate-500 font-light hidden lg:block">
            {closet.closetType === 'hinge' ? 'צירים' : 'הזזה'} · {closet.doors.count} דלתות
          </span>
          {customer && (
            <>
              <div className="h-4 w-px bg-slate-700 hidden lg:block" />
              <span className="text-[11px] text-slate-400 font-light hidden lg:block">
                {customer.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            title="חזור (Ctrl+Z)"
            className="text-[11px] px-2 py-1.5 rounded-lg transition-all min-h-[44px] min-w-[44px] disabled:opacity-30"
            style={{ background: '#0f1623', border: '1px solid #2d3f55', color: '#94a3b8' }}
          >
            ↶ <span className="hidden sm:inline">חזור</span>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="קדימה (Ctrl+Shift+Z)"
            className="text-[11px] px-2 py-1.5 rounded-lg transition-all min-h-[44px] min-w-[44px] disabled:opacity-30"
            style={{ background: '#0f1623', border: '1px solid #2d3f55', color: '#94a3b8' }}
          >
            ↷ <span className="hidden sm:inline">קדימה</span>
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          {/* Search / Load */}
          <button
            onClick={() => supabase ? setShowSearchModal(true) : showToast('חיבור למסד נתונים לא זמין')}
            className="text-[11px] px-2 sm:px-3 py-1.5 rounded-lg transition-all min-h-[44px]"
            style={{ background: '#0f1623', border: '1px solid #2d3f55', color: '#94a3b8' }}
          >
            <span className="sm:hidden">טען</span>
            <span className="hidden sm:inline">טען עיצוב</span>
          </button>

          {/* Save */}
          {supabase && (
            <button
              onClick={() => handleAction('save')}
              disabled={saving}
              className="text-[11px] px-3 py-1.5 rounded-lg transition-all min-h-[44px] disabled:opacity-50"
              style={{ background: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd' }}
            >
              {saving ? '...' : designId ? 'עדכן' : 'שמור'}
            </button>
          )}

          {/* Export PDF */}
          <button
            onClick={() => handleAction('export')}
            className="text-[11px] px-3 py-1.5 rounded-lg transition-all min-h-[44px]"
            style={{ background: '#1a3a2f', border: '1px solid #22c55e55', color: '#86efac' }}
          >
            PDF
          </button>

          {userElements > 0 && (
            <>
              <span className="text-[11px] text-slate-500 hidden lg:block">
                {userElements} {userElements === 1 ? 'רכיב' : 'רכיבים'}
              </span>
              <button
                onClick={clearAll}
                className="text-[11px] text-red-400/80 hover:text-red-300 px-2 py-1.5 rounded-lg
                           border border-red-900/40 hover:border-red-800/60 hover:bg-red-950/30
                           transition-all min-h-[44px] hidden sm:block"
              >
                נקה הכל
              </button>
            </>
          )}
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Desktop sidebars */}
        {!isMobile && <PropertiesPanel />}

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <ClosetCanvas ref={canvasRef} />
        </div>

        {!isMobile && <ComponentsPanel onAdd={handleAddFromPanel} onTouchDragStart={handleTouchDragStart} />}
      </div>

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      {isMobile && (
        <div
          className="shrink-0 flex items-stretch"
          style={{
            background: '#111827',
            borderTop: '1px solid #1e2d40',
          }}
        >
          <button
            onClick={() => setMobilePanel(mobilePanel === 'properties' ? null : 'properties')}
            className="flex-1 py-3 text-[12px] font-medium transition-all min-h-[48px]"
            style={{
              background: mobilePanel === 'properties' ? '#1e3a5f' : 'transparent',
              color: mobilePanel === 'properties' ? '#93c5fd' : '#94a3b8',
              borderLeft: '1px solid #1e2d40',
            }}
          >
            מאפיינים
          </button>
          <button
            onClick={() => setMobilePanel(mobilePanel === 'components' ? null : 'components')}
            className="flex-1 py-3 text-[12px] font-medium transition-all min-h-[48px]"
            style={{
              background: mobilePanel === 'components' ? '#1e3a5f' : 'transparent',
              color: mobilePanel === 'components' ? '#93c5fd' : '#94a3b8',
            }}
          >
            רכיבים
          </button>
          {supabase && (
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex-1 py-3 text-[12px] font-medium transition-all min-h-[48px]"
              style={{ background: 'transparent', color: '#94a3b8', borderRight: '1px solid #1e2d40' }}
            >
              טען
            </button>
          )}
          {userElements > 0 && (
            <button
              onClick={clearAll}
              className="px-4 py-3 text-[12px] font-medium transition-all min-h-[48px]"
              style={{ background: 'transparent', color: '#f87171aa', borderRight: '1px solid #1e2d40' }}
            >
              נקה
            </button>
          )}
        </div>
      )}

      {/* ═══ MOBILE BOTTOM SHEET ═══ */}
      {isMobile && mobilePanel && (
        <div
          className="fixed inset-x-0 bottom-[48px] z-40 overflow-y-auto"
          style={{
            maxHeight: '55vh',
            background: '#111827',
            borderTop: '1px solid #1e2d40',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          {mobilePanel === 'properties' && <PropertiesPanel />}
          {mobilePanel === 'components' && (
            <ComponentsPanel onAdd={handleAddFromPanel} onTouchDragStart={handleTouchDragStart} />
          )}
        </div>
      )}

      {/* Backdrop to close mobile sheet */}
      {isMobile && mobilePanel && (
        <div
          className="fixed inset-0 z-30"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setMobilePanel(null)}
        />
      )}

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

      {/* Customer modal */}
      {showCustomerModal && (
        <CustomerModal
          initial={customer}
          onSubmit={handleCustomerSubmit}
          onClose={() => { setShowCustomerModal(false); setPendingAction(null) }}
        />
      )}

      {/* Search modal */}
      {showSearchModal && (
        <SearchModal
          onLoad={handleLoadDesign}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl"
          style={{
            background: '#1e3a5f',
            border: '1px solid #3b82f6',
            color: '#93c5fd',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
