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

// ── Height Ruler (right side, 0 at bottom) ──────────────────

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
    const labelCm = height - y // 0 at bottom, height at top
    const isMajor = y % (step * 2) === 0 || y === 0 || y === height
    els.push(
      <Line key={`rt${y}`}
        points={[wPx + 12, yPx, wPx + (isMajor ? 24 : 18), yPx]}
        stroke="#60a5fa" strokeWidth={isMajor ? 1 : 0.6}
        opacity={isMajor ? 0.85 : 0.45} />,
    )
    if (isMajor) {
      els.push(
        <Text key={`rl${y}`} text={`${labelCm}`}
          x={wPx + 28} y={yPx - 5}
          fontSize={10} fill="#93c5fd" fontStyle="bold" />,
      )
    }
  }
  return <>{els}</>
}

// ── Human Figure (height reference, right of closet) ────────

export function HumanFigure({ height, wardrobeWidth }: { height: number; wardrobeWidth: number }) {
  const wPx = cmToPx(wardrobeWidth)
  const hPx = cmToPx(height)
  const figureX = wPx + 70 // right of ruler

  function renderFigure(heightCm: number, xOffset: number) {
    const figH = cmToPx(heightCm)
    const footY = hPx // bottom of closet = floor
    const topY = footY - figH
    const headR = figH * 0.065
    const headCy = topY + headR
    const neckY = headCy + headR
    const shoulderY = neckY + figH * 0.04
    const shoulderW = figH * 0.15
    const waistY = shoulderY + figH * 0.28
    const hipY = waistY + figH * 0.06
    const kneeY = hipY + figH * 0.22
    const cx = figureX + xOffset

    const col = 'rgba(147,197,253,0.35)'
    const colLabel = 'rgba(147,197,253,0.55)'

    return (
      <Group key={`fig-${heightCm}`} listening={false}>
        {/* Head */}
        <Line points={[
          cx, headCy - headR,
          cx + headR * 0.7, headCy - headR * 0.3,
          cx + headR * 0.7, headCy + headR * 0.3,
          cx, headCy + headR,
          cx - headR * 0.7, headCy + headR * 0.3,
          cx - headR * 0.7, headCy - headR * 0.3,
        ]} closed fill={col} />

        {/* Neck */}
        <Line points={[cx, neckY, cx, shoulderY]} stroke={col} strokeWidth={1.5} />

        {/* Shoulders + arms */}
        <Line points={[cx - shoulderW, shoulderY, cx + shoulderW, shoulderY]}
          stroke={col} strokeWidth={1.5} />
        <Line points={[cx - shoulderW, shoulderY, cx - shoulderW * 0.85, waistY * 0.55 + shoulderY * 0.45]}
          stroke={col} strokeWidth={1.2} />
        <Line points={[cx + shoulderW, shoulderY, cx + shoulderW * 0.85, waistY * 0.55 + shoulderY * 0.45]}
          stroke={col} strokeWidth={1.2} />

        {/* Torso */}
        <Line points={[cx, shoulderY, cx, hipY]} stroke={col} strokeWidth={1.5} />

        {/* Legs */}
        <Line points={[cx, hipY, cx - shoulderW * 0.5, kneeY, cx - shoulderW * 0.45, footY]}
          stroke={col} strokeWidth={1.2} />
        <Line points={[cx, hipY, cx + shoulderW * 0.5, kneeY, cx + shoulderW * 0.45, footY]}
          stroke={col} strokeWidth={1.2} />

        {/* Height label */}
        <Text text={`${(heightCm / 100).toFixed(2)} מ׳`}
          x={cx - 20} y={topY - 16}
          fontSize={10} fill={colLabel} fontStyle="bold" />

        {/* Horizontal guide line from figure top to closet */}
        <Line points={[wPx + 12, footY - figH, cx - headR - 4, footY - figH]}
          stroke="rgba(147,197,253,0.15)" strokeWidth={0.5} dash={[3, 3]} />
      </Group>
    )
  }

  return (
    <Group listening={false}>
      {renderFigure(160, 0)}
      {renderFigure(180, 50)}
    </Group>
  )
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
