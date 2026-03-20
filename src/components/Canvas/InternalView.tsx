// ============================================================
// InternalView — renders the interior of the closet.
//
// Shows: section columns with their elements (shelves, drawers,
//        hanging rails, servetto, shoe racks), section dividers,
//        structural shelves.
//
// This is the primary editing view where users place and
// arrange internal components.
// ============================================================

import { Group } from 'react-konva'
import type { ClosetConfig, ValidationError } from '../../types/closet.types'
import { WALL_THICKNESS, DIVIDER_THICKNESS } from '../../types/closet.types'
import { getInnerHeight } from '../../utils/closetUtils'
import SectionColumn from './SectionColumn'
import { SectionDivider } from './CanvasOverlays'

interface Props {
  closet: ClosetConfig
  selectedElementId: string | null
  validationErrors: ValidationError[]
  onSelectElement: (sectionId: string, elementId: string) => void
  onMoveElement: (sectionId: string, elementId: string, newY: number) => void
  onResizeElement: (sectionId: string, elementId: string, newHeight: number) => void
  onSelectSection: (sectionId: string) => void
}

export default function InternalView({
  closet,
  selectedElementId,
  validationErrors,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onSelectSection,
}: Props) {
  const innerHeight = getInnerHeight(closet.dimensions)

  // Compute divider X positions (between adjacent sections)
  const dividerPositions: { xCm: number; label: string }[] = []
  for (let i = 0; i < closet.sections.length - 1; i++) {
    const sec = closet.sections[i]
    const xCm = WALL_THICKNESS + sec.x + sec.width + DIVIDER_THICKNESS / 2
    dividerPositions.push({
      xCm,
      label: `${i + 1} | ${i + 2}`,
    })
  }

  return (
    <Group>
      {/* Section dividers */}
      {dividerPositions.map((div, i) => (
        <SectionDivider
          key={`div-${i}`}
          xCm={div.xCm}
          heightCm={closet.dimensions.height}
        />
      ))}

      {/* Section columns with elements */}
      {closet.sections.map(section => (
        <SectionColumn
          key={section.id}
          section={section}
          innerHeight={innerHeight}
          bodyColor={closet.bodyMaterial.color}
          selectedElementId={selectedElementId}
          validationErrors={validationErrors}
          onSelectElement={onSelectElement}
          onMoveElement={onMoveElement}
          onResizeElement={onResizeElement}
          onSelectSection={onSelectSection}
        />
      ))}
    </Group>
  )
}
