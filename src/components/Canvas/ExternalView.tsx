// ============================================================
// ExternalView — renders the exterior of the closet.
//
// Shows: doors (hinge or sliding), handles, separation strips,
//        external drawers (hinge only), front finish overlays.
//
// Key feature: door height per section is dynamically computed
// to account for external drawers sitting below the doors.
//
// Door Height = Inner Height - External Drawer Height
// ============================================================

import { Group, Rect, Text } from 'react-konva'
import type { ClosetConfig, DrawerElement, HandleStyle } from '../../types/closet.types'
import { WALL_THICKNESS, FRONT_FINISH_LABELS } from '../../types/closet.types'
import { getInnerHeight, computeDoorHeightForSection, computeDoorYOffset } from '../../utils/closetUtils'
import { cmToPx } from '../../utils/dimensions'

interface Props {
  closet: ClosetConfig
}

// ── Front finish color overlays ─────────────────────────────

function getFrontFillProps(finish: string, w: number, h: number) {
  switch (finish) {
    case 'clear-glass':
      return {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: w, y: h },
        fillLinearGradientColorStops: [
          0, 'rgba(185,205,230,0.22)',
          0.25, 'rgba(235,245,255,0.14)',
          0.6, 'rgba(200,218,240,0.18)',
          1, 'rgba(165,185,215,0.20)',
        ],
      }
    case 'frosted-glass':
      return {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: w, y: h },
        fillLinearGradientColorStops: [
          0, 'rgba(180,190,200,0.30)',
          0.5, 'rgba(200,210,220,0.20)',
          1, 'rgba(170,180,195,0.28)',
        ],
      }
    case 'bronze':
      return {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: w, y: h },
        fillLinearGradientColorStops: [
          0, 'rgba(180,140,80,0.22)',
          0.5, 'rgba(200,160,90,0.16)',
          1, 'rgba(160,120,70,0.24)',
        ],
      }
    case 'gold':
      return {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: w, y: h },
        fillLinearGradientColorStops: [
          0, 'rgba(220,190,100,0.25)',
          0.5, 'rgba(240,210,120,0.18)',
          1, 'rgba(200,170,80,0.28)',
        ],
      }
    default: // standard
      return { fill: 'rgba(195,180,158,0.10)' }
  }
}

// ── Hinge Door Panel ────────────────────────────────────────

function HingeDoor({
  xPx, wPx, hPx, yOffsetPx,
  doorIndex, handleStyle, centerHandleDoorIndex,
  frontFinish,
}: {
  xPx: number; wPx: number; hPx: number; yOffsetPx: number
  doorIndex: number; handleStyle: HandleStyle; centerHandleDoorIndex: number | null
  frontFinish: string
}) {
  const fillProps = getFrontFillProps(frontFinish, wPx, hPx)

  // Hinge side: even doors hinge left, odd doors hinge right (alternating)
  const hingeOnLeft = doorIndex % 2 === 0
  const hingeX = hingeOnLeft ? xPx + 2 : xPx + wPx - 6
  const handleX = hingeOnLeft ? xPx + wPx - 10 : xPx + 4

  // Handle rendering
  const isCenter = handleStyle === 'center' && centerHandleDoorIndex === doorIndex
  const showHandle = handleStyle !== 'center' || isCenter

  return (
    <Group y={yOffsetPx}>
      {/* Door panel */}
      <Rect x={xPx} y={0} width={wPx} height={hPx}
        {...fillProps}
        stroke="rgba(195,180,158,0.45)" strokeWidth={1.5} />

      {/* Hinges */}
      {[hPx * 0.12, hPx * 0.5, hPx * 0.88].map((hy, i) => (
        <Rect key={i} x={hingeX} y={hy - 9} width={4} height={18}
          fill="rgba(210,200,170,0.65)" cornerRadius={1} />
      ))}

      {/* Handle */}
      {showHandle && handleStyle === 'point' && (
        <Rect x={handleX + 1} y={hPx / 2 - 4} width={4} height={8}
          fill="rgba(210,200,170,0.7)" cornerRadius={2} />
      )}
      {showHandle && handleStyle === 'long' && (
        <Rect x={handleX} y={hPx / 2 - 28} width={5} height={56}
          fill="rgba(210,200,170,0.6)" cornerRadius={2.5} />
      )}
      {showHandle && isCenter && (
        <Rect x={xPx + wPx / 2 - 2.5} y={hPx / 2 - 36} width={5} height={72}
          fill="rgba(210,200,170,0.75)" cornerRadius={2.5} />
      )}

      {/* Door width label */}
      <Text text={`${Math.round(wPx / 3.5)}`} x={xPx + wPx / 2 - 8} y={hPx - 16}
        fontSize={9} fill="rgba(210,200,170,0.4)" />
    </Group>
  )
}

// ── Sliding Door Panel ──────────────────────────────────────

function SlidingDoor({
  xPx, wPx, hPx,
  doorIndex,
  frontFinish,
  strips,
}: {
  xPx: number; wPx: number; hPx: number
  doorIndex: number
  frontFinish: string
  strips: { positions: number[]; material: string } | null
}) {
  const fillProps = getFrontFillProps(frontFinish, wPx, hPx)

  // Sliding doors overlap slightly — front door is slightly offset
  const isFront = doorIndex % 2 === 0
  const depth = isFront ? 0 : 2

  // Strip colors
  const stripColor = strips
    ? strips.material === 'nickel' ? 'rgba(180,180,190,0.6)'
      : strips.material === 'white' ? 'rgba(230,230,235,0.5)'
      : 'rgba(200,200,210,0.55)' // silver
    : 'transparent'

  return (
    <Group>
      {/* Rail tracks (top and bottom) */}
      <Rect x={xPx} y={1} width={wPx} height={4}
        fill="rgba(195,180,158,0.22)" cornerRadius={2} />
      <Rect x={xPx} y={hPx - 5} width={wPx} height={4}
        fill="rgba(195,180,158,0.22)" cornerRadius={2} />

      {/* Door panel */}
      <Rect x={xPx + depth} y={0} width={wPx - depth * 2} height={hPx}
        {...fillProps}
        stroke="rgba(195,180,158,0.35)" strokeWidth={1} />

      {/* Recessed handle */}
      <Rect x={xPx + wPx / 2 - 2} y={hPx / 2 - 22} width={4} height={44}
        fill="rgba(210,200,170,0.5)" cornerRadius={2} />

      {/* Separation strips */}
      {strips && strips.positions.map((yCm, i) => {
        const yPx = cmToPx(yCm)
        return (
          <Rect key={i} x={xPx + 4} y={yPx - 1.5} width={wPx - 8} height={3}
            fill={stripColor} cornerRadius={1} />
        )
      })}

      {/* Door width label */}
      <Text text={`${Math.round(wPx / 3.5)}`} x={xPx + wPx / 2 - 8} y={hPx - 16}
        fontSize={9} fill="rgba(210,200,170,0.4)" />
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

  return (
    <Group y={yPx}>
      <Rect x={xPx} y={0} width={wPx} height={hPx}
        fill={color} stroke="rgba(195,180,158,0.5)" strokeWidth={1} cornerRadius={2} />
      <Rect x={xPx + 4} y={3} width={wPx - 8} height={hPx - 6}
        fill="rgba(0,0,0,0.07)" cornerRadius={2} />
      <Rect x={xPx + wPx / 2 - 16} y={hPx / 2 - 3} width={32} height={6}
        fill="rgba(0,0,0,0.22)" cornerRadius={3} />
      <Text text="מגירה חיצונית" x={xPx + 4} y={hPx + 3}
        fontSize={8} fill="rgba(210,200,170,0.35)" />
    </Group>
  )
}

// ── Main component ──────────────────────────────────────────

export default function ExternalView({ closet }: Props) {
  const innerHeight = getInnerHeight(closet.dimensions)
  const wall = cmToPx(WALL_THICKNESS)

  // Build per-door X positions from the widths array
  const doorPositions: { xCm: number; widthCm: number }[] = []
  let doorXCursor = 0
  for (let i = 0; i < closet.doors.count; i++) {
    doorPositions.push({ xCm: doorXCursor, widthCm: closet.doors.widths[i] })
    doorXCursor += closet.doors.widths[i]
  }

  // Map each door index to its parent section (via section.doorIndices)
  const doorToSection = new Map<number, typeof closet.sections[0]>()
  for (const sec of closet.sections) {
    for (const di of sec.doorIndices) {
      doorToSection.set(di, sec)
    }
  }

  // Track which sections have already rendered their external drawers
  const renderedSections = new Set<string>()

  return (
    <Group>
      {doorPositions.map((door, doorIdx) => {
        const section = doorToSection.get(doorIdx)
        if (!section) return null

        const doorXpx = cmToPx(door.xCm + WALL_THICKNESS)
        const doorWpx = cmToPx(door.widthCm)

        // Door height is per-section (accounts for external drawers)
        const doorHeightCm = computeDoorHeightForSection(section, innerHeight)
        const doorYOffsetCm = computeDoorYOffset(section)
        const doorHpx = cmToPx(doorHeightCm)
        const doorYpx = cmToPx(closet.dimensions.height - WALL_THICKNESS - doorYOffsetCm) - doorHpx

        // External drawers — render once per section, spanning full section width
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
            // Section spans from its first door to its last door
            const firstDoorIdx = section.doorIndices[0]
            const lastDoorIdx = section.doorIndices[section.doorIndices.length - 1]
            const secXpx = cmToPx(doorPositions[firstDoorIdx].xCm + WALL_THICKNESS)
            const secEndXcm = doorPositions[lastDoorIdx].xCm + doorPositions[lastDoorIdx].widthCm
            const secWpx = cmToPx(secEndXcm + WALL_THICKNESS) - secXpx

            // External drawers sit at the bottom of the closet, just above the bottom wall
            const drawerYpx = cmToPx(closet.dimensions.height - WALL_THICKNESS) - cmToPx(externalDrawerTotalH)

            externalDrawerNode = (
              <ExternalDrawerBlock
                xPx={secXpx}
                yPx={drawerYpx}
                wPx={secWpx}
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
                xPx={doorXpx}
                wPx={doorWpx}
                hPx={doorHpx}
                yOffsetPx={doorYpx}
                doorIndex={doorIdx}
                handleStyle={closet.doors.handleStyle}
                centerHandleDoorIndex={closet.doors.centerHandleDoorIndex}
                frontFinish={closet.frontFinish}
              />
            ) : (
              <SlidingDoor
                xPx={doorXpx}
                wPx={doorWpx}
                hPx={doorHpx}
                doorIndex={doorIdx}
                frontFinish={closet.frontFinish}
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
