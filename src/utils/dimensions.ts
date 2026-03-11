/** Pixels per centimeter on canvas */
export const PX_PER_CM = 3.5

/** Snap grid in cm */
export const GRID_CM = 5

/** Structural thickness in cm */
export const WALL_CM = 2
export const DIVIDER_CM = 2

export const cmToPx = (cm: number) => cm * PX_PER_CM
export const pxToCm = (px: number) => Math.round(px / PX_PER_CM)

/** Snap a cm value to the nearest 5cm grid increment */
export const snapCm = (cm: number): number => Math.round(cm / GRID_CM) * GRID_CM

export const formatCm = (cm: number) => `${cm} ס״מ`

/** Canvas padding around the wardrobe frame in px */
export const CANVAS_PADDING = 60

/**
 * Snap element's X to the nearest wall of its section.
 *
 * Left section (centerX < dividerX):  snap to left outer wall OR right side of left section
 * Right section (centerX ≥ dividerX): snap to left side of right section OR right outer wall
 *
 * Elements are NOT allowed to float – they must touch one of the two walls of their section.
 */
export function snapXToSection(
  xCm: number,
  widthCm: number,
  wardrobeWidth: number,
  dividerX: number
): number {
  const centerX = xCm + widthCm / 2
  const halfDiv  = DIVIDER_CM / 2

  if (centerX < dividerX) {
    // ── Left section ──────────────────────────────────────────
    const snapLeft  = WALL_CM
    const snapRight = Math.max(snapLeft, dividerX - halfDiv - widthCm)
    return Math.abs(xCm - snapLeft) <= Math.abs(xCm - snapRight) ? snapLeft : snapRight
  } else {
    // ── Right section ─────────────────────────────────────────
    const snapLeft  = dividerX + halfDiv
    const snapRight = Math.max(snapLeft, wardrobeWidth - WALL_CM - widthCm)
    return Math.abs(xCm - snapLeft) <= Math.abs(xCm - snapRight) ? snapLeft : snapRight
  }
}

/** Inner usable bounds for each section (cm) */
export function getSectionBounds(wardrobeWidth: number, dividerX: number) {
  return {
    left:  { start: WALL_CM,               end: dividerX - DIVIDER_CM / 2 },
    right: { start: dividerX + DIVIDER_CM / 2, end: wardrobeWidth - WALL_CM },
  }
}
