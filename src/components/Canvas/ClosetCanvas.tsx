// ============================================================
// ClosetCanvas — Main Konva Stage for the Closet Configurator.
//
// Responsibilities:
//  - Konva Stage + Layer with responsive sizing
//  - View toggle: Internal ↔ External (separate render trees)
//  - Drop handling (HTML5 drag + touch via imperative handle)
//  - Deselection on empty-area click
//  - Delegates to InternalView / ExternalView
//
// Drag-and-drop flow:
//  1. ComponentsPanel starts a drag (HTML5 or pointer-based)
//  2. ClosetCanvas receives drop coordinates (client px)
//  3. Converts to cm, finds which section the drop landed in
//  4. Calls store.addElement(sectionId, kind, yCm)
//  5. Store auto-runs enforceDrawerRules if needed
//  6. InternalView re-renders with the new element
// ============================================================

import { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Stage, Layer } from 'react-konva'
import Konva from 'konva'
import { useClosetStore } from '../../store/closetStore'
import { PX_PER_CM, cmToPx } from '../../utils/dimensions'
import { validateCloset } from '../../utils/closetValidation'
import type { ComponentTemplate, ElementKind } from '../../types/closet.types'
import { WALL_THICKNESS } from '../../types/closet.types'

import { GridLines, ClosetFrame, DimensionLines, HeightRuler } from './CanvasOverlays'
import InternalView from './InternalView'
import ExternalView from './ExternalView'

// ── Layout constants ────────────────────────────────────────

const LEFT_PAD = 58
const BOTTOM_PAD = 52
const TOP_PAD = 18
const RIGHT_PAD = 60
const GRID_CM = 5

// ── Imperative handle for touch drops ───────────────────────

export interface ClosetCanvasHandle {
  tryDrop: (template: ComponentTemplate, clientX: number, clientY: number) => boolean
  getStageDataUrl: () => string | null
}

// ── Component ───────────────────────────────────────────────

const ClosetCanvas = forwardRef<ClosetCanvasHandle>(function ClosetCanvas(_props, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  const {
    closet,
    viewMode,
    setViewMode,
    selectedElementId,
    selectElement,
    selectSection,
    addElement,
    moveElement,
    updateElement,
    distributeShelvesEqually: distributeInSection,
  } = useClosetStore()

  const validationErrors = useMemo(
    () => validateCloset(closet),
    [closet],
  )

  // ── Responsive sizing ──
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setContainerSize({ width: e.contentRect.width, height: e.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // ── Layer positioning (center the closet in the container) ──
  const { layerX, layerY } = useMemo(() => {
    const wPx = cmToPx(closet.dimensions.width)
    const hPx = cmToPx(closet.dimensions.height)
    const totalW = wPx + LEFT_PAD + RIGHT_PAD
    const totalH = hPx + TOP_PAD + BOTTOM_PAD
    return {
      layerX: Math.max(LEFT_PAD, Math.round((containerSize.width - totalW) / 2) + LEFT_PAD),
      layerY: Math.max(TOP_PAD, Math.round((containerSize.height - totalH) / 2) + TOP_PAD),
    }
  }, [closet.dimensions.width, closet.dimensions.height, containerSize])

  // ── Hit-test: which section does a cm coordinate land in? ──
  const findSectionAtX = useCallback((xCm: number) => {
    for (const sec of closet.sections) {
      const secLeft = sec.x + WALL_THICKNESS
      const secRight = secLeft + sec.width
      if (xCm >= secLeft && xCm <= secRight) return sec
    }
    // Fallback: closest section
    let best = closet.sections[0]
    let bestDist = Infinity
    for (const sec of closet.sections) {
      const center = sec.x + WALL_THICKNESS + sec.width / 2
      const dist = Math.abs(xCm - center)
      if (dist < bestDist) {
        bestDist = dist
        best = sec
      }
    }
    return best
  }, [closet.sections])

  // ── Convert client coords → cm coords ──
  const clientToCm = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null
    }
    const xCm = Math.max(0, Math.round((clientX - rect.left - layerX) / PX_PER_CM / GRID_CM) * GRID_CM)
    const yCm = Math.max(0, Math.round((clientY - rect.top - layerY) / PX_PER_CM / GRID_CM) * GRID_CM)
    return { xCm, yCm }
  }, [layerX, layerY])

  // ── Drop handler (shared by HTML5 and touch) ──
  const handleDropAt = useCallback((kind: ElementKind, xCm: number, yCm: number) => {
    const section = findSectionAtX(xCm)
    if (!section) return

    addElement(section.id, kind, yCm)

    // Auto-distribute shelves when a new shelf is added
    if (kind === 'shelf') {
      // Small delay so the element is added first
      setTimeout(() => distributeInSection(section.id), 0)
    }
  }, [findSectionAtX, addElement, distributeInSection])

  // ── HTML5 drag-drop ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/closet-component')
    if (!raw) return
    const template = JSON.parse(raw) as ComponentTemplate
    const coords = clientToCm(e.clientX, e.clientY)
    if (!coords) return
    handleDropAt(template.kind, coords.xCm, coords.yCm)
  }

  // ── Imperative handle for touch drag from panel ──
  useImperativeHandle(ref, () => ({
    tryDrop: (template, clientX, clientY) => {
      const coords = clientToCm(clientX, clientY)
      if (!coords) return false
      handleDropAt(template.kind, coords.xCm, coords.yCm)
      return true
    },
    getStageDataUrl: () => {
      return stageRef.current?.toDataURL({ pixelRatio: 2 }) ?? null
    },
  }), [clientToCm, handleDropAt])

  // ── Element interaction callbacks ──
  const handleSelectElement = useCallback(
    (sectionId: string, elementId: string) => selectElement(sectionId, elementId),
    [selectElement],
  )

  const handleMoveElement = useCallback(
    (sectionId: string, elementId: string, newY: number) => moveElement(sectionId, elementId, newY),
    [moveElement],
  )

  const handleResizeElement = useCallback(
    (sectionId: string, elementId: string, newHeight: number) => {
      updateElement(sectionId, elementId, { height: newHeight })
    },
    [updateElement],
  )

  const handleSelectSection = useCallback(
    (sectionId: string) => selectSection(sectionId),
    [selectSection],
  )

  // ── Count elements for empty state ──
  const totalElements = closet.sections.reduce((sum, s) => sum + s.elements.length, 0)
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        background: 'radial-gradient(ellipse at 35% 25%, #0d1b2e 0%, #0a1220 55%, #080f1a 100%)',
        touchAction: 'none',
      }}
    >
      {/* ── View toggle ── */}
      <div className="absolute top-3 left-3 z-10 flex rounded-xl overflow-hidden"
        style={{ border: '1px solid #1e2d40', background: '#0d1520' }}>
        <button
          onClick={() => setViewMode('internal')}
          className="px-3 py-1.5 text-xs font-medium transition-all min-h-[36px]"
          style={{
            background: viewMode === 'internal' ? '#1e3a5f' : 'transparent',
            color: viewMode === 'internal' ? '#93c5fd' : '#64748b',
            borderLeft: '1px solid #1e2d40',
          }}
        >
          פנים
        </button>
        <button
          onClick={() => setViewMode('external')}
          className="px-3 py-1.5 text-xs font-medium transition-all min-h-[36px]"
          style={{
            background: viewMode === 'external' ? '#1e3a5f' : 'transparent',
            color: viewMode === 'external' ? '#93c5fd' : '#64748b',
          }}
        >
          חוץ
        </button>
      </div>

      {/* ── Validation badge ── */}
      {validationErrors.length > 0 && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
          style={{
            background: validationErrors.some(e => e.severity === 'error')
              ? 'rgba(239,68,68,0.15)' : 'rgba(250,204,21,0.12)',
            border: `1px solid ${validationErrors.some(e => e.severity === 'error')
              ? 'rgba(239,68,68,0.3)' : 'rgba(250,204,21,0.25)'}`,
            color: validationErrors.some(e => e.severity === 'error')
              ? '#fca5a5' : '#fde68a',
          }}
        >
          <span>{validationErrors.filter(e => e.severity === 'error').length} שגיאות</span>
          {validationErrors.some(e => e.severity === 'warning') && (
            <span>· {validationErrors.filter(e => e.severity === 'warning').length} אזהרות</span>
          )}
        </div>
      )}

      {/* ── Konva Stage ── */}
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        onClick={(e) => {
          if (e.target === e.target.getStage()) {
            selectElement(null, null)
            selectSection(null)
          }
        }}
        onTap={(e) => {
          if (e.target === e.target.getStage()) {
            selectElement(null, null)
            selectSection(null)
          }
        }}
      >
        <Layer x={layerX} y={layerY}>
          {/* Shared overlays */}
          <GridLines w={closet.dimensions.width} h={closet.dimensions.height} />
          <ClosetFrame width={closet.dimensions.width} height={closet.dimensions.height} bodyColor={closet.bodyMaterial.color} />
          <DimensionLines width={closet.dimensions.width} height={closet.dimensions.height} />
          <HeightRuler height={closet.dimensions.height} wardrobeWidth={closet.dimensions.width} />

          {/* View-specific content */}
          {viewMode === 'internal' ? (
            <InternalView
              closet={closet}
              selectedElementId={selectedElementId}
              validationErrors={validationErrors}
              onSelectElement={handleSelectElement}
              onMoveElement={handleMoveElement}
              onResizeElement={handleResizeElement}
              onSelectSection={handleSelectSection}
            />
          ) : (
            <ExternalView closet={closet} />
          )}
        </Layer>
      </Stage>

      {/* ── Empty state ── */}
      {totalElements <= closet.sections.length && viewMode === 'internal' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2">
            <div className="text-5xl opacity-15">🪵</div>
            <div className="text-sm text-slate-600 font-light">
              {isTouch ? 'גרור רכיב מהתפריט לכאן' : 'גרור רכיב מהתפריט הימני'}
            </div>
            <div className="text-[11px] text-slate-700">או לחץ על רכיב להוספה מיידית</div>
          </div>
        </div>
      )}
    </div>
  )
})

export default ClosetCanvas
