// ============================================================
// ClosetCanvas — Main Konva Stage for the Closet Configurator.
//
// Fully responsive: uses ResizeObserver + auto-scale so the
// closet always fits within the visible container, scaling down
// gracefully on mobile/tablet while staying centered.
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
  /** Capture both views: returns { internal, external } data URLs */
  captureBothViews: () => Promise<{ internal: string; external: string } | null>
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

  // ── Auto-scale: fit the closet within the container ──
  //
  // Layer has scaleX/scaleY = s.  Layer x/y are in *stage* (screen) pixels.
  // Children draw in unscaled coords; Konva multiplies by scale.
  // So a child at (LEFT_PAD, TOP_PAD) appears at (layerX + LEFT_PAD*s, layerY + TOP_PAD*s) on screen.
  // We want the total bounding box centered in the container.
  const { layerX, layerY, scale } = useMemo(() => {
    const wPx = cmToPx(closet.dimensions.width)
    const hPx = cmToPx(closet.dimensions.height)
    const totalW = wPx + LEFT_PAD + RIGHT_PAD
    const totalH = hPx + TOP_PAD + BOTTOM_PAD

    // Scale down if closet doesn't fit; never scale up beyond 1
    const scaleX = containerSize.width / totalW
    const scaleY = containerSize.height / totalH
    const s = Math.min(scaleX, scaleY, 1)

    // The layer's children span 0..totalW in unscaled coords.
    // On screen that becomes 0..totalW*s.
    // To center: offset = (container - totalW*s) / 2
    const offsetX = Math.max(0, (containerSize.width - totalW * s) / 2)
    const offsetY = Math.max(0, (containerSize.height - totalH * s) / 2)

    // Layer x/y is in stage (screen) pixels.
    // Children draw at unscaled coords; the closet frame starts at (0,0).
    // The LEFT_PAD/TOP_PAD give space for dimension lines/rulers.
    // On screen: child(0,0) → (layerX + 0*s, layerY + 0*s) = (layerX, layerY).
    // We want LEFT_PAD*s px of padding on the left before the closet.
    return {
      layerX: offsetX + LEFT_PAD * s,
      layerY: offsetY + TOP_PAD * s,
      scale: s,
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

  // ── Convert client coords → cm coords (accounts for scale) ──
  const clientToCm = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null
    }
    // Stage coords = client - rect offset (since Stage fills the container 1:1)
    // Unscaled coords = (stageCoord - layerPos) / scale
    const stageX = clientX - rect.left
    const stageY = clientY - rect.top
    const unscaledX = (stageX - layerX) / scale
    const unscaledY = (stageY - layerY) / scale
    const xCm = Math.max(0, Math.round(unscaledX / PX_PER_CM / GRID_CM) * GRID_CM)
    const yCm = Math.max(0, Math.round(unscaledY / PX_PER_CM / GRID_CM) * GRID_CM)
    return { xCm, yCm }
  }, [layerX, layerY, scale])

  // ── Drop handler (shared by HTML5 and touch) ──
  const handleDropAt = useCallback((kind: ElementKind, xCm: number, yCm: number) => {
    const section = findSectionAtX(xCm)
    if (!section) return

    addElement(section.id, kind, yCm)

    // Auto-distribute shelves when a new shelf is added
    if (kind === 'shelf') {
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
    captureBothViews: async () => {
      if (!stageRef.current) return null
      const originalMode = viewMode

      // Crop bounds in stage (screen) pixels
      // The closet frame starts at unscaled (0,0) → stage (layerX, layerY)
      const padPx = 8
      const cropX = layerX - padPx
      const cropY = layerY - padPx
      const cropW = cmToPx(closet.dimensions.width) * scale + padPx * 2
      const cropH = cmToPx(closet.dimensions.height) * scale + padPx * 2
      // Increase pixelRatio to compensate for scale so the output resolution stays high
      const captureOpts = { pixelRatio: 2 / scale, x: cropX, y: cropY, width: cropW, height: cropH }

      // Capture current view first
      const currentUrl = stageRef.current.toDataURL(captureOpts)

      // Switch to the other view
      const otherMode = originalMode === 'internal' ? 'external' : 'internal'
      setViewMode(otherMode)

      // Wait for re-render
      await new Promise(r => setTimeout(r, 150))
      const otherUrl = stageRef.current!.toDataURL(captureOpts)

      // Restore original view
      setViewMode(originalMode)

      return {
        internal: originalMode === 'internal' ? currentUrl : otherUrl,
        external: originalMode === 'external' ? currentUrl : otherUrl,
      }
    },
  }), [clientToCm, handleDropAt, viewMode, setViewMode, layerX, layerY, scale, closet.dimensions])

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
      className="flex-1 overflow-hidden relative w-full h-full"
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
          className="px-3 py-1.5 text-xs font-medium transition-all min-h-[44px] min-w-[44px]"
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
          className="px-3 py-1.5 text-xs font-medium transition-all min-h-[44px] min-w-[44px]"
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
        <Layer x={layerX} y={layerY} scaleX={scale} scaleY={scale}>
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
              {isTouch ? 'לחץ על רכיב בתפריט להוספה' : 'גרור רכיב מהתפריט הימני'}
            </div>
            <div className="text-[11px] text-slate-700">או לחץ על רכיב להוספה מיידית</div>
          </div>
        </div>
      )}
    </div>
  )
})

export default ClosetCanvas
