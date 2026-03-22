// ============================================================
// ExternalView — renders the exterior of the closet.
//
// Premium rendering: doors use the front material color as a
// base, with multi-layer gradients for depth. Front finishes
// (mirror, glass, bronze, gold) add realistic overlay effects.
// ============================================================

import { Group, Rect, Line, Text } from 'react-konva'
import type { ClosetConfig, DrawerElement, HandleStyle } from '../../types/closet.types'
import { WALL_THICKNESS, FRONT_FINISH_LABELS } from '../../types/closet.types'
import { getInnerHeight, computeDoorHeightForSection, computeDoorYOffset } from '../../utils/closetUtils'
import { cmToPx } from '../../utils/dimensions'

interface Props {
  closet: ClosetConfig
}

// ── Door base fill: material color with depth gradient ──────

function getDoorBaseFill(materialColor: string, w: number, h: number) {
  // Parse hex to rgb for gradient manipulation
  const r = parseInt(materialColor.slice(1, 3), 16)
  const g = parseInt(materialColor.slice(3, 5), 16)
  const b = parseInt(materialColor.slice(5, 7), 16)

  const lighter = `rgba(${Math.min(255, r + 25)},${Math.min(255, g + 25)},${Math.min(255, b + 25)},0.95)`
  const base = `rgba(${r},${g},${b},0.92)`
  const darker = `rgba(${Math.max(0, r - 20)},${Math.max(0, g - 20)},${Math.max(0, b - 20)},0.95)`

  return {
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: w * 0.3, y: h },
    fillLinearGradientColorStops: [
      0, lighter,
      0.15, base,
      0.85, base,
      1, darker,
    ],
  }
}

// ── Front finish overlay (on top of material base) ──────────

function FrontFinishOverlay({ finish, x, w, h }: { finish: string; x: number; w: number; h: number }) {
  switch (finish) {
    case 'mirror':
      return (
        <Group>
          {/* Base mirror tint */}
          <Rect x={x} y={0} width={w} height={h}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: w, y: h }}
            fillLinearGradientColorStops={[
              0, 'rgba(200,215,230,0.45)',
              0.2, 'rgba(180,200,220,0.25)',
              0.45, 'rgba(220,235,250,0.35)',
              0.6, 'rgba(190,205,225,0.20)',
              0.8, 'rgba(210,225,240,0.30)',
              1, 'rgba(175,195,215,0.40)',
            ]} />
          {/* Diagonal reflection streak */}
          <Rect x={x + w * 0.15} y={0} width={w * 0.12} height={h}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: w * 0.12, y: 0 }}
            fillLinearGradientColorStops={[
              0, 'rgba(255,255,255,0)',
              0.3, 'rgba(255,255,255,0.12)',
              0.7, 'rgba(255,255,255,0.12)',
              1, 'rgba(255,255,255,0)',
            ]} />
          {/* Glossy top highlight */}
          <Rect x={x} y={0} width={w} height={h * 0.08}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: h * 0.08 }}
            fillLinearGradientColorStops={[
              0, 'rgba(255,255,255,0.18)',
              1, 'rgba(255,255,255,0)',
            ]} />
        </Group>
      )

    case 'black-glass':
      return (
        <Group>
          <Rect x={x} y={0} width={w} height={h}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: w * 0.4, y: h }}
            fillLinearGradientColorStops={[
              0, 'rgba(10,10,15,0.82)',
              0.3, 'rgba(20,22,30,0.78)',
              0.7, 'rgba(15,15,22,0.80)',
              1, 'rgba(8,8,12,0.85)',
            ]} />
          {/* Glossy reflection */}
          <Rect x={x + w * 0.2} y={0} width={w * 0.15} height={h}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: w * 0.15, y: 0 }}
            fillLinearGradientColorStops={[
              0, 'rgba(255,255,255,0)',
              0.4, 'rgba(255,255,255,0.06)',
              0.6, 'rgba(255,255,255,0.06)',
              1, 'rgba(255,255,255,0)',
            ]} />
          {/* Top gloss edge */}
          <Line points={[x + 2, 1, x + w - 2, 1]}
            stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        </Group>
      )

    case 'clear-glass':
      return (
        <Rect x={x} y={0} width={w} height={h}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: w, y: h }}
          fillLinearGradientColorStops={[
            0, 'rgba(185,210,240,0.18)',
            0.3, 'rgba(220,240,255,0.10)',
            0.6, 'rgba(195,220,245,0.14)',
            1, 'rgba(170,195,225,0.16)',
          ]} />
      )

    case 'frosted-glass':
      return (
        <Rect x={x} y={0} width={w} height={h}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: w, y: h }}
          fillLinearGradientColorStops={[
            0, 'rgba(200,210,225,0.35)',
            0.5, 'rgba(215,225,235,0.25)',
            1, 'rgba(190,200,218,0.32)',
          ]} />
      )

    case 'bronze':
      return (
        <Rect x={x} y={0} width={w} height={h}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: w, y: h }}
          fillLinearGradientColorStops={[
            0, 'rgba(180,140,80,0.28)',
            0.4, 'rgba(200,165,100,0.18)',
            0.7, 'rgba(170,130,75,0.22)',
            1, 'rgba(155,115,65,0.30)',
          ]} />
      )

    case 'gold':
      return (
        <Rect x={x} y={0} width={w} height={h}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: w, y: h }}
          fillLinearGradientColorStops={[
            0, 'rgba(220,190,100,0.30)',
            0.3, 'rgba(245,220,140,0.20)',
            0.6, 'rgba(230,200,110,0.24)',
            1, 'rgba(200,170,80,0.32)',
          ]} />
      )

    default:
      return null
  }
}

// ── Metallic handle rendering ───────────────────────────────

function Handle({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <Group>
      <Rect x={x} y={y} width={w} height={h}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: w, y: 0 }}
        fillLinearGradientColorStops={[
          0, 'rgba(160,155,145,0.6)',
          0.3, 'rgba(220,215,205,0.85)',
          0.5, 'rgba(240,238,232,0.9)',
          0.7, 'rgba(215,210,200,0.85)',
          1, 'rgba(155,150,140,0.6)',
        ]}
        cornerRadius={w / 2} />
      {/* Highlight line */}
      <Line points={[x + w * 0.35, y + 2, x + w * 0.35, y + h - 2]}
        stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
    </Group>
  )
}

// ── Hinge Door Panel ────────────────────────────────────────

function HingeDoor({
  xPx, wPx, hPx, yOffsetPx,
  doorIndex, handleStyle, centerHandleDoorIndex,
  frontFinish, materialColor,
}: {
  xPx: number; wPx: number; hPx: number; yOffsetPx: number
  doorIndex: number; handleStyle: HandleStyle; centerHandleDoorIndex: number | null
  frontFinish: string; materialColor: string
}) {
  const baseFill = getDoorBaseFill(materialColor, wPx, hPx)
  const hingeOnLeft = doorIndex % 2 === 0
  const hingeX = hingeOnLeft ? xPx + 2 : xPx + wPx - 6
  const handleX = hingeOnLeft ? xPx + wPx - 12 : xPx + 6

  const isCenter = handleStyle === 'center' && centerHandleDoorIndex === doorIndex
  const showHandle = handleStyle !== 'center' || isCenter

  return (
    <Group y={yOffsetPx}>
      {/* Door panel — material base */}
      <Rect x={xPx} y={0} width={wPx} height={hPx}
        {...baseFill}
        stroke="rgba(0,0,0,0.25)" strokeWidth={1} />

      {/* Top edge highlight (3D depth) */}
      <Line points={[xPx + 1, 1, xPx + wPx - 1, 1]}
        stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      {/* Left edge highlight */}
      <Line points={[xPx + 1, 1, xPx + 1, hPx - 1]}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      {/* Bottom shadow */}
      <Line points={[xPx + 1, hPx - 1, xPx + wPx - 1, hPx - 1]}
        stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      {/* Right shadow */}
      <Line points={[xPx + wPx - 1, 1, xPx + wPx - 1, hPx - 1]}
        stroke="rgba(0,0,0,0.12)" strokeWidth={1} />

      {/* Front finish overlay */}
      <FrontFinishOverlay finish={frontFinish} x={xPx} w={wPx} h={hPx} />

      {/* Outer frame line (door edge) */}
      <Rect x={xPx + 3} y={3} width={wPx - 6} height={hPx - 6}
        stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} fill="transparent" />

      {/* Hinges — metallic */}
      {[hPx * 0.12, hPx * 0.5, hPx * 0.88].map((hy, i) => (
        <Rect key={i} x={hingeX} y={hy - 9} width={4} height={18}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: 4, y: 0 }}
          fillLinearGradientColorStops={[
            0, 'rgba(180,175,165,0.5)',
            0.5, 'rgba(220,218,210,0.7)',
            1, 'rgba(170,165,155,0.5)',
          ]}
          cornerRadius={1} />
      ))}

      {/* Handle */}
      {showHandle && handleStyle === 'point' && (
        <Handle x={handleX} y={hPx / 2 - 5} w={5} h={10} />
      )}
      {showHandle && handleStyle === 'long' && (
        <Handle x={handleX} y={hPx / 2 - 30} w={5} h={60} />
      )}
      {showHandle && isCenter && (
        <Handle x={xPx + wPx / 2 - 2.5} y={hPx / 2 - 38} w={5} h={76} />
      )}

      {/* Door width label */}
      <Text text={`${Math.round(wPx / 3.5)}`} x={xPx + wPx / 2 - 8} y={hPx - 18}
        fontSize={9} fill="rgba(255,255,255,0.25)" />
    </Group>
  )
}

// ── Sliding Door Panel ──────────────────────────────────────

function SlidingDoor({
  xPx, wPx, hPx,
  doorIndex, frontFinish, materialColor,
  strips,
}: {
  xPx: number; wPx: number; hPx: number
  doorIndex: number; frontFinish: string; materialColor: string
  strips: { positions: number[]; material: string } | null
}) {
  const baseFill = getDoorBaseFill(materialColor, wPx, hPx)
  const isFront = doorIndex % 2 === 0
  const depth = isFront ? 0 : 2

  const stripColor = strips
    ? strips.material === 'nickel' ? 'rgba(185,185,195,0.65)'
      : strips.material === 'white' ? 'rgba(235,235,240,0.55)'
      : 'rgba(205,205,215,0.6)'
    : 'transparent'

  return (
    <Group>
      {/* Rail tracks */}
      <Rect x={xPx} y={0} width={wPx} height={5}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: 5 }}
        fillLinearGradientColorStops={[0, 'rgba(140,140,150,0.3)', 1, 'rgba(100,100,110,0.15)']}
        cornerRadius={2} />
      <Rect x={xPx} y={hPx - 5} width={wPx} height={5}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: 5 }}
        fillLinearGradientColorStops={[0, 'rgba(100,100,110,0.15)', 1, 'rgba(140,140,150,0.3)']}
        cornerRadius={2} />

      {/* Door panel */}
      <Rect x={xPx + depth} y={0} width={wPx - depth * 2} height={hPx}
        {...baseFill}
        stroke="rgba(0,0,0,0.2)" strokeWidth={1} />

      {/* 3D edge highlights */}
      <Line points={[xPx + depth + 1, 1, xPx + wPx - depth - 1, 1]}
        stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
      <Line points={[xPx + depth + 1, 1, xPx + depth + 1, hPx - 1]}
        stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

      {/* Front finish overlay */}
      <FrontFinishOverlay finish={frontFinish} x={xPx + depth} w={wPx - depth * 2} h={hPx} />

      {/* Recessed handle — metallic */}
      <Handle x={xPx + wPx / 2 - 2.5} y={hPx / 2 - 24} w={5} h={48} />

      {/* Separation strips */}
      {strips && strips.positions.map((yCm, i) => {
        const yPx = cmToPx(yCm)
        return (
          <Group key={i}>
            <Rect x={xPx + 4} y={yPx - 1.5} width={wPx - 8} height={3}
              fill={stripColor} cornerRadius={1} />
            <Line points={[xPx + 6, yPx - 1.5, xPx + wPx - 6, yPx - 1.5]}
              stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
          </Group>
        )
      })}

      {/* Door width label */}
      <Text text={`${Math.round(wPx / 3.5)}`} x={xPx + wPx / 2 - 8} y={hPx - 18}
        fontSize={9} fill="rgba(255,255,255,0.25)" />
    </Group>
  )
}

// ── External Drawer (below doors in hinge closets) ──────────

function ExternalDrawerBlock({
  xPx, yPx, wPx, totalHeight, color,
}: {
  xPx: number; yPx: number; wPx: number; totalHeight: number; color: string
}) {
  const hPx = cmToPx(totalHeight)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  return (
    <Group y={yPx}>
      <Rect x={xPx} y={0} width={wPx} height={hPx}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: hPx }}
        fillLinearGradientColorStops={[
          0, `rgba(${Math.min(255, r + 15)},${Math.min(255, g + 15)},${Math.min(255, b + 15)},0.92)`,
          1, `rgba(${Math.max(0, r - 10)},${Math.max(0, g - 10)},${Math.max(0, b - 10)},0.95)`,
        ]}
        stroke="rgba(0,0,0,0.2)" strokeWidth={1} cornerRadius={2} />
      {/* Inset panel */}
      <Rect x={xPx + 4} y={3} width={Math.max(1, wPx - 8)} height={Math.max(1, hPx - 6)}
        fill="rgba(0,0,0,0.08)" cornerRadius={2} />
      {/* Handle */}
      <Handle x={xPx + wPx / 2 - 16} y={hPx / 2 - 3} w={32} h={6} />
      {/* Top highlight */}
      <Line points={[xPx + 2, 1, xPx + wPx - 2, 1]}
        stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
    </Group>
  )
}

// ── Main component ──────────────────────────────────────────

export default function ExternalView({ closet }: Props) {
  const innerHeight = getInnerHeight(closet.dimensions)
  const wall = cmToPx(WALL_THICKNESS)

  const doorPositions: { xCm: number; widthCm: number }[] = []
  let doorXCursor = 0
  for (let i = 0; i < closet.doors.count; i++) {
    doorPositions.push({ xCm: doorXCursor, widthCm: closet.doors.widths[i] })
    doorXCursor += closet.doors.widths[i]
  }

  const doorToSection = new Map<number, typeof closet.sections[0]>()
  for (const sec of closet.sections) {
    for (const di of sec.doorIndices) {
      doorToSection.set(di, sec)
    }
  }

  const renderedSections = new Set<string>()

  return (
    <Group>
      {doorPositions.map((door, doorIdx) => {
        const section = doorToSection.get(doorIdx)
        if (!section) return null

        const doorXpx = cmToPx(door.xCm + WALL_THICKNESS)
        const doorWpx = cmToPx(door.widthCm)
        const doorHeightCm = computeDoorHeightForSection(section, innerHeight)
        const doorYOffsetCm = computeDoorYOffset(section)
        const doorHpx = cmToPx(doorHeightCm)
        const doorYpx = cmToPx(closet.dimensions.height - WALL_THICKNESS - doorYOffsetCm) - doorHpx

        let externalDrawerNode = null
        if (!renderedSections.has(section.id)) {
          renderedSections.add(section.id)
          const externalDrawers = section.elements.filter(
            (el): el is DrawerElement =>
              (el.kind === 'drawer-pair' || el.kind === 'drawer-single')
              && el.placement === 'external',
          )
          const externalDrawerTotalH = externalDrawers.reduce((sum, d) => sum + d.height, 0)

          if (externalDrawerTotalH > 0) {
            const firstDoorIdx = section.doorIndices[0]
            const lastDoorIdx = section.doorIndices[section.doorIndices.length - 1]
            const secXpx = cmToPx(doorPositions[firstDoorIdx].xCm + WALL_THICKNESS)
            const secEndXcm = doorPositions[lastDoorIdx].xCm + doorPositions[lastDoorIdx].widthCm
            const secWpx = cmToPx(secEndXcm + WALL_THICKNESS) - secXpx
            const drawerYpx = cmToPx(closet.dimensions.height - WALL_THICKNESS) - cmToPx(externalDrawerTotalH)

            externalDrawerNode = (
              <ExternalDrawerBlock
                xPx={secXpx} yPx={drawerYpx} wPx={secWpx}
                totalHeight={externalDrawerTotalH}
                color={closet.frontMaterial.color}
              />
            )
          }
        }

        return (
          <Group key={`door-${doorIdx}`}>
            {externalDrawerNode}
            {closet.closetType === 'hinge' ? (
              <HingeDoor
                xPx={doorXpx} wPx={doorWpx} hPx={doorHpx} yOffsetPx={doorYpx}
                doorIndex={doorIdx}
                handleStyle={closet.doors.handleStyle}
                centerHandleDoorIndex={closet.doors.centerHandleDoorIndex}
                frontFinish={closet.frontFinish}
                materialColor={closet.frontMaterial.color}
              />
            ) : (
              <SlidingDoor
                xPx={doorXpx} wPx={doorWpx} hPx={doorHpx}
                doorIndex={doorIdx}
                frontFinish={closet.frontFinish}
                materialColor={closet.frontMaterial.color}
                strips={closet.doors.strips}
              />
            )}
          </Group>
        )
      })}

      {/* Front finish label */}
      {closet.frontFinish !== 'standard' && (
        <Text
          text={`חזית: ${FRONT_FINISH_LABELS[closet.frontFinish]}`}
          x={wall + 8}
          y={cmToPx(closet.dimensions.height) + 52}
          fontSize={10}
          fill="rgba(210,200,170,0.5)"
        />
      )}
    </Group>
  )
}
