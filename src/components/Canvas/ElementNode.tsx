// ============================================================
// ElementNode — renders a single SectionElement as Konva shapes.
//
// Visual features:
//  - Per-kind shapes (shelf, drawer, rail, servetto, shoe-rack)
//  - Structural shelf: hatched fill + lock icon + thicker stroke
//  - Fixed cover shelf: subtle distinct style
//  - Error state: red glow / stroke when validation fails
//  - Selection: blue dashed outline + resize handles
//  - Dimensions: width & height rulers
// ============================================================

import { Group, Rect, Line, Text } from 'react-konva'
import { cmToPx, formatCm, PX_PER_CM, GRID_CM } from '../../utils/dimensions'
import type { SectionElement, ShelfElement } from '../../types/closet.types'
import { SHELF_THICKNESS } from '../../types/closet.types'

interface Props {
  element: SectionElement
  /** Width of the section this element belongs to (cm) */
  sectionWidth: number
  /** This element's body color (from closet body material) */
  color: string
  isSelected: boolean
  hasError: boolean
  onSelect: () => void
  onMove: (newY: number) => void
  onResize: (newHeight: number) => void
}

// ── Handle constants (px) ───────────────────────────────────

const EH = 10
const EL = 28
const HIT = 14

// ── Shape renderers ─────────────────────────────────────────

function ShelfShape({
  w, h, color, isStructural, isFixed,
}: {
  w: number; h: number; color: string; isStructural: boolean; isFixed: boolean
}) {
  if (isStructural) {
    // Hatched pattern: diagonal lines over a darker fill
    const hatches: React.ReactElement[] = []
    const spacing = 8
    for (let offset = -h; offset < w + h; offset += spacing) {
      hatches.push(
        <Line
          key={offset}
          points={[offset, 0, offset + h, h]}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />,
      )
    }
    return (
      <Group>
        <Rect width={w} height={h} fill="#2a4060" stroke="#4a90d9" strokeWidth={2} cornerRadius={1} />
        <Group clipX={0} clipY={0} clipWidth={w} clipHeight={h}>
          {hatches}
        </Group>
        {/* Lock icon (simple) */}
        <Text text="🔒" x={w - 16} y={h / 2 - 6} fontSize={10} />
      </Group>
    )
  }

  if (isFixed) {
    // Cover shelf (auto-generated above drawers) — subtle distinct style
    return (
      <Group>
        <Rect width={w} height={h} fill="#1e3450" stroke="#3b6fa0" strokeWidth={1.5}
          cornerRadius={1} dash={[3, 2]} />
      </Group>
    )
  }

  // Regular movable shelf
  return (
    <Group>
      <Rect width={w} height={h} fill={color} cornerRadius={2} />
      {Array.from({ length: Math.floor(w / 20) }).map((_, i) => (
        <Line key={i} points={[(i + 1) * 20, 1, (i + 1) * 20, h - 1]}
          stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
      ))}
    </Group>
  )
}

function DrawerShape({ w, h, color, isPair }: { w: number; h: number; color: string; isPair: boolean }) {
  if (isPair) {
    const halfH = h / 2
    return (
      <Group>
        {/* Bottom drawer */}
        <Rect width={w} height={halfH - 1} fill={color} cornerRadius={3} />
        <Rect x={4} y={3} width={w - 8} height={halfH - 7} fill="rgba(0,0,0,0.07)" cornerRadius={2} />
        <Rect x={w / 2 - 16} y={halfH / 2 - 3} width={32} height={6} fill="rgba(0,0,0,0.22)" cornerRadius={3} />
        {/* Top drawer */}
        <Group y={halfH + 1}>
          <Rect width={w} height={halfH - 1} fill={color} cornerRadius={3} />
          <Rect x={4} y={3} width={w - 8} height={halfH - 7} fill="rgba(0,0,0,0.07)" cornerRadius={2} />
          <Rect x={w / 2 - 16} y={(halfH - 1) / 2 - 3} width={32} height={6} fill="rgba(0,0,0,0.22)" cornerRadius={3} />
        </Group>
        {/* Dividing line */}
        <Line points={[2, halfH, w - 2, halfH]} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      </Group>
    )
  }

  return (
    <Group>
      <Rect width={w} height={h} fill={color} cornerRadius={3} />
      <Rect x={4} y={3} width={w - 8} height={h - 6} fill="rgba(0,0,0,0.07)" cornerRadius={2} />
      <Rect x={w / 2 - 16} y={h / 2 - 3} width={32} height={6} fill="rgba(0,0,0,0.22)" cornerRadius={3} />
    </Group>
  )
}

function HangingRailShape({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <Group>
      <Rect width={w} height={h} fill="rgba(148,163,184,0.08)"
        stroke={color} strokeWidth={1} cornerRadius={4} />
      {/* Rod */}
      <Rect x={4} y={6} width={w - 8} height={4} fill={color} cornerRadius={2} />
      {/* Hangers */}
      {Array.from({ length: Math.min(10, Math.floor(w / 22)) }).map((_, i) => {
        const hx = 10 + i * 22
        return (
          <Group key={i} x={hx} y={10}>
            <Line points={[0, 0, 0, 18]} stroke="rgba(148,163,184,0.55)" strokeWidth={1.5} />
            <Line points={[-7, 18, 7, 18, 0, 8]} stroke="rgba(148,163,184,0.55)" strokeWidth={1.5} closed />
          </Group>
        )
      })}
    </Group>
  )
}

function ServettoShape({ w, h }: { w: number; h: number }) {
  return (
    <Group>
      <Rect width={w} height={h} fill="rgba(100,140,200,0.08)"
        stroke="rgba(100,140,200,0.4)" strokeWidth={1} cornerRadius={4} dash={[6, 3]} />
      {/* Rod */}
      <Rect x={6} y={8} width={w - 12} height={4} fill="rgba(100,140,200,0.5)" cornerRadius={2} />
      {/* Pull-down cable */}
      <Line points={[w / 2, 12, w / 2, h - 8]}
        stroke="rgba(100,140,200,0.35)" strokeWidth={1.5} dash={[4, 4]} />
      {/* Arrow down */}
      <Line points={[w / 2 - 5, h - 14, w / 2, h - 8, w / 2 + 5, h - 14]}
        stroke="rgba(100,140,200,0.5)" strokeWidth={1.5} />
      {/* Label */}
      <Text text="⇕ סרווטו" x={6} y={h - 16} fontSize={8} fill="rgba(100,140,200,0.6)" />
    </Group>
  )
}

function ShoeRackShape({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <Group>
      <Rect width={w} height={h} fill={color} cornerRadius={3} />
      {Array.from({ length: Math.floor(w / 16) }).map((_, i) => (
        <Line key={i} points={[(i + 1) * 16, 0, (i + 1) * 16 - 5, h]}
          stroke="rgba(0,0,0,0.14)" strokeWidth={1.5} />
      ))}
    </Group>
  )
}

// ── Main component ──────────────────────────────────────────

import type React from 'react'

export default function ElementNode({
  element,
  sectionWidth,
  color,
  isSelected,
  hasError,
  onSelect,
  onMove,
  onResize,
}: Props) {
  const wPx = cmToPx(sectionWidth)
  const hPx = cmToPx(element.height)
  const isDraggable = !element.fixed

  const handleDragEnd = (e: { target: { x: () => number; y: () => number } }) => {
    if (!isDraggable) return
    const rawYcm = Math.max(0, Math.round(e.target.y() / PX_PER_CM / GRID_CM) * GRID_CM)
    onMove(rawYcm)
    // Reset x to 0 (elements always span full section width)
    e.target.x(0)
  }

  // Render the appropriate shape
  const renderShape = () => {
    switch (element.kind) {
      case 'shelf':
        return (
          <ShelfShape
            w={wPx} h={hPx} color={color}
            isStructural={(element as ShelfElement).isStructural}
            isFixed={element.fixed}
          />
        )
      case 'drawer-pair':
        return <DrawerShape w={wPx} h={hPx} color={color} isPair />
      case 'drawer-single':
        return <DrawerShape w={wPx} h={hPx} color={color} isPair={false} />
      case 'hanging-rail':
        return <HangingRailShape w={wPx} h={hPx} color={color} />
      case 'servetto':
        return <ServettoShape w={wPx} h={hPx} />
      case 'shoe-rack':
        return <ShoeRackShape w={wPx} h={hPx} color={color} />
      default:
        return <Rect width={wPx} height={hPx} fill={color} />
    }
  }

  return (
    <Group
      y={cmToPx(element.y)}
      x={0}
      draggable={isDraggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onDragMove={(e) => {
        // Constrain X to 0 (elements span full section width)
        e.target.x(0)
      }}
    >
      {renderShape()}

      {/* ── Error glow ── */}
      {hasError && (
        <Rect
          width={wPx} height={hPx}
          stroke="#ef4444" strokeWidth={2.5}
          fill="rgba(239,68,68,0.06)"
          cornerRadius={3}
          shadowColor="#ef4444"
          shadowBlur={10}
          shadowOpacity={0.4}
        />
      )}

      {/* ── Selection outline ── */}
      {isSelected && (
        <Rect
          width={wPx} height={hPx}
          stroke="#60a5fa" strokeWidth={2}
          fill="transparent"
          cornerRadius={3}
          dash={[4, 3]}
        />
      )}

      {/* ── Height dimension (right side) ── */}
      {element.height >= 10 && (
        <Group listening={false}>
          <Line points={[wPx + 7, 0, wPx + 7, hPx]} stroke="#60a5fa" strokeWidth={0.7} opacity={0.4} />
          <Line points={[wPx + 4, 0, wPx + 10, 0]} stroke="#60a5fa" strokeWidth={0.7} opacity={0.4} />
          <Line points={[wPx + 4, hPx, wPx + 10, hPx]} stroke="#60a5fa" strokeWidth={0.7} opacity={0.4} />
          <Text text={formatCm(element.height)} x={wPx + 12} y={hPx / 2 - 6}
            fontSize={9} fill="#93c5fd" fontStyle="bold" rotation={90} />
        </Group>
      )}

      {/* ── Element label ── */}
      {element.kind !== 'shelf' && (
        <Text
          text={element.kind === 'drawer-pair' ? 'זוג מגירות'
            : element.kind === 'drawer-single' ? 'מגירה'
            : element.kind === 'hanging-rail' ? 'מוט תלייה'
            : element.kind === 'servetto' ? 'סרווטו'
            : element.kind === 'shoe-rack' ? 'מתלה נעליים'
            : ''}
          x={4} y={4} fontSize={8} fill="rgba(255,255,255,0.45)"
        />
      )}

      {/* ── Resize handle (bottom edge) — only for selected movable elements ── */}
      {isSelected && isDraggable && element.height > SHELF_THICKNESS && (
        <Rect
          x={wPx / 2 - EL / 2} y={hPx - EH / 2}
          width={EL} height={EH}
          fill="#60a5fa" cornerRadius={3} hitStrokeWidth={HIT}
          draggable
          onDragMove={(e) => {
            e.cancelBubble = true
            const newH = Math.max(cmToPx(5), e.target.y() + EH / 2)
            const newHcm = Math.max(5, Math.round(newH / PX_PER_CM / GRID_CM) * GRID_CM)
            onResize(newHcm)
            e.target.x(wPx / 2 - EL / 2)
            e.target.y(cmToPx(newHcm) - EH / 2)
          }}
        />
      )}

      {/* ── Non-draggable cursor hint ── */}
      {element.fixed && isSelected && (
        <Group listening={false}>
          <Text text="🔒 קבוע" x={wPx / 2 - 18} y={hPx + 4}
            fontSize={8} fill="rgba(148,163,184,0.6)" />
        </Group>
      )}
    </Group>
  )
}
