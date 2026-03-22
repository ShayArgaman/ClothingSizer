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

export function ClosetFrame({ width, height, bodyColor }: { width: number; height: number; bodyColor?: string }) {
  const wPx = cmToPx(width)
  const hPx = cmToPx(height)
  const wall = cmToPx(WALL_THICKNESS)
  const bc = bodyColor ?? '#1d3250'

  return (
    <Group listening={false}>
      {/* Background — subtle depth gradient */}
      <Rect width={wPx} height={hPx}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: hPx }}
        fillLinearGradientColorStops={[0, '#0e1726', 0.3, '#111c2d', 1, '#0c1420']} />
      {/* Vignette / ambient occlusion at edges */}
      <Rect x={0} y={0} width={wall + 16} height={hPx}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: wall + 16, y: 0 }}
        fillLinearGradientColorStops={[0, 'rgba(0,0,0,0.25)', 1, 'rgba(0,0,0,0)']} />
      <Rect x={wPx - wall - 16} y={0} width={wall + 16} height={hPx}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: wall + 16, y: 0 }}
        fillLinearGradientColorStops={[0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.22)']} />
      <Rect x={0} y={0} width={wPx} height={wall + 14}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: wall + 14 }}
        fillLinearGradientColorStops={[0, 'rgba(0,0,0,0.22)', 1, 'rgba(0,0,0,0)']} />
      <Rect x={0} y={hPx - wall - 14} width={wPx} height={wall + 14}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: wall + 14 }}
        fillLinearGradientColorStops={[0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.18)']} />

      {/* Structural walls — gradient with body material color */}
      {/* Left wall */}
      <Rect x={0} y={0} width={wall} height={hPx}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: wall, y: 0 }}
        fillLinearGradientColorStops={[0, bc, 0.6, bc, 1, 'rgba(255,255,255,0.06)']}
        opacity={0.85} />
      <Rect x={0} y={0} width={wall} height={hPx} fill={bc} opacity={0.55} />
      {/* Right wall */}
      <Rect x={wPx - wall} y={0} width={wall} height={hPx}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: wall, y: 0 }}
        fillLinearGradientColorStops={[0, 'rgba(255,255,255,0.06)', 0.4, bc, 1, bc]}
        opacity={0.85} />
      <Rect x={wPx - wall} y={0} width={wall} height={hPx} fill={bc} opacity={0.55} />
      {/* Top wall */}
      <Rect x={0} y={0} width={wPx} height={wall}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: wall }}
        fillLinearGradientColorStops={[0, bc, 0.6, bc, 1, 'rgba(255,255,255,0.05)']}
        opacity={0.85} />
      <Rect x={0} y={0} width={wPx} height={wall} fill={bc} opacity={0.55} />
      {/* Bottom wall */}
      <Rect x={0} y={hPx - wall} width={wPx} height={wall}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: wall }}
        fillLinearGradientColorStops={[0, 'rgba(255,255,255,0.04)', 0.4, bc, 1, bc]}
        opacity={0.85} />
      <Rect x={0} y={hPx - wall} width={wPx} height={wall} fill={bc} opacity={0.55} />

      {/* Inner edge highlights — gives 3D depth illusion */}
      <Line points={[wall, wall, wall, hPx - wall]}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      <Line points={[wPx - wall, wall, wPx - wall, hPx - wall]}
        stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      <Line points={[wall, wall, wPx - wall, wall]}
        stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      <Line points={[wall, hPx - wall, wPx - wall, hPx - wall]}
        stroke="rgba(255,255,255,0.05)" strokeWidth={1} />

      {/* Outer edge shadow */}
      <Line points={[0, 0, wPx, 0]} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} />
      <Line points={[0, hPx, wPx, hPx]} stroke="rgba(0,0,0,0.3)" strokeWidth={1.5} />
      <Line points={[0, 0, 0, hPx]} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
      <Line points={[wPx, 0, wPx, hPx]} stroke="rgba(0,0,0,0.3)" strokeWidth={1.5} />
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
