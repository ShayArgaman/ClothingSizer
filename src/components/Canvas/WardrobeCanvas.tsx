import { useRef, useEffect, useState, useMemo } from 'react'
import type React from 'react'
import { Stage, Layer, Rect, Line, Text, Group } from 'react-konva'
import { useWardrobeStore } from '../../store/wardrobeStore'
import {
  cmToPx, formatCm, PX_PER_CM,
  WALL_CM, DIVIDER_CM, snapCm, snapXToSection,
} from '../../utils/dimensions'
import WardrobeElementNode from './WardrobeElement'
import type { ComponentTemplate, DoorType } from '../../types/wardrobe.types'

interface Props {
  onDrop?: (template: ComponentTemplate, x: number, y: number) => void
}

const GRID_CM = 5
const LEFT_PAD = 58   // space for height label on the left
const BOTTOM_PAD = 52 // space for width label below
const TOP_PAD = 18
const RIGHT_PAD = 20

// ─── Grid ────────────────────────────────────────────────────────────────────
function GridLines({ w, h }: { w: number; h: number }) {
  const lines: React.ReactElement[] = []
  const wPx = cmToPx(w), hPx = cmToPx(h)
  for (let x = 0; x <= w; x += GRID_CM) {
    const px = x * PX_PER_CM
    lines.push(<Line key={`v${x}`} points={[px, 0, px, hPx]}
      stroke={x % 20 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.022)'}
      strokeWidth={x % 20 === 0 ? 1 : 0.5} />)
  }
  for (let y = 0; y <= h; y += GRID_CM) {
    const py = y * PX_PER_CM
    lines.push(<Line key={`h${y}`} points={[0, py, wPx, py]}
      stroke={y % 20 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.022)'}
      strokeWidth={y % 20 === 0 ? 1 : 0.5} />)
  }
  return <>{lines}</>
}

// ─── Wardrobe frame ───────────────────────────────────────────────────────────
function WardrobeFrame({ width, height }: { width: number; height: number }) {
  const wPx = cmToPx(width), hPx = cmToPx(height), wall = cmToPx(WALL_CM)

  return (
    <Group>
      <Rect width={wPx} height={hPx} fill="#111c2d" />
      <Rect x={0} y={0} width={28} height={hPx} fill="rgba(0,0,0,0.18)" />
      <Rect x={wPx - 28} y={0} width={28} height={hPx} fill="rgba(0,0,0,0.14)" />
      <Rect x={0} y={0} width={wPx} height={22} fill="rgba(0,0,0,0.14)" />
      <Rect x={0} y={0} width={wall} height={hPx} fill="#1d3250" />
      <Rect x={wPx - wall} y={0} width={wall} height={hPx} fill="#1d3250" />
      <Rect x={0} y={0} width={wPx} height={wall} fill="#1d3250" />
      <Rect x={0} y={hPx - wall} width={wPx} height={wall} fill="#1d3250" />
      <Line points={[wall, wall, wall, hPx - wall]} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      <Line points={[wPx - wall, wall, wPx - wall, hPx - wall]} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />

      {/* ── Width dimension (below) ── */}
      <Line points={[0, hPx + 26, wPx, hPx + 26]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Line points={[0, hPx + 20, 0, hPx + 32]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Line points={[wPx, hPx + 20, wPx, hPx + 32]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Text text={formatCm(width)} x={wPx / 2 - 20} y={hPx + 34}
        fontSize={13} fill="#bfdbfe" fontStyle="bold" />

      {/* ── Height dimension (LEFT side) ── */}
      <Line points={[-28, 0, -28, hPx]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Line points={[-22, 0, -34, 0]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Line points={[-22, hPx, -34, hPx]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Text text={formatCm(height)} x={-44} y={hPx / 2 + 12}
        fontSize={13} fill="#bfdbfe" fontStyle="bold" rotation={-90} />
    </Group>
  )
}

// ─── Fixed centre divider ─────────────────────────────────────────────────────
function DividerPanel({ dividerX, wardrobeHeight }: { dividerX: number; wardrobeHeight: number }) {
  const xPx = cmToPx(dividerX)
  const hPx = cmToPx(wardrobeHeight)
  const divW = cmToPx(DIVIDER_CM)

  return (
    <Group listening={false}>
      <Rect x={xPx - divW / 2} y={0} width={divW} height={hPx} fill="#1d3250" />
      <Line points={[xPx - divW / 2 + 1, 4, xPx - divW / 2 + 1, hPx - 4]}
        stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      <Line points={[xPx + divW / 2 - 1, 4, xPx + divW / 2 - 1, hPx - 4]}
        stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      <Text text="תא שמאל" x={cmToPx(WALL_CM) + 4} y={6}
        fontSize={9} fill="rgba(148,163,184,0.4)" />
      <Text text="תא ימין" x={xPx + divW / 2 + 4} y={6}
        fontSize={9} fill="rgba(148,163,184,0.4)" />
    </Group>
  )
}

// ─── Door overlay ─────────────────────────────────────────────────────────────
interface DoorOverlayProps {
  xCm: number; widthCm: number; heightCm: number
  doorType: DoorType; hasMirror: boolean; side: 'left' | 'right'
}

function DoorOverlay({ xCm, widthCm, heightCm, doorType, hasMirror, side }: DoorOverlayProps) {
  if (doorType === 'none') return null
  const xPx = cmToPx(xCm), wPx = cmToPx(widthCm), hPx = cmToPx(heightCm)

  const panelFill = hasMirror
    ? {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: wPx, y: hPx },
        fillLinearGradientColorStops: [
          0, 'rgba(185,205,230,0.22)', 0.25, 'rgba(235,245,255,0.14)',
          0.6, 'rgba(200,218,240,0.18)', 1, 'rgba(165,185,215,0.20)',
        ],
      }
    : { fill: 'rgba(195,180,158,0.10)' }

  if (doorType === 'hinged') {
    const hingeX = side === 'left' ? xPx + 2 : xPx + wPx - 6
    const handleX = side === 'left' ? xPx + wPx - 10 : xPx + 4
    return (
      <Group listening={false}>
        <Rect x={xPx} y={0} width={wPx} height={hPx} {...panelFill}
          stroke="rgba(195,180,158,0.45)" strokeWidth={1.5} />
        {hasMirror && (
          <Rect x={xPx + 10} y={14} width={wPx - 20} height={hPx - 28}
            stroke="rgba(210,225,245,0.3)" strokeWidth={1} fill="transparent" cornerRadius={3} />
        )}
        {[hPx * 0.12, hPx * 0.5, hPx * 0.88].map((hy, i) => (
          <Rect key={i} x={hingeX} y={hy - 9} width={4} height={18}
            fill="rgba(210,200,170,0.65)" cornerRadius={1} />
        ))}
        <Rect x={handleX} y={hPx / 2 - 28} width={5} height={56}
          fill="rgba(210,200,170,0.6)" cornerRadius={2.5} />
      </Group>
    )
  }

  if (doorType === 'sliding') {
    const p1W = wPx * 0.57, p2W = wPx * 0.57
    const mirrorFill2 = hasMirror
      ? {
          fillLinearGradientStartPoint: { x: 0, y: 0 },
          fillLinearGradientEndPoint: { x: p1W, y: hPx },
          fillLinearGradientColorStops: [
            0, 'rgba(185,205,230,0.18)', 0.4, 'rgba(235,245,255,0.11)', 1, 'rgba(165,185,215,0.17)',
          ],
        }
      : { fill: 'rgba(195,180,158,0.08)' }
    return (
      <Group listening={false}>
        <Rect x={xPx} y={1} width={wPx} height={4} fill="rgba(195,180,158,0.22)" cornerRadius={2} />
        <Rect x={xPx} y={hPx - 5} width={wPx} height={4} fill="rgba(195,180,158,0.22)" cornerRadius={2} />
        <Rect x={xPx + wPx - p2W} y={0} width={p2W} height={hPx}
          {...(hasMirror ? panelFill : { fill: 'rgba(195,180,158,0.08)' })}
          stroke="rgba(195,180,158,0.30)" strokeWidth={1} />
        {hasMirror && <Rect x={xPx + wPx - p2W + 8} y={12} width={p2W - 16} height={hPx - 24}
          stroke="rgba(210,225,245,0.22)" strokeWidth={1} fill="transparent" cornerRadius={2} />}
        <Rect x={xPx + wPx - p2W / 2 - 2} y={hPx / 2 - 22} width={4} height={44}
          fill="rgba(210,200,170,0.45)" cornerRadius={2} />
        <Rect x={xPx} y={0} width={p1W} height={hPx} {...mirrorFill2}
          stroke="rgba(195,180,158,0.42)" strokeWidth={1.5} />
        {hasMirror && <Rect x={xPx + 8} y={12} width={p1W - 16} height={hPx - 24}
          stroke="rgba(210,225,245,0.25)" strokeWidth={1} fill="transparent" cornerRadius={2} />}
        <Rect x={xPx + p1W / 2 - 2} y={hPx / 2 - 22} width={4} height={44}
          fill="rgba(210,200,170,0.55)" cornerRadius={2} />
      </Group>
    )
  }
  return null
}

// ─── Main canvas ──────────────────────────────────────────────────────────────
export default function WardrobeCanvas({ onDrop }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [showDoors, setShowDoors] = useState(true)

  const { wardrobe, door, elements, selectedId, selectElement, updateElement } = useWardrobeStore()
  const dividerX = wardrobe.width / 2

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const e = entries[0]
      if (e) setContainerSize({ width: e.contentRect.width, height: e.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Dynamic centering: wardrobe centred in the canvas
  const { layerX, layerY } = useMemo(() => {
    const wPx = cmToPx(wardrobe.width)
    const hPx = cmToPx(wardrobe.height)
    const totalW = wPx + LEFT_PAD + RIGHT_PAD
    const totalH = hPx + TOP_PAD + BOTTOM_PAD
    return {
      layerX: Math.max(LEFT_PAD, Math.round((containerSize.width  - totalW) / 2) + LEFT_PAD),
      layerY: Math.max(TOP_PAD,  Math.round((containerSize.height - totalH) / 2) + TOP_PAD),
    }
  }, [wardrobe.width, wardrobe.height, containerSize])

  const handleElementChange = (id: string, updates: Partial<typeof elements[number]>) => {
    if (updates.x !== undefined) {
      const el = elements.find((e) => e.id === id)!
      const w = updates.width ?? el.width
      updates = { ...updates, x: snapXToSection(updates.x, w, wardrobe.width, dividerX) }
    }
    updateElement(id, updates)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/wardrobe-component')
    if (!raw || !onDrop) return
    const template = JSON.parse(raw) as ComponentTemplate
    const rect = containerRef.current!.getBoundingClientRect()
    const halfWidth = snapCm(wardrobe.width / 2)
    const dropXcm = Math.max(0, Math.round((e.clientX - rect.left - layerX) / PX_PER_CM / 5) * 5)
    const dropYcm = Math.max(0, Math.round((e.clientY - rect.top  - layerY) / PX_PER_CM / 5) * 5)
    const snappedX = snapXToSection(dropXcm, halfWidth, wardrobe.width, dividerX)
    onDrop(template, snappedX, dropYcm)
  }

  const leftSectionW  = dividerX
  const rightSectionW = wardrobe.width - dividerX
  const hasDoors      = door.doorType !== 'none'

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ background: 'radial-gradient(ellipse at 35% 25%, #0d1b2e 0%, #0a1220 55%, #080f1a 100%)' }}
    >
      <Stage
        width={containerSize.width}
        height={containerSize.height}
        onClick={(e) => { if (e.target === e.target.getStage()) selectElement(null) }}
      >
        <Layer x={layerX} y={layerY}>
          <GridLines w={wardrobe.width} h={wardrobe.height} />
          <WardrobeFrame width={wardrobe.width} height={wardrobe.height} />
          <DividerPanel dividerX={dividerX} wardrobeHeight={wardrobe.height} />

          {elements.map((el) => (
            <WardrobeElementNode
              key={el.id}
              element={el}
              isSelected={selectedId === el.id}
              onSelect={() => selectElement(el.id)}
              onChange={(updates) => handleElementChange(el.id, updates)}
            />
          ))}

          {showDoors && hasDoors && (
            <>
              <DoorOverlay xCm={0} widthCm={leftSectionW} heightCm={wardrobe.height}
                doorType={door.doorType} hasMirror={door.hasMirror} side="left" />
              <DoorOverlay xCm={dividerX} widthCm={rightSectionW} heightCm={wardrobe.height}
                doorType={door.doorType} hasMirror={door.hasMirror} side="right" />
            </>
          )}
        </Layer>
      </Stage>

      {hasDoors && (
        <button
          onClick={() => setShowDoors((v) => !v)}
          className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all min-h-[40px]"
          style={{
            background: showDoors ? '#1e3a5f' : '#1a2535',
            border: `1px solid ${showDoors ? '#3b82f666' : '#2d3f55'}`,
            color: showDoors ? '#93c5fd' : '#64748b',
          }}
        >
          🚪 {showDoors ? 'הסתר דלתות' : 'הצג דלתות'}
        </button>
      )}

      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2">
            <div className="text-5xl opacity-15">🪵</div>
            <div className="text-sm text-slate-600 font-light">גרור רכיב מהתפריט הימני</div>
            <div className="text-[11px] text-slate-700">או לחץ על רכיב להוספה מיידית</div>
          </div>
        </div>
      )}
    </div>
  )
}
