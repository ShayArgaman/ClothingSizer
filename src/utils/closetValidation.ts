// ============================================================
// Closet Configurator — Validation Engine
// ============================================================
//
// Pure function: takes the full ClosetConfig, returns an array
// of ValidationError objects. Each error carries:
//   - code:       machine-readable key (for filtering / grouping)
//   - message:    Hebrew user-facing string
//   - severity:   'error' (blocks save/export) | 'warning' (advisory)
//   - sectionId?: which section the problem is in
//   - elementId?: which element caused it
//
// The UI will use sectionId/elementId to highlight the exact
// offending element or section header.
// ============================================================

import type {
  ClosetConfig,
  Section,
  SectionElement,
  ShelfElement,
  DrawerElement,
  ServettoElement,
  ValidationError,
} from '../types/closet.types'

import {
  MIN_DEPTH,
  MAX_DEPTH,
  DEFAULT_DEPTH,
  HINGE_DOOR_MIN_WIDTH,
  HINGE_DOOR_MAX_WIDTH,
  SLIDING_DOOR_MIN_WIDTH,
  SLIDING_DOOR_MAX_WIDTH,
  SLIDING_3_DOOR_MIN_WIDTH,
  DRAWER_MIN_HEIGHT,
  DRAWER_MAX_HEIGHT,
  SHELF_THICKNESS,
  WALL_THICKNESS,
} from '../types/closet.types'

import { getInnerWidth, getInnerHeight } from './closetUtils'

// ── Public API ──────────────────────────────────────────────

export function validateCloset(closet: ClosetConfig): ValidationError[] {
  const errors: ValidationError[] = []

  validateDimensions(closet, errors)
  validateDepthByType(closet, errors)
  validateDoors(closet, errors)
  validateDoorWidthSum(closet, errors)

  for (const section of closet.sections) {
    validateSectionElements(closet, section, errors)
  }

  return errors
}

// ── Dimension Rules ─────────────────────────────────────────

function validateDimensions(
  closet: ClosetConfig,
  errors: ValidationError[],
): void {
  const { width, height, depth } = closet.dimensions

  if (width < 60) {
    errors.push({
      code: 'MIN_WIDTH',
      message: `רוחב הארון (${width} ס״מ) קטן מהמינימום המותר (60 ס״מ)`,
      severity: 'error',
    })
  }

  if (width > 600) {
    errors.push({
      code: 'MAX_WIDTH',
      message: `רוחב הארון (${width} ס״מ) חורג מהמקסימום המותר (600 ס״מ)`,
      severity: 'error',
    })
  }

  if (height < 100) {
    errors.push({
      code: 'MIN_HEIGHT',
      message: `גובה הארון (${height} ס״מ) קטן מהמינימום המותר (100 ס״מ)`,
      severity: 'error',
    })
  }

  if (height > 300) {
    errors.push({
      code: 'MAX_HEIGHT',
      message: `גובה הארון (${height} ס״מ) חורג מהמקסימום המותר (300 ס״מ)`,
      severity: 'error',
    })
  }

  if (depth < MIN_DEPTH) {
    errors.push({
      code: 'MIN_DEPTH',
      message: `עומק הארון (${depth} ס״מ) קטן מהמינימום המותר (${MIN_DEPTH} ס״מ)`,
      severity: 'error',
    })
  }

  if (depth > MAX_DEPTH) {
    errors.push({
      code: 'MAX_DEPTH',
      message: `עומק הארון (${depth} ס״מ) חורג מהמקסימום המותר (${MAX_DEPTH} ס״מ)`,
      severity: 'error',
    })
  }
}

// ── Depth vs Closet Type ────────────────────────────────────

function validateDepthByType(
  closet: ClosetConfig,
  errors: ValidationError[],
): void {
  const { depth } = closet.dimensions
  const standard = DEFAULT_DEPTH[closet.closetType]
  const typeLabel = closet.closetType === 'hinge' ? 'צירים' : 'הזזה'

  if (depth !== standard) {
    errors.push({
      code: 'DEPTH_NON_STANDARD',
      message: `העומק (${depth} ס״מ) שונה מהסטנדרט לארון ${typeLabel} (${standard} ס״מ)`,
      severity: 'warning',
    })
  }
}

// ── Door Validation ─────────────────────────────────────────

function validateDoors(
  closet: ClosetConfig,
  errors: ValidationError[],
): void {
  const { doors, closetType } = closet

  if (doors.count < 1) {
    errors.push({
      code: 'NO_DOORS',
      message: 'יש להגדיר לפחות דלת אחת',
      severity: 'error',
    })
    return
  }

  if (doors.widths.length !== doors.count) {
    errors.push({
      code: 'DOOR_WIDTH_COUNT_MISMATCH',
      message: `מספר רוחבי הדלתות (${doors.widths.length}) לא תואם למספר הדלתות (${doors.count})`,
      severity: 'error',
    })
  }

  if (closetType === 'hinge') {
    validateHingeDoors(closet, errors)
  } else {
    validateSlidingDoors(closet, errors)
  }

  // Center handle validation
  if (doors.handleStyle === 'center') {
    if (doors.centerHandleDoorIndex === null) {
      errors.push({
        code: 'CENTER_HANDLE_NO_DOOR',
        message: 'ידית מרכזית נבחרה אך לא הוגדרה דלת מרכזית',
        severity: 'warning',
      })
    } else if (doors.centerHandleDoorIndex < 0 || doors.centerHandleDoorIndex >= doors.count) {
      errors.push({
        code: 'CENTER_HANDLE_INVALID_INDEX',
        message: 'אינדקס הדלת לידית המרכזית מחוץ לטווח',
        severity: 'error',
      })
    }
  }
}

function validateHingeDoors(
  closet: ClosetConfig,
  errors: ValidationError[],
): void {
  const { doors } = closet

  for (let i = 0; i < doors.widths.length; i++) {
    const w = doors.widths[i]
    const doorLabel = `דלת ${i + 1}`

    if (w < HINGE_DOOR_MIN_WIDTH) {
      errors.push({
        code: 'HINGE_DOOR_TOO_NARROW',
        message: `${doorLabel}: רוחב ${w} ס״מ קטן מהמינימום לדלת צירים (${HINGE_DOOR_MIN_WIDTH} ס״מ)`,
        severity: 'error',
      })
    }

    if (w > HINGE_DOOR_MAX_WIDTH) {
      errors.push({
        code: 'HINGE_DOOR_TOO_WIDE',
        message: `${doorLabel}: רוחב ${w} ס״מ חורג מהמקסימום לדלת צירים (${HINGE_DOOR_MAX_WIDTH} ס״מ)`,
        severity: 'error',
      })
    }
  }
}

function validateSlidingDoors(
  closet: ClosetConfig,
  errors: ValidationError[],
): void {
  const { doors, dimensions } = closet
  const innerWidth = getInnerWidth(dimensions)

  for (let i = 0; i < doors.widths.length; i++) {
    const w = doors.widths[i]
    const doorLabel = `דלת ${i + 1}`

    if (w < SLIDING_DOOR_MIN_WIDTH) {
      errors.push({
        code: 'SLIDING_DOOR_TOO_NARROW',
        message: `${doorLabel}: רוחב ${w} ס״מ קטן מהמינימום לדלת הזזה (${SLIDING_DOOR_MIN_WIDTH} ס״מ)`,
        severity: 'error',
      })
    }

    if (w > SLIDING_DOOR_MAX_WIDTH) {
      errors.push({
        code: 'SLIDING_DOOR_TOO_WIDE',
        message: `${doorLabel}: רוחב ${w} ס״מ חורג מהמקסימום לדלת הזזה (${SLIDING_DOOR_MAX_WIDTH} ס״מ)`,
        severity: 'error',
      })
    }
  }

  // 3 sliding doors only allowed for closets >= 180cm wide
  if (doors.count >= 3 && dimensions.width < SLIDING_3_DOOR_MIN_WIDTH) {
    errors.push({
      code: 'SLIDING_3_DOORS_TOO_NARROW',
      message: `3 דלתות הזזה דורשות ארון ברוחב ${SLIDING_3_DOOR_MIN_WIDTH} ס״מ לפחות (רוחב נוכחי: ${dimensions.width} ס״מ)`,
      severity: 'error',
    })
  }
}

// ── Door Width Sum ──────────────────────────────────────────

function validateDoorWidthSum(
  closet: ClosetConfig,
  errors: ValidationError[],
): void {
  const innerWidth = getInnerWidth(closet.dimensions)
  const sum = closet.doors.widths.reduce((a, b) => a + b, 0)

  if (Math.abs(sum - innerWidth) > 1) {
    errors.push({
      code: 'DOOR_WIDTH_SUM_MISMATCH',
      message: `סכום רוחבי הדלתות (${sum} ס״מ) לא תואם את הרוחב הפנימי (${innerWidth} ס״מ)`,
      severity: 'error',
    })
  }
}

// ── Per-Section Element Validation ──────────────────────────

function validateSectionElements(
  closet: ClosetConfig,
  section: Section,
  errors: ValidationError[],
): void {
  const innerHeight = getInnerHeight(closet.dimensions)
  const sectionLabel = `סקציה ${section.index + 1}`

  // ── Structural shelf presence ──
  validateStructuralShelf(closet, section, innerHeight, sectionLabel, errors)

  // ── Per-element checks ──
  for (const el of section.elements) {
    validateElementBounds(el, section, innerHeight, sectionLabel, errors)
    validateDrawerConstraints(closet, el, section, sectionLabel, errors)
    validateServettoConstraints(el, section, innerHeight, sectionLabel, errors)
  }

  // ── Overlap detection ──
  validateOverlaps(section, sectionLabel, errors)

  // ── Drawer cover-shelf integrity ──
  validateDrawerCovers(section, innerHeight, sectionLabel, errors)
}

// ── Structural Shelf ────────────────────────────────────────

function validateStructuralShelf(
  _closet: ClosetConfig,
  section: Section,
  innerHeight: number,
  sectionLabel: string,
  errors: ValidationError[],
): void {
  const structural = section.elements.find(
    el => el.kind === 'shelf' && (el as ShelfElement).isStructural,
  )

  if (!structural) {
    errors.push({
      sectionId: section.id,
      code: 'MISSING_STRUCTURAL_SHELF',
      message: `${sectionLabel}: חסר מדף תומך (קונסטרוקטיבי)`,
      severity: 'error',
    })
    return
  }

  if (structural.y < SHELF_THICKNESS) {
    errors.push({
      sectionId: section.id,
      elementId: structural.id,
      code: 'STRUCTURAL_SHELF_TOO_LOW',
      message: `${sectionLabel}: מדף תומך ממוקם נמוך מדי`,
      severity: 'warning',
    })
  }

  if (structural.y + structural.height > innerHeight) {
    errors.push({
      sectionId: section.id,
      elementId: structural.id,
      code: 'STRUCTURAL_SHELF_EXCEEDS',
      message: `${sectionLabel}: מדף תומך חורג מגובה הארון`,
      severity: 'error',
    })
  }
}

// ── Element Bounds ──────────────────────────────────────────

function validateElementBounds(
  el: SectionElement,
  section: Section,
  innerHeight: number,
  sectionLabel: string,
  errors: ValidationError[],
): void {
  if (el.y < 0) {
    errors.push({
      sectionId: section.id,
      elementId: el.id,
      code: 'BELOW_FLOOR',
      message: `${sectionLabel}: אלמנט ממוקם מתחת לרצפת הארון`,
      severity: 'error',
    })
  }

  if (el.y + el.height > innerHeight + 0.5) {
    errors.push({
      sectionId: section.id,
      elementId: el.id,
      code: 'EXCEEDS_HEIGHT',
      message: `${sectionLabel}: אלמנט חורג מגובה הארון`,
      severity: 'error',
    })
  }
}

// ── Drawer Constraints ──────────────────────────────────────

function validateDrawerConstraints(
  closet: ClosetConfig,
  el: SectionElement,
  section: Section,
  sectionLabel: string,
  errors: ValidationError[],
): void {
  if (el.kind !== 'drawer-pair' && el.kind !== 'drawer-single') return
  const drawer = el as DrawerElement

  // External drawers only on hinge closets
  if (drawer.placement === 'external' && closet.closetType === 'sliding') {
    errors.push({
      sectionId: section.id,
      elementId: el.id,
      code: 'EXTERNAL_DRAWER_ON_SLIDING',
      message: `${sectionLabel}: מגירות חיצוניות אינן אפשריות בארון הזזה`,
      severity: 'error',
    })
  }

  // Single drawer height check
  if (el.kind === 'drawer-single') {
    if (drawer.height < DRAWER_MIN_HEIGHT) {
      errors.push({
        sectionId: section.id,
        elementId: el.id,
        code: 'DRAWER_TOO_SHORT',
        message: `${sectionLabel}: גובה מגירה (${drawer.height} ס״מ) קטן מהמינימום (${DRAWER_MIN_HEIGHT} ס״מ)`,
        severity: 'error',
      })
    }
    if (drawer.height > DRAWER_MAX_HEIGHT) {
      errors.push({
        sectionId: section.id,
        elementId: el.id,
        code: 'DRAWER_TOO_TALL',
        message: `${sectionLabel}: גובה מגירה (${drawer.height} ס״מ) חורג מהמקסימום (${DRAWER_MAX_HEIGHT} ס״מ)`,
        severity: 'error',
      })
    }
  }

  // Drawer pair: each drawer within the pair should be in range
  if (el.kind === 'drawer-pair') {
    const perDrawer = drawer.height / 2
    if (perDrawer < DRAWER_MIN_HEIGHT) {
      errors.push({
        sectionId: section.id,
        elementId: el.id,
        code: 'DRAWER_PAIR_TOO_SHORT',
        message: `${sectionLabel}: גובה כל מגירה בזוג (${perDrawer} ס״מ) קטן מהמינימום (${DRAWER_MIN_HEIGHT} ס״מ)`,
        severity: 'error',
      })
    }
    if (perDrawer > DRAWER_MAX_HEIGHT) {
      errors.push({
        sectionId: section.id,
        elementId: el.id,
        code: 'DRAWER_PAIR_TOO_TALL',
        message: `${sectionLabel}: גובה כל מגירה בזוג (${perDrawer} ס״מ) חורג מהמקסימום (${DRAWER_MAX_HEIGHT} ס״מ)`,
        severity: 'error',
      })
    }
  }
}

// ── Servetto Constraints ────────────────────────────────────

function validateServettoConstraints(
  el: SectionElement,
  section: Section,
  innerHeight: number,
  sectionLabel: string,
  errors: ValidationError[],
): void {
  if (el.kind !== 'servetto') return
  const servetto = el as ServettoElement

  // Clearance above: no elements allowed between servetto top
  // and (servetto top + clearanceAbove), up to ceiling
  const clearanceStart = servetto.y + servetto.height
  const clearanceCeiling = Math.min(
    clearanceStart + servetto.clearanceAbove,
    innerHeight,
  )

  // Check available clearance vs required clearance
  const availableClearance = innerHeight - clearanceStart
  if (availableClearance < servetto.clearanceAbove) {
    errors.push({
      sectionId: section.id,
      elementId: el.id,
      code: 'SERVETTO_INSUFFICIENT_CEILING',
      message: `${sectionLabel}: סרווטו דורש ${servetto.clearanceAbove} ס״מ חלל מעליו, אך נותרו רק ${Math.round(availableClearance)} ס״מ עד התקרה`,
      severity: 'error',
    })
  }

  // Check for blocking elements within the clearance zone
  const blockers = section.elements.filter(other => {
    if (other.id === el.id) return false
    const otherBottom = other.y
    const otherTop = other.y + other.height
    // Element overlaps the clearance zone
    return otherBottom < clearanceCeiling && otherTop > clearanceStart
  })

  for (const blocker of blockers) {
    errors.push({
      sectionId: section.id,
      elementId: el.id,
      code: 'SERVETTO_CLEARANCE_BLOCKED',
      message: `${sectionLabel}: סרווטו דורש ${servetto.clearanceAbove} ס״מ חלל פנוי מעליו — אלמנט חוסם בגובה ${Math.round(blocker.y)} ס״מ`,
      severity: 'error',
    })
  }

  // Servetto only makes sense in tall closets (advisory)
  if (innerHeight < 200) {
    errors.push({
      sectionId: section.id,
      elementId: el.id,
      code: 'SERVETTO_LOW_CLOSET',
      message: `${sectionLabel}: סרווטו מיועד בעיקר לארונות גבוהים (מעל 200 ס״מ)`,
      severity: 'warning',
    })
  }
}

// ── Overlap Detection ───────────────────────────────────────

function validateOverlaps(
  section: Section,
  sectionLabel: string,
  errors: ValidationError[],
): void {
  const sorted = [...section.elements].sort((a, b) => a.y - b.y)
  const TOLERANCE = 0.5 // cm — ignore sub-millimeter overlaps

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i]
    const next = sorted[i + 1]
    const overlap = curr.y + curr.height - next.y

    if (overlap > TOLERANCE) {
      errors.push({
        sectionId: section.id,
        elementId: curr.id,
        code: 'ELEMENT_OVERLAP',
        message: `${sectionLabel}: חפיפה של ${Math.round(overlap)} ס״מ בין אלמנטים בגובה ${Math.round(curr.y)} ו-${Math.round(next.y)} ס״מ`,
        severity: 'warning',
      })
    }
  }
}

// ── Drawer Cover Shelf Integrity ────────────────────────────

/**
 * Verify that every drawer block (contiguous group of drawers)
 * has a cover shelf sitting directly on top. The cover is mandatory
 * per the PRD: "תמיד יש מדף עליון מעל סט מגירות".
 */
function validateDrawerCovers(
  section: Section,
  _innerHeight: number,
  sectionLabel: string,
  errors: ValidationError[],
): void {
  const drawers = section.elements
    .filter((el): el is DrawerElement =>
      el.kind === 'drawer-pair' || el.kind === 'drawer-single')
    .sort((a, b) => a.y - b.y)

  if (drawers.length === 0) return

  // Group into contiguous blocks (same logic as closetUtils)
  const SNAP = 3 // cm tolerance
  const blocks: DrawerElement[][] = [[drawers[0]]]

  for (let i = 1; i < drawers.length; i++) {
    const prev = drawers[i - 1]
    const curr = drawers[i]
    const gap = curr.y - (prev.y + prev.height)
    if (gap <= SNAP) {
      blocks[blocks.length - 1].push(curr)
    } else {
      blocks.push([curr])
    }
  }

  // For each block, check that a shelf exists at its top edge
  for (const block of blocks) {
    const topDrawer = block[block.length - 1]
    const expectedCoverY = topDrawer.y + topDrawer.height

    const hasCover = section.elements.some(
      el => el.kind === 'shelf'
        && Math.abs(el.y - expectedCoverY) < SNAP
    )

    if (!hasCover) {
      errors.push({
        sectionId: section.id,
        elementId: topDrawer.id,
        code: 'DRAWER_MISSING_COVER',
        message: `${sectionLabel}: חסר מדף כיסוי מעל בלוק מגירות בגובה ${Math.round(expectedCoverY)} ס״מ`,
        severity: 'error',
      })
    }
  }
}

// ── Utility: Count errors by severity ───────────────────────

export function countBySeverity(errors: ValidationError[]): {
  errors: number
  warnings: number
} {
  return {
    errors: errors.filter(e => e.severity === 'error').length,
    warnings: errors.filter(e => e.severity === 'warning').length,
  }
}

/** Filter errors for a specific section */
export function errorsForSection(
  errors: ValidationError[],
  sectionId: string,
): ValidationError[] {
  return errors.filter(e => e.sectionId === sectionId)
}

/** Filter errors for a specific element */
export function errorsForElement(
  errors: ValidationError[],
  elementId: string,
): ValidationError[] {
  return errors.filter(e => e.elementId === elementId)
}
