import { useState } from 'react'
import { COMPONENT_TEMPLATES } from '../../types/wardrobe.types'
import type { ComponentTemplate } from '../../types/wardrobe.types'

interface Props {
  onAdd: (template: ComponentTemplate) => void
  onTouchDragStart?: (template: ComponentTemplate, x: number, y: number) => void
}

export default function ComponentsPanel({ onAdd, onTouchDragStart }: Props) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024)

  const handleDragStart = (e: React.DragEvent, template: ComponentTemplate) => {
    e.dataTransfer.setData('application/wardrobe-component', JSON.stringify(template))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handlePointerDown = (e: React.PointerEvent, template: ComponentTemplate) => {
    if (e.pointerType === 'mouse') return // mouse uses HTML5 drag
    e.preventDefault()
    onTouchDragStart?.(template, e.clientX, e.clientY)
  }

  if (collapsed) {
    return (
      <aside className="w-10 flex flex-col shrink-0 items-center pt-4 cursor-pointer"
        style={{ background: '#111827', borderLeft: '1px solid #1e2d40' }}
        onClick={() => setCollapsed(false)}>
        <div className="text-slate-500 text-[11px]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          רכיבים ▶
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-52 flex flex-col shrink-0 transition-all duration-200"
      style={{ background: '#111827', borderLeft: '1px solid #1e2d40' }}>

      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d40' }}>
        <h2 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">רכיבים</h2>
        <button onClick={() => setCollapsed(true)}
          className="text-slate-600 hover:text-slate-400 text-xs w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: '#0f1623' }}>
          ▶
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {COMPONENT_TEMPLATES.map((template) => (
          <div
            key={template.type}
            draggable
            onDragStart={(e) => handleDragStart(e, template)}
            onPointerDown={(e) => handlePointerDown(e, template)}
            onClick={() => onAdd(template)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-150 select-none min-h-[60px]"
            style={{ background: '#1a2535', border: '1px solid #1e2d40', touchAction: 'none' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e2d40'
              e.currentTarget.style.borderColor = '#2d4160'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a2535'
              e.currentTarget.style.borderColor = '#1e2d40'
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: template.color + '22', border: `1px solid ${template.color}44` }}
            >
              {template.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-slate-200 leading-tight">{template.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{template.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3" style={{ borderTop: '1px solid #1e2d40' }}>
        <p className="text-[10px] text-slate-600 leading-relaxed text-center">לחץ להוספה · גרור לבד</p>
      </div>
    </aside>
  )
}
