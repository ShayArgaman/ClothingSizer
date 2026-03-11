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
 * Snap element's X to the nearest wall of its section (legacy – keeps existing width).
 */
export function snapXToSection(
  xCm: number,
  widthCm: number,
  wardrobeWidth: number,
  dividerX: number
): number {
  return snapElementToSection(xCm, widthCm, wardrobeWidth, dividerX).x
}

/**
 * Place element so it fills its section wall-to-wall.
 * Section is determined by where the element's CENTER falls relative to dividerX.
 * Returns the correct { x, width } so the element spans the full inner section width.
 */
export function snapElementToSection(
  xCm: number,
  widthCm: number,
  wardrobeWidth: number,
  dividerX: number
): { x: number; width: number } {
  const centerX = xCm + widthCm / 2
  const halfDiv  = DIVIDER_CM / 2

  if (centerX < dividerX) {
    // Left section
    const x = WALL_CM
    const width = dividerX - halfDiv - WALL_CM
    return { x, width }
  } else {
    // Right section
    const x = dividerX + halfDiv
    const width = wardrobeWidth - WALL_CM - x
    return { x, width }
  }
}

/** Inner usable bounds for each section (cm) */
export function getSectionBounds(wardrobeWidth: number, dividerX: number) {
  return {
    left:  { start: WALL_CM,               end: dividerX - DIVIDER_CM / 2 },
    right: { start: dividerX + DIVIDER_CM / 2, end: wardrobeWidth - WALL_CM },
  }
}
