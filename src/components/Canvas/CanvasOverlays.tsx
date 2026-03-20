// ============================================================
// Shared canvas overlays: grid, closet frame, dimension rulers
// Used by both Internal and External views.
// ============================================================

import type React from 'react'
import { Group, Rect, Line, Text } from 'react-konva'
import { cmToPx, formatCm, PX_PER_CM } from '../../utils/dimensions'
import { WALL_THICKNESS } from '../../types/closet.types'

// ── Grid ────────────────────────────────────────────────────

const GRID_CM = 5

export function GridLines({ w, h }: { w: number; h: number }) {
  const lines: React.ReactElement[] = []
  const wPx = cmToPx(w)
  const hPx = cmToPx(h)

  for (let x = 0; x <= w; x += GRID_CM) {
    const px = x * PX_PER_CM
    const isMajor = x % 20 === 0
    lines.push(
      <Line
        key={`v${x}`}
        points={[px, 0, px, hPx]}
        stroke={isMajor ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.022)'}
        strokeWidth={isMajor ? 1 : 0.5}
      />,
    )
  }
  for (let y = 0; y <= h; y += GRID_CM) {
    const py = y * PX_PER_CM
    const isMajor = y % 20 === 0
    lines.push(
      <Line
        key={`h${y}`}
        points={[0, py, wPx, py]}
        stroke={isMajor ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.022)'}
        strokeWidth={isMajor ? 1 : 0.5}
      />,
    )
  }
  return <>{lines}</>
}

// ── Closet Frame ────────────────────────────────────────────

export function ClosetFrame({ width, height }: { width: number; height: number }) {
  const wPx = cmToPx(width)
  const hPx = cmToPx(height)
  const wall = cmToPx(WALL_THICKNESS)

  return (
    <Group listening={false}>
      {/* Background */}
      <Rect width={wPx} height={hPx} fill="#111c2d" />
      {/* Subtle side shading */}
      <Rect x={0} y={0} width={28} height={hPx} fill="rgba(0,0,0,0.18)" />
      <Rect x={wPx - 28} y={0} width={28} height={hPx} fill="rgba(0,0,0,0.14)" />
      <Rect x={0} y={0} width={wPx} height={22} fill="rgba(0,0,0,0.14)" />
      {/* Structural walls */}
      <Rect x={0} y={0} width={wall} height={hPx} fill="#1d3250" />
      <Rect x={wPx - wall} y={0} width={wall} height={hPx} fill="#1d3250" />
      <Rect x={0} y={0} width={wPx} height={wall} fill="#1d3250" />
      <Rect x={0} y={hPx - wall} width={wPx} height={wall} fill="#1d3250" />
      {/* Inner wall edges */}
      <Line points={[wall, wall, wall, hPx - wall]} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      <Line points={[wPx - wall, wall, wPx - wall, hPx - wall]} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
    </Group>
  )
}

// ── Dimension Lines ─────────────────────────────────────────

export function DimensionLines({ width, height }: { width: number; height: number }) {
  const wPx = cmToPx(width)
  const hPx = cmToPx(height)

  return (
    <Group listening={false}>
      {/* Width (below) */}
      <Line points={[0, hPx + 26, wPx, hPx + 26]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Line points={[0, hPx + 20, 0, hPx + 32]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Line points={[wPx, hPx + 20, wPx, hPx + 32]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Text text={formatCm(width)} x={wPx / 2 - 20} y={hPx + 34}
        fontSize={13} fill="#bfdbfe" fontStyle="bold" />

      {/* Height (left) */}
      <Line points={[-28, 0, -28, hPx]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Line points={[-22, 0, -34, 0]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Line points={[-22, hPx, -34, hPx]} stroke="#60a5fa" strokeWidth={1} opacity={0.8} />
      <Text text={formatCm(height)} x={-44} y={hPx / 2 + 12}
        fontSize={13} fill="#bfdbfe" fontStyle="bold" rotation={-90} />
    </Group>
  )
}

// ── Height Ruler (right side) ───────────────────────────────

export function HeightRuler({ height, wardrobeWidth }: { height: number; wardrobeWidth: number }) {
  const wPx = cmToPx(wardrobeWidth)
  const hPx = cmToPx(height)
  const step = height > 200 ? 20 : 10
  const els: React.ReactElement[] = []

  els.push(
    <Line key="rvline" points={[wPx + 12, 0, wPx + 12, hPx]}
      stroke="#60a5fa" strokeWidth={0.8} opacity={0.5} />,
  )

  for (let y = 0; y <= height; y += step) {
    const yPx = cmToPx(y)
    const isMajor = y % (step * 2) === 0 || y === 0 || y === height
    els.push(
      <Line key={`rt${y}`}
        points={[wPx + 12, yPx, wPx + (isMajor ? 24 : 18), yPx]}
        stroke="#60a5fa" strokeWidth={isMajor ? 1 : 0.6}
        opacity={isMajor ? 0.85 : 0.45} />,
    )
    if (isMajor) {
      els.push(
        <Text key={`rl${y}`} text={`${y}`}
          x={wPx + 28} y={yPx - 5}
          fontSize={10} fill="#93c5fd" fontStyle="bold" />,
      )
    }
  }
  return <>{els}</>
}

// ── Section Divider (vertical wall between sections) ────────

export function SectionDivider({
  xCm,
  heightCm,
  label,
}: {
  xCm: number
  heightCm: number
  label?: string
}) {
  const xPx = cmToPx(xCm)
  const hPx = cmToPx(heightCm)
  const divW = cmToPx(WALL_THICKNESS)

  return (
    <Group listening={false}>
      <Rect x={xPx - divW / 2} y={0} width={divW} height={hPx} fill="#1d3250" />
      <Line
        points={[xPx - divW / 2 + 1, 4, xPx - divW / 2 + 1, hPx - 4]}
        stroke="rgba(255,255,255,0.06)" strokeWidth={1}
      />
      <Line
        points={[xPx + divW / 2 - 1, 4, xPx + divW / 2 - 1, hPx - 4]}
        stroke="rgba(255,255,255,0.04)" strokeWidth={1}
      />
      {label && (
        <Text text={label} x={xPx + divW / 2 + 4} y={6}
          fontSize={9} fill="rgba(148,163,184,0.4)" />
      )}
    </Group>
  )
}
