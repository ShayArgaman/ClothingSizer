// ============================================================
// Closet Configurator — Utility Functions
// ============================================================

import type {
  ClosetType,
  ClosetDimensions,
  DoorConfig,
  Section,
  SectionElement,
  ShelfElement,
  DrawerElement,
  ElementKind,
  DrawerPlacement,
} from '../types/closet.types'

import {
  DEFAULT_DEPTH,
  HINGE_DOOR_BASE_WIDTH,
  HINGE_DOOR_MIN_WIDTH,
  HINGE_DOOR_MAX_WIDTH,
  SLIDING_DOOR_MIN_WIDTH,
  SLIDING_DOOR_MAX_WIDTH,
  SLIDING_3_DOOR_MIN_WIDTH,
  STRUCTURAL_SHELF_DEFAULT_Y,
  SHELF_THICKNESS,
  DRAWER_PAIR_DEFAULT_HEIGHT,
  DRAWER_SINGLE_DEFAULT_HEIGHT,
  WALL_THICKNESS,
  DIVIDER_THICKNESS,
} from '../types/closet.types'

// ── ID Generation ───────────────────────────────────────────

let _idCounter = 0
export function genId(prefix = 'el'): string {
  return `${prefix}_${Date.now()}_${++_idCounter}`
}

// ── Depth ───────────────────────────────────────────────────

export function getDefaultDepth(closetType: ClosetType): number {
  return DEFAULT_DEPTH[closetType]
}

export function clampDepth(depth: number): number {
  return Math.max(50, Math.min(60, depth))
}

// ── Inner Width ─────────────────────────────────────────────

/** Usable inner width after subtracting outer walls */
export function getInnerWidth(dimensions: ClosetDimensions): number {
  return dimensions.width - 2 * WALL_THICKNESS
}

/** Usable inner height (floor to ceiling inside) */
export function getInnerHeight(dimensions: ClosetDimensions): number {
  return dimensions.height - 2 * WALL_THICKNESS
}

// ── Door Configuration Logic ────────────────────────────────

/**
 * Returns the valid door counts for a given closet type and width.
 */
export function getValidDoorCounts(
  closetType: ClosetType,
  width: number,
): number[] {
  const inner = width - 2 * WALL_THICKNESS

  if (closetType === 'hinge') {
    const counts: number[] = []
    // Door width must be between HINGE_DOOR_MIN_WIDTH and HINGE_DOOR_MAX_WIDTH
    const minDoors = Math.max(1, Math.ceil(inner / HINGE_DOOR_MAX_WIDTH))
    const maxDoors = Math.floor(inner / HINGE_DOOR_MIN_WIDTH)
    for (let n = minDoors; n <= maxDoors; n++) {
      counts.push(n)
    }
    return counts.length > 0 ? counts : [1]
  }

  // Sliding
  if (inner < SLIDING_3_DOOR_MIN_WIDTH - 2 * WALL_THICKNESS) {
    return [2]
  }
  return [2, 3]
}

/**
 * Returns the "ideal" default door count for a given closet type & width.
 */
export function getDefaultDoorCount(
  closetType: ClosetType,
  width: number,
): number {
  const inner = width - 2 * WALL_THICKNESS

  if (closetType === 'hinge') {
    // Default: try to use base width of 40cm
    const ideal = Math.round(inner / HINGE_DOOR_BASE_WIDTH)
    const valid = getValidDoorCounts(closetType, width)
    // Pick the valid count closest to ideal
    return valid.reduce((best, v) =>
      Math.abs(v - ideal) < Math.abs(best - ideal) ? v : best
    )
  }

  // Sliding: default to 2
  return 2
}

/**
 * Compute equal door widths for a given count.
 */
export function computeEqualDoorWidths(
  closetType: ClosetType,
  innerWidth: number,
  count: number,
): number[] {
  const baseWidth = Math.floor(innerWidth / count)
  const remainder = innerWidth - baseWidth * count
  // Distribute remainder across leftmost doors (1cm each)
  return Array.from({ length: count }, (_, i) =>
    i < remainder ? baseWidth + 1 : baseWidth
  )
}

/**
 * Validate that door widths are within allowed ranges.
 * Returns an adjusted copy if needed.
 */
export function clampDoorWidths(
  closetType: ClosetType,
  widths: number[],
  innerWidth: number,
): number[] {
  const [min, max] = closetType === 'hinge'
    ? [HINGE_DOOR_MIN_WIDTH, HINGE_DOOR_MAX_WIDTH]
    : [SLIDING_DOOR_MIN_WIDTH, SLIDING_DOOR_MAX_WIDTH]

  let result = widths.map(w => Math.max(min, Math.min(max, w)))
  // Adjust last door to absorb rounding
  const sum = result.reduce((a, b) => a + b, 0)
  if (sum !== innerWidth) {
    result[result.length - 1] += innerWidth - sum
  }
  return result
}

/**
 * Adjust door widths after the user changes one door's width.
 *
 * Strategy: lock the edited door at its new width, then distribute
 * the remaining inner width equally among the other doors, respecting
 * min/max constraints. If the new width is invalid, clamp it.
 *
 * Returns the full widths array (all doors).
 */
export function adjustDoorWidth(
  closetType: ClosetType,
  currentWidths: number[],
  editedIndex: number,
  newWidth: number,
  innerWidth: number,
): number[] {
  const [min, max] = closetType === 'hinge'
    ? [HINGE_DOOR_MIN_WIDTH, HINGE_DOOR_MAX_WIDTH]
    : [SLIDING_DOOR_MIN_WIDTH, SLIDING_DOOR_MAX_WIDTH]

  const count = currentWidths.length
  if (count <= 1) return [innerWidth]

  // Clamp the edited door
  const clamped = Math.max(min, Math.min(max, newWidth))
  const remaining = innerWidth - clamped
  const othersCount = count - 1

  // Each other door gets an equal share of the remaining space
  const perOther = Math.floor(remaining / othersCount)
  const extraRemainder = remaining - perOther * othersCount

  // Check if the per-other width is valid
  if (perOther < min || perOther > max) {
    // Can't fit — return current widths unchanged
    return currentWidths
  }

  const result = currentWidths.map((w, i) => {
    if (i === editedIndex) return clamped
    return perOther
  })

  // Distribute leftover cm to the last non-edited door
  const lastOtherIdx = editedIndex === count - 1 ? count - 2 : count - 1
  result[lastOtherIdx] += extraRemainder

  // Final clamp check
  const finalClamped = result.map(w => Math.max(min, Math.min(max, w)))
  const finalSum = finalClamped.reduce((a, b) => a + b, 0)
  if (finalSum !== innerWidth) {
    // Absorb difference in last door
    finalClamped[finalClamped.length - 1] += innerWidth - finalSum
  }

  return finalClamped
}

// ── Section Derivation from Doors ───────────────────────────

/**
 * Derive vertical sections from the door configuration.
 * Each door maps to one section. The section inner width equals the
 * door width minus any shared dividers between adjacent sections.
 */
export function deriveSections(
  doors: DoorConfig,
  dimensions: ClosetDimensions,
  existingSections?: Section[],
): Section[] {
  const innerHeight = getInnerHeight(dimensions)
  let xCursor = 0 // relative to inner left edge

  return doors.widths.map((doorWidth, index) => {
    const isFirst = index === 0
    const isLast = index === doors.count - 1

    // Each section has a divider on its right side (except the last)
    const dividerRight = isLast ? 0 : DIVIDER_THICKNESS

    // Section usable width = door width minus its share of dividers
    // First section: no left divider. Last: no right divider.
    const sectionWidth = doorWidth - (isLast ? 0 : DIVIDER_THICKNESS / 2) - (isFirst ? 0 : DIVIDER_THICKNESS / 2)

    const existing = existingSections?.find(s => s.index === index)

    const section: Section = {
      id: existing?.id ?? genId('sec'),
      index,
      x: xCursor + (isFirst ? 0 : DIVIDER_THICKNESS / 2),
      width: sectionWidth,
      elements: existing?.elements ?? [],
      structuralShelfY: existing?.structuralShelfY
        ?? computeStructuralShelfY(innerHeight),
    }

    xCursor += doorWidth

    return section
  })
}

/**
 * Compute the default structural shelf Y.
 * For closets < 200cm, place at the top instead of at 80cm.
 */
export function computeStructuralShelfY(innerHeight: number): number {
  if (innerHeight <= 200) {
    // For very short closets, structural shelf near the top
    return innerHeight - SHELF_THICKNESS - 20
  }
  return STRUCTURAL_SHELF_DEFAULT_Y
}

// ── Equal Shelf Distribution ────────────────────────────────

/**
 * Redistribute all movable shelves in a section to create equal
 * vertical gaps. Respects fixed elements (structural shelf, drawer
 * blocks) as immovable boundaries.
 *
 * Algorithm:
 * 1. Collect all fixed vertical boundaries (floor, ceiling, structural
 *    shelf, drawer blocks).
 * 2. Sort them to identify "zones" of free space.
 * 3. For each zone, count the movable shelves that currently fall
 *    within it.
 * 4. Redistribute those shelves evenly within the zone.
 */
export function distributeShelvesEqually(
  section: Section,
  innerHeight: number,
): SectionElement[] {
  const elements = [...section.elements]

  // Separate fixed boundaries and movable shelves
  const fixedBoundaries = collectFixedBoundaries(elements, innerHeight, section.structuralShelfY)
  const movableShelves = elements.filter(
    (el): el is ShelfElement => el.kind === 'shelf' && !el.fixed && !el.isStructural
  )

  if (movableShelves.length === 0) return elements

  // Sort boundaries ascending by Y
  const sorted = [...fixedBoundaries].sort((a, b) => a.y - b.y)

  // Build zones between consecutive boundaries
  const zones: { bottom: number; top: number }[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const bottom = sorted[i].y + sorted[i].height
    const top = sorted[i + 1].y
    if (top - bottom > SHELF_THICKNESS) {
      zones.push({ bottom, top })
    }
  }

  // Assign each movable shelf to the zone it currently belongs to
  // (by its Y center). If it doesn't fit any zone, assign to nearest.
  const zoneAssignments = new Map<number, ShelfElement[]>()
  zones.forEach((_, zi) => zoneAssignments.set(zi, []))

  for (const shelf of movableShelves) {
    const center = shelf.y + shelf.height / 2
    let bestZone = 0
    let bestDist = Infinity
    for (let zi = 0; zi < zones.length; zi++) {
      const zoneCenter = (zones[zi].bottom + zones[zi].top) / 2
      const dist = Math.abs(center - zoneCenter)
      if (dist < bestDist) {
        bestDist = dist
        bestZone = zi
      }
    }
    zoneAssignments.get(bestZone)!.push(shelf)
  }

  // Redistribute shelves within each zone
  for (let zi = 0; zi < zones.length; zi++) {
    const shelves = zoneAssignments.get(zi)!
    if (shelves.length === 0) continue

    const zone = zones[zi]
    const availableHeight = zone.top - zone.bottom
    const totalShelfThickness = shelves.length * SHELF_THICKNESS
    const freeSpace = availableHeight - totalShelfThickness
    const gap = freeSpace / (shelves.length + 1)

    // Sort shelves by current Y so IDs stay roughly ordered
    shelves.sort((a, b) => a.y - b.y)

    for (let si = 0; si < shelves.length; si++) {
      shelves[si].y = zone.bottom + gap * (si + 1) + SHELF_THICKNESS * si
    }
  }

  // Rebuild elements array preserving order
  const shelfIds = new Set(movableShelves.map(s => s.id))
  return elements.map(el => {
    if (shelfIds.has(el.id)) {
      return movableShelves.find(s => s.id === el.id)!
    }
    return el
  })
}

interface Boundary {
  y: number
  height: number
}

/**
 * Collect all immovable vertical boundaries in a section.
 */
function collectFixedBoundaries(
  elements: SectionElement[],
  innerHeight: number,
  structuralShelfY: number,
): Boundary[] {
  const boundaries: Boundary[] = [
    // Floor
    { y: 0, height: 0 },
    // Ceiling
    { y: innerHeight, height: 0 },
  ]

  for (const el of elements) {
    if (el.fixed) {
      boundaries.push({ y: el.y, height: el.height })
    }
    // Drawer blocks are treated as fixed boundaries for distribution
    if (el.kind === 'drawer-pair' || el.kind === 'drawer-single') {
      boundaries.push({ y: el.y, height: el.height })
    }
  }

  // Ensure structural shelf is represented
  const hasStructural = elements.some(
    el => el.kind === 'shelf' && (el as ShelfElement).isStructural
  )
  if (!hasStructural) {
    boundaries.push({ y: structuralShelfY, height: SHELF_THICKNESS })
  }

  return boundaries
}

// ── Drawer Stacking & Auto-Cover ────────────────────────────

/**
 * After adding or moving a drawer, call this to:
 * 1. Snap adjacent drawers into a contiguous block.
 * 2. Ensure a mandatory cover shelf sits directly on top of the
 *    topmost drawer in each block.
 *
 * Returns the updated element list for the section.
 */
export function enforceDrawerRules(
  elements: SectionElement[],
  innerHeight: number,
): SectionElement[] {
  let result = [...elements]

  // 1. Identify all drawers, sorted bottom-to-top
  const drawers = result
    .filter((el): el is DrawerElement =>
      el.kind === 'drawer-pair' || el.kind === 'drawer-single')
    .sort((a, b) => a.y - b.y)

  if (drawers.length === 0) return result

  // 2. Stack drawers into contiguous blocks
  const blocks = buildDrawerBlocks(drawers)

  // 3. Snap drawers within each block so they're contiguous
  for (const block of blocks) {
    let cursor = block[0].y
    for (const drawer of block) {
      drawer.y = cursor
      cursor += drawer.height
    }
  }

  // 4. For each block, ensure a cover shelf exists directly above
  for (const block of blocks) {
    const topDrawer = block[block.length - 1]
    const coverY = topDrawer.y + topDrawer.height
    const coverId = `cover_${block[0].id}`

    // Check if a cover shelf already exists at this position
    const existingCover = result.find(
      el => el.kind === 'shelf' && el.fixed && Math.abs(el.y - coverY) < 1
    )

    if (!existingCover && coverY + SHELF_THICKNESS <= innerHeight) {
      const coverShelf: ShelfElement = {
        id: coverId,
        kind: 'shelf',
        y: coverY,
        height: SHELF_THICKNESS,
        fixed: true,
        isStructural: false,
      }
      result.push(coverShelf)
    } else if (existingCover) {
      // Adjust position if it drifted
      existingCover.y = coverY
    }
  }

  // 5. Clean up orphaned cover shelves (covers whose drawer block no longer exists)
  const validCoverYs = new Set(
    blocks.map(block => {
      const top = block[block.length - 1]
      return Math.round(top.y + top.height)
    })
  )

  result = result.filter(el => {
    if (el.kind === 'shelf' && el.fixed && !(el as ShelfElement).isStructural) {
      // This is a cover shelf — keep it only if it matches a block top
      return validCoverYs.has(Math.round(el.y))
    }
    return true
  })

  return result
}

/**
 * Group drawers into contiguous blocks. Two drawers belong to the
 * same block if the gap between them is ≤ SNAP_TOLERANCE cm.
 */
const DRAWER_SNAP_TOLERANCE = 5 // cm

function buildDrawerBlocks(drawers: DrawerElement[]): DrawerElement[][] {
  if (drawers.length === 0) return []

  const blocks: DrawerElement[][] = [[drawers[0]]]

  for (let i = 1; i < drawers.length; i++) {
    const prev = drawers[i - 1]
    const curr = drawers[i]
    const gap = curr.y - (prev.y + prev.height)

    if (gap <= DRAWER_SNAP_TOLERANCE) {
      // Same block
      blocks[blocks.length - 1].push(curr)
    } else {
      // New block
      blocks.push([curr])
    }
  }

  return blocks
}

// ── External Drawer → Door Height ───────────────────────────

/**
 * For hinge closets, compute the effective door height for a section
 * after subtracting the total height of external drawers in that section.
 *
 * External drawers sit at the bottom of the closet, below the doors.
 * Door Height = Inner Height - Total External Drawer Height
 */
export function computeDoorHeightForSection(
  section: Section,
  innerHeight: number,
): number {
  const externalDrawerHeight = section.elements
    .filter((el): el is DrawerElement =>
      (el.kind === 'drawer-pair' || el.kind === 'drawer-single')
      && el.placement === 'external'
    )
    .reduce((sum, d) => sum + d.height, 0)

  return innerHeight - externalDrawerHeight
}

/**
 * Compute the Y offset where the door starts (above external drawers).
 * External drawers stack from the bottom up.
 */
export function computeDoorYOffset(section: Section): number {
  return section.elements
    .filter((el): el is DrawerElement =>
      (el.kind === 'drawer-pair' || el.kind === 'drawer-single')
      && el.placement === 'external'
    )
    .reduce((sum, d) => sum + d.height, 0)
}

// ── Element Factory ─────────────────────────────────────────

/**
 * Create a new section element of the given kind at position Y.
 */
export function createElement(
  kind: ElementKind,
  y: number,
  options?: {
    placement?: DrawerPlacement
    fixed?: boolean
    isStructural?: boolean
  },
): SectionElement {
  const base = {
    id: genId(kind),
    y,
    fixed: options?.fixed ?? false,
  }

  switch (kind) {
    case 'shelf':
      return {
        ...base,
        kind: 'shelf',
        height: SHELF_THICKNESS,
        isStructural: options?.isStructural ?? false,
      }

    case 'hanging-rail':
      return {
        ...base,
        kind: 'hanging-rail',
        height: 100,
      }

    case 'servetto':
      return {
        ...base,
        kind: 'servetto',
        height: 100,
        clearanceAbove: 60,
      }

    case 'drawer-pair':
      return {
        ...base,
        kind: 'drawer-pair',
        height: DRAWER_PAIR_DEFAULT_HEIGHT,
        placement: options?.placement ?? 'internal',
      }

    case 'drawer-single':
      return {
        ...base,
        kind: 'drawer-single',
        height: DRAWER_SINGLE_DEFAULT_HEIGHT,
        placement: options?.placement ?? 'internal',
      }

    case 'shoe-rack':
      return {
        ...base,
        kind: 'shoe-rack',
        height: 25,
      }
  }
}

/**
 * Create the initial structural shelf for a section.
 */
export function createStructuralShelf(y: number): ShelfElement {
  return {
    id: genId('structural'),
    kind: 'shelf',
    y,
    height: SHELF_THICKNESS,
    fixed: true,
    isStructural: true,
  }
}
