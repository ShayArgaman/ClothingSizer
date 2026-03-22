// ============================================================
// SectionColumn — renders all elements within one section.
//
// Positioned at the section's X offset inside the closet frame.
// Uses a Konva Group with clipFunc to visually contain elements
// within the section boundaries.
//
// Handles:
//  - Rendering all SectionElements via ElementNode
//  - Section-level error highlighting (red border on section)
//  - Drop zone visual feedback
//  - Section header label
// ============================================================

import { Group, Rect, Text, Line } from 'react-konva'
import { cmToPx } from '../../utils/dimensions'
import { WALL_THICKNESS } from '../../types/closet.types'
import type { Section, ValidationError } from '../../types/closet.types'
import { errorsForElement } from '../../utils/closetValidation'
import ElementNode from './ElementNode'

interface Props {
  section: Section
  innerHeight: number
  bodyColor: string
  selectedElementId: string | null
  validationErrors: ValidationError[]
  onSelectElement: (sectionId: string, elementId: string) => void
  onMoveElement: (sectionId: string, elementId: string, newY: number) => void
  onResizeElement: (sectionId: string, elementId: string, newHeight: number) => void
  onSelectSection: (sectionId: string) => void
}

export default function SectionColumn({
  section,
  innerHeight,
  bodyColor,
  selectedElementId,
  validationErrors,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onSelectSection,
}: Props) {
  const xPx = cmToPx(section.x + WALL_THICKNESS)
  const wPx = cmToPx(section.width)
  const hPx = cmToPx(innerHeight)

  const sectionHasErrors = validationErrors.some(
    e => e.sectionId === section.id && e.severity === 'error',
  )

  // Sort elements bottom-to-top for consistent rendering order
  const sortedElements = [...section.elements].sort((a, b) => a.y - b.y)

  return (
    <Group x={xPx} y={cmToPx(WALL_THICKNESS)}>
      {/* Section background — subtle depth gradient, clickable to select */}
      <Rect
        width={wPx} height={hPx}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: hPx }}
        fillLinearGradientColorStops={[0, 'rgba(255,255,255,0.012)', 0.5, 'transparent', 1, 'rgba(0,0,0,0.02)']}
        onClick={() => onSelectSection(section.id)}
        onTap={() => onSelectSection(section.id)}
      />

      {/* Section error border */}
      {sectionHasErrors && (
        <Rect
          width={wPx} height={hPx}
          stroke="rgba(239,68,68,0.35)" strokeWidth={2}
          fill="rgba(239,68,68,0.03)"
          cornerRadius={2}
          listening={false}
          dash={[8, 4]}
        />
      )}

      {/* Section label */}
      <Text
        text={`תא ${section.index + 1}`}
        x={4} y={4}
        fontSize={9}
        fill="rgba(148,163,184,0.35)"
        listening={false}
      />

      {/* Section width dimension */}
      <Group listening={false} y={-14}>
        <Line points={[0, 0, wPx, 0]} stroke="#60a5fa" strokeWidth={0.6} opacity={0.4} />
        <Line points={[0, -4, 0, 4]} stroke="#60a5fa" strokeWidth={0.6} opacity={0.4} />
        <Line points={[wPx, -4, wPx, 4]} stroke="#60a5fa" strokeWidth={0.6} opacity={0.4} />
        <Text text={`${Math.round(section.width)}`} x={wPx / 2 - 8} y={-12}
          fontSize={9} fill="#93c5fd" opacity={0.6} />
      </Group>

      {/* Elements — rendered inside a clip group */}
      <Group
        clipX={0} clipY={0} clipWidth={wPx} clipHeight={hPx}
      >
        {sortedElements.map(el => {
          const elErrors = errorsForElement(validationErrors, el.id)
          return (
            <ElementNode
              key={el.id}
              element={el}
              sectionWidth={section.width}
              color={bodyColor}
              isSelected={selectedElementId === el.id}
              hasError={elErrors.length > 0}
              onSelect={() => onSelectElement(section.id, el.id)}
              onMove={(newY) => onMoveElement(section.id, el.id, newY)}
              onResize={(newH) => onResizeElement(section.id, el.id, newH)}
            />
          )
        })}
      </Group>
    </Group>
  )
}
