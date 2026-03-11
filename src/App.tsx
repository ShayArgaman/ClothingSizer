import { useCallback } from 'react'
import WardrobeCanvas from './components/Canvas/WardrobeCanvas'
import ComponentsPanel from './components/Panels/ComponentsPanel'
import PropertiesPanel from './components/Panels/PropertiesPanel'
import AIAdvisorPanel from './components/AIAdvisor/AIAdvisorPanel'
import { useWardrobeStore } from './store/wardrobeStore'
import type { ComponentTemplate, WardrobeElement } from './types/wardrobe.types'
import { snapCm, snapXToSection } from './utils/dimensions'

let idCounter = 1
const genId = () => `el-${Date.now()}-${idCounter++}`

export default function App() {
  const { addElement, clearAll, elements, wardrobe } = useWardrobeStore()

  const createElement = useCallback(
    (template: ComponentTemplate, x = 0, y = 0): WardrobeElement => {
      const halfW = snapCm(wardrobe.width / 2)
      return {
        id: genId(),
        type: template.type,
        x: Math.max(0, Math.min(x, wardrobe.width - halfW)),
        y: snapCm(Math.min(y, wardrobe.height - template.defaultHeight)),
        width: halfW,
        height: template.defaultHeight,
        depth: template.defaultDepth,
        color: template.color,
        material: 'oak',
        label: template.label,
      }
    },
    [wardrobe]
  )

  const handleAddFromPanel = useCallback(
    (template: ComponentTemplate) => {
      const halfW = snapCm(wardrobe.width / 2)
      const snappedX = snapXToSection(0, halfW, wardrobe.width, wardrobe.width / 2)
      addElement(createElement(template, snappedX, 0))
    },
    [addElement, createElement, wardrobe]
  )

  const handleCanvasDrop = useCallback(
    (template: ComponentTemplate, x: number, y: number) => addElement(createElement(template, x, y)),
    [addElement, createElement]
  )

  return (
    <div className="h-screen flex flex-col select-none" dir="rtl">
      <header className="h-12 shrink-0 flex items-center justify-between px-4 md:px-6"
        style={{ background: 'linear-gradient(90deg, #0f1623 0%, #131e2e 50%, #0f1623 100%)', borderBottom: '1px solid #1e2d40' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
            style={{ background: 'linear-gradient(135deg, #c8a97e33, #c8a97e66)', border: '1px solid #c8a97e44' }}>
            🪵
          </div>
          <span className="text-sm font-semibold text-slate-100 tracking-wide">מעצב הארון</span>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <span className="text-[11px] text-slate-500 font-light hidden sm:block">
            {wardrobe.width} × {wardrobe.height} × {wardrobe.depth} ס״מ
          </span>
        </div>
        <div className="flex items-center gap-3">
          {elements.length > 0 && (
            <>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                {elements.length} {elements.length === 1 ? 'רכיב' : 'רכיבים'}
              </span>
              <button
                onClick={clearAll}
                className="text-[11px] text-red-400/80 hover:text-red-300 px-3 py-1.5 rounded-lg
                           border border-red-900/40 hover:border-red-800/60 hover:bg-red-950/30
                           transition-all min-h-[36px]"
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
          <WardrobeCanvas onDrop={handleCanvasDrop} />
          <AIAdvisorPanel />
        </div>
        <ComponentsPanel onAdd={handleAddFromPanel} />
      </div>
    </div>
  )
}
