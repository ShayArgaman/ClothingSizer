// ============================================================
// ElementNode — renders a single SectionElement as Konva shapes.
//
// Premium visual rendering with:
//  - Multi-layer gradients for depth and realism
//  - Metallic drawer handles with highlights
//  - 3D edge highlights and shadows on all elements
//  - Structural shelf: hatched fill + lock icon + thicker stroke
//  - Error state: red glow / stroke when validation fails
//  - Selection: blue dashed outline + resize handles
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

// ── Color utilities ─────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function lighter(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const f = 1 + amount
  return `rgb(${Math.min(255, Math.round(r * f))},${Math.min(255, Math.round(g * f))},${Math.min(255, Math.round(b * f))})`
}

function darker(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const f = 1 - amount
  return `rgb(${Math.max(0, Math.round(r * f))},${Math.max(0, Math.round(g * f))},${Math.max(0, Math.round(b * f))})`
}

// ── Shape renderers ─────────────────────────────────────────

function ShelfShape({
  w, h, color, isStructural, isFixed,
}: {
  w: number; h: number; color: string; isStructural: boolean; isFixed: boolean
}) {
  if (isStructural) {
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
        {/* Base with gradient */}
        <Rect width={w} height={h}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: 0, y: h }}
          fillLinearGradientColorStops={[0, '#3a5a80', 0.5, '#2a4060', 1, '#1e3050']}
          stroke="#4a90d9" strokeWidth={2} cornerRadius={1}
        />
        {/* Hatches */}
        <Group clipX={0} clipY={0} clipWidth={w} clipHeight={h}>
          {hatches}
        </Group>
        {/* Top edge highlight */}
        <Line points={[1, 1, w - 1, 1]} stroke="rgba(120,180,255,0.25)" strokeWidth={1} />
        {/* Bottom shadow */}
        <Line points={[1, h - 1, w - 1, h - 1]} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
        {/* Lock icon */}
        <Text text="🔒" x={w - 16} y={h / 2 - 6} fontSize={10} />
      </Group>
    )
  }

  if (isFixed) {
    return (
      <Group>
        <Rect width={w} height={h}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: 0, y: h }}
          fillLinearGradientColorStops={[0, '#243d58', 0.5, '#1e3450', 1, '#182a40']}
          stroke="#3b6fa0" strokeWidth={1.5}
          cornerRadius={1} dash={[3, 2]}
        />
        <Line points={[1, 1, w - 1, 1]} stroke="rgba(100,160,220,0.15)" strokeWidth={1} />
      </Group>
    )
  }

  // Regular movable shelf — premium gradient with edge highlights
  return (
    <Group>
      {/* Shadow under shelf */}
      <Rect x={1} y={2} width={w - 2} height={h}
        fill="rgba(0,0,0,0.15)" cornerRadius={2} />
      {/* Main body gradient */}
      <Rect width={w} height={h}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: h }}
        fillLinearGradientColorStops={[0, lighter(color, 0.15), 0.4, color, 1, darker(color, 0.12)]}
        cornerRadius={2}
      />
      {/* Top highlight */}
      <Line points={[2, 1, w - 2, 1]} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
      {/* Bottom edge shadow */}
      <Line points={[2, h - 1, w - 2, h - 1]} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      {/* Subtle wood grain lines */}
      {Array.from({ length: Math.floor(w / 24) }).map((_, i) => (
        <Line key={i} points={[(i + 1) * 24, 1, (i + 1) * 24, h - 1]}
          stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
      ))}
    </Group>
  )
}

/** Metallic handle for drawers */
function DrawerHandle({ x, y, handleW }: { x: number; y: number; handleW: number }) {
  const hh = 5
  return (
    <Group x={x} y={y}>
      {/* Handle shadow */}
      <Rect x={1} y={1} width={handleW} height={hh}
        fill="rgba(0,0,0,0.25)" cornerRadius={2.5} />
      {/* Handle body — metallic gradient */}
      <Rect width={handleW} height={hh}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: hh }}
        fillLinearGradientColorStops={[0, '#b8c4d0', 0.3, '#8a9aad', 0.5, '#6b7d90', 0.7, '#8a9aad', 1, '#a0b0c0']}
        cornerRadius={2.5}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={0.5}
      />
      {/* Highlight line on top */}
      <Line points={[3, 1, handleW - 3, 1]} stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
    </Group>
  )
}

/** Single drawer panel with inset, gradient, and handle */
function DrawerPanel({ w, h, color }: { w: number; h: number; color: string }) {
  const inset = 3
  const handleW = Math.min(36, w * 0.35)
  return (
    <Group>
      {/* Drawer face gradient */}
      <Rect width={w} height={h}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: h }}
        fillLinearGradientColorStops={[0, lighter(color, 0.12), 0.3, color, 0.85, darker(color, 0.08), 1, darker(color, 0.15)]}
        cornerRadius={3}
      />
      {/* Inset panel */}
      <Rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2}
        fill="rgba(0,0,0,0.05)"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={0.5}
        cornerRadius={2}
      />
      {/* Top highlight */}
      <Line points={[3, 1, w - 3, 1]} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      {/* Bottom shadow */}
      <Line points={[3, h - 1, w - 3, h - 1]} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      {/* Metallic handle */}
      <DrawerHandle x={w / 2 - handleW / 2} y={h / 2 - 2.5} handleW={handleW} />
    </Group>
  )
}

function DrawerShape({ w, h, color, isPair }: { w: number; h: number; color: string; isPair: boolean }) {
  if (isPair) {
    const halfH = h / 2
    return (
      <Group>
        {/* Drop shadow */}
        <Rect x={1} y={2} width={w - 2} height={h}
          fill="rgba(0,0,0,0.12)" cornerRadius={3} />
        {/* Bottom drawer */}
        <DrawerPanel w={w} h={halfH - 1} color={color} />
        {/* Top drawer */}
        <Group y={halfH + 1}>
          <DrawerPanel w={w} h={halfH - 1} color={color} />
        </Group>
        {/* Dividing gap shadow */}
        <Line points={[2, halfH, w - 2, halfH]} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
        <Line points={[2, halfH - 0.5, w - 2, halfH - 0.5]} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      </Group>
    )
  }

  return (
    <Group>
      {/* Drop shadow */}
      <Rect x={1} y={2} width={w - 2} height={h}
        fill="rgba(0,0,0,0.12)" cornerRadius={3} />
      <DrawerPanel w={w} h={h} color={color} />
    </Group>
  )
}

function HangingRailShape({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <Group>
      {/* Subtle background zone */}
      <Rect width={w} height={h}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: h }}
        fillLinearGradientColorStops={[0, 'rgba(148,163,184,0.06)', 1, 'rgba(148,163,184,0.02)']}
        stroke={darker(color, 0.2)} strokeWidth={0.5} cornerRadius={4}
      />
      {/* Rod shadow */}
      <Rect x={5} y={8} width={w - 10} height={5}
        fill="rgba(0,0,0,0.15)" cornerRadius={2.5} />
      {/* Metallic rod */}
      <Rect x={4} y={6} width={w - 8} height={5}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: 5 }}
        fillLinearGradientColorStops={[0, '#d0d8e0', 0.3, '#a0aab5', 0.5, '#7a8895', 0.7, '#a0aab5', 1, '#c0c8d0']}
        cornerRadius={2.5}
      />
      {/* Rod highlight */}
      <Line points={[6, 7, w - 6, 7]} stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
      {/* Bracket mounts */}
      <Rect x={2} y={4} width={6} height={8}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 6, y: 0 }}
        fillLinearGradientColorStops={[0, '#606a75', 1, '#808a95']}
        cornerRadius={1}
      />
      <Rect x={w - 8} y={4} width={6} height={8}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 6, y: 0 }}
        fillLinearGradientColorStops={[0, '#808a95', 1, '#606a75']}
        cornerRadius={1}
      />
      {/* Hangers */}
      {Array.from({ length: Math.min(10, Math.floor(w / 22)) }).map((_, i) => {
        const hx = 10 + i * 22
        return (
          <Group key={i} x={hx} y={11}>
            <Line points={[0, 0, 0, 16]} stroke="rgba(148,163,184,0.5)" strokeWidth={1.5} />
            <Line points={[-6, 16, 6, 16, 0, 7]} stroke="rgba(148,163,184,0.45)" strokeWidth={1.2} closed />
          </Group>
        )
      })}
    </Group>
  )
}

function ServettoShape({ w, h }: { w: number; h: number }) {
  return (
    <Group>
      {/* Background zone with gradient */}
      <Rect width={w} height={h}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: h }}
        fillLinearGradientColorStops={[0, 'rgba(100,140,200,0.08)', 1, 'rgba(100,140,200,0.03)']}
        stroke="rgba(100,140,200,0.35)" strokeWidth={1} cornerRadius={4} dash={[6, 3]}
      />
      {/* Rod shadow */}
      <Rect x={7} y={10} width={w - 14} height={5}
        fill="rgba(0,0,0,0.1)" cornerRadius={2.5} />
      {/* Metallic rod */}
      <Rect x={6} y={8} width={w - 12} height={5}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: 5 }}
        fillLinearGradientColorStops={[0, '#a0b8d0', 0.4, '#708090', 0.6, '#708090', 1, '#a0b8d0']}
        cornerRadius={2.5}
      />
      {/* Pull-down mechanism */}
      <Line points={[w / 2, 13, w / 2, h - 10]}
        stroke="rgba(100,140,200,0.3)" strokeWidth={1.5} dash={[4, 4]} />
      {/* Arrow down */}
      <Line points={[w / 2 - 5, h - 15, w / 2, h - 9, w / 2 + 5, h - 15]}
        stroke="rgba(100,140,200,0.45)" strokeWidth={1.5} />
      {/* Label */}
      <Text text="⇕ סרווטו" x={6} y={h - 16} fontSize={8} fill="rgba(100,140,200,0.55)" />
    </Group>
  )
}

function ShoeRackShape({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <Group>
      {/* Drop shadow */}
      <Rect x={1} y={2} width={w - 2} height={h}
        fill="rgba(0,0,0,0.12)" cornerRadius={3} />
      {/* Base with gradient */}
      <Rect width={w} height={h}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: h }}
        fillLinearGradientColorStops={[0, lighter(color, 0.1), 0.4, color, 1, darker(color, 0.1)]}
        cornerRadius={3}
      />
      {/* Top highlight */}
      <Line points={[3, 1, w - 3, 1]} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      {/* Angled slat lines */}
      {Array.from({ length: Math.floor(w / 16) }).map((_, i) => (
        <Line key={i} points={[(i + 1) * 16, 2, (i + 1) * 16 - 5, h - 2]}
          stroke="rgba(0,0,0,0.1)" strokeWidth={1.5} />
      ))}
      {/* Bottom shadow edge */}
      <Line points={[3, h - 1, w - 3, h - 1]} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
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

  const handleDragEnd = (e: { target: { x: (v?: number) => number; y: (v?: number) => number } }) => {
    if (!isDraggable) return
    const rawYcm = Math.max(0, Math.round(e.target.y() / PX_PER_CM / GRID_CM) * GRID_CM)
    onMove(rawYcm)
    e.target.x(0)
  }

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

      {/* ── Resize handle (bottom edge) ── */}
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
