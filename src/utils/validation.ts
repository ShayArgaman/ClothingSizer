import type { WardrobeElement, WardrobeDimensions } from '../types/wardrobe.types'

export interface ValidationError {
  elementId: string
  message: string
}

export function validateLayout(
  elements: WardrobeElement[],
  wardrobe: WardrobeDimensions
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const el of elements) {
    if (el.x < 0 || el.y < 0) {
      errors.push({ elementId: el.id, message: `${el.label} is outside the wardrobe boundary.` })
    }
    if (el.x + el.width > wardrobe.width) {
      errors.push({ elementId: el.id, message: `${el.label} exceeds wardrobe width.` })
    }
    if (el.y + el.height > wardrobe.height) {
      errors.push({ elementId: el.id, message: `${el.label} exceeds wardrobe height.` })
    }
    if (el.depth > wardrobe.depth) {
      errors.push({ elementId: el.id, message: `${el.label} depth exceeds wardrobe depth.` })
    }
  }

  return errors
}

export function getUnusedSpace(
  elements: WardrobeElement[],
  wardrobe: WardrobeDimensions
): number {
  const totalArea = wardrobe.width * wardrobe.height
  const usedArea = elements.reduce((sum, el) => sum + el.width * el.height, 0)
  return Math.max(0, totalArea - usedArea)
}
