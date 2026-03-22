// ============================================================
// Closet Configurator — Zustand Store
// ============================================================

import { create } from 'zustand'

import type {
  ClosetType,
  ViewMode,
  ClosetDimensions,
  ClosetConfig,
  DoorConfig,
  Section,
  SectionElement,
  DrawerElement,
  MaterialConfig,
  FrontFinish,
  HandleStyle,
  StripConfig,
  ElementKind,
  DrawerPlacement,
  ValidationError,
  SingleDoorPlacement,
} from '../types/closet.types'

import {
  DEFAULT_DEPTH,
  SHELF_THICKNESS,
  WALL_THICKNESS,
} from '../types/closet.types'

import {
  genId,
  clampDepth,
  getDefaultDepth,
  getInnerWidth,
  getInnerHeight,
  getValidDoorCounts,
  getDefaultDoorCount,
  computeEqualDoorWidths,
  clampDoorWidths,
  deriveSections,
  computeStructuralShelfY,
  distributeShelvesEqually,
  enforceDrawerRules,
  computeDoorHeightForSection,
  createElement,
  createStructuralShelf,
} from '../utils/closetUtils'

import { validateCloset } from '../utils/closetValidation'

// ── Store Interface ─────────────────────────────────────────

export interface ClosetStore {
  // ── State ──
  closet: ClosetConfig
  viewMode: ViewMode
  selectedSectionId: string | null
  selectedElementId: string | null

  // ── Closet-level actions ──
  setClosetType: (type: ClosetType) => void
  setDimensions: (dims: Partial<ClosetDimensions>) => void
  setBodyMaterial: (m: MaterialConfig) => void
  setFrontMaterial: (m: MaterialConfig) => void
  setFrontFinish: (f: FrontFinish) => void

  // ── Door actions ──
  setDoorCount: (count: number) => void
  setDoorWidths: (widths: number[]) => void
  setSingleDoorPlacement: (placement: SingleDoorPlacement) => void
  setHandleStyle: (style: HandleStyle) => void
  setCenterHandleDoor: (index: number | null) => void
  setStrips: (strips: StripConfig | null) => void

  // ── Section & Element actions ──
  addElement: (sectionId: string, kind: ElementKind, y?: number, options?: { placement?: DrawerPlacement }) => void
  moveElement: (sectionId: string, elementId: string, newY: number) => void
  removeElement: (sectionId: string, elementId: string) => void
  updateElement: (sectionId: string, elementId: string, patch: Partial<SectionElement>) => void
  setStructuralShelfY: (sectionId: string, y: number) => void
  distributeShelvesEqually: (sectionId: string) => void

  // ── View & selection ──
  setViewMode: (mode: ViewMode) => void
  selectSection: (id: string | null) => void
  selectElement: (sectionId: string | null, elementId: string | null) => void
  clearAll: () => void

  // ── Computed (call as functions) ──
  getValidationErrors: () => ValidationError[]
  getDoorConfigurations: () => number[]
  getDoorHeightForSection: (sectionId: string) => number
}

// ── Initial State Factory ───────────────────────────────────

function createInitialCloset(): ClosetConfig {
  const closetType: ClosetType = 'hinge'
  const dimensions: ClosetDimensions = {
    width: 200,
    height: 240,
    depth: DEFAULT_DEPTH[closetType],
  }
  const innerWidth = getInnerWidth(dimensions)
  const doorCount = getDefaultDoorCount(closetType, dimensions.width)
  const doorWidths = computeEqualDoorWidths(closetType, innerWidth, doorCount)

  const doors: DoorConfig = {
    count: doorCount,
    widths: doorWidths,
    handleStyle: 'point',
    centerHandleDoorIndex: null,
    strips: null,
  }

  const sections = deriveSections(doors, dimensions, closetType)
  // Add structural shelf to each section
  for (const sec of sections) {
    sec.elements.push(
      createStructuralShelf(computeStructuralShelfY(getInnerHeight(dimensions)))
    )
  }

  return {
    id: genId('closet'),
    dimensions,
    closetType,
    bodyMaterial: { material: 'white-mdf', color: '#f0ede8' },
    frontMaterial: { material: 'oak', color: '#c8a97e' },
    frontFinish: 'standard',
    doors,
    sections,
  }
}

// ── Helper: rebuild doors & sections after dimension/type change ──

function rebuildDoorsAndSections(
  closetType: ClosetType,
  dimensions: ClosetDimensions,
  existingSections?: Section[],
  existingDoors?: DoorConfig,
): { doors: DoorConfig; sections: Section[] } {
  const innerWidth = getInnerWidth(dimensions)
  const validCounts = getValidDoorCounts(closetType, dimensions.width)

  // Keep existing count if still valid, otherwise pick default
  let count = existingDoors?.count ?? getDefaultDoorCount(closetType, dimensions.width)
  if (!validCounts.includes(count)) {
    count = getDefaultDoorCount(closetType, dimensions.width)
  }

  // Preserve asymmetric widths: proportionally rescale if count matches
  let widths: number[]
  if (existingDoors && existingDoors.count === count) {
    const oldSum = existingDoors.widths.reduce((a, b) => a + b, 0)
    if (oldSum > 0 && oldSum !== innerWidth) {
      // Proportionally scale
      const scaled = existingDoors.widths.map(w => Math.round(w * innerWidth / oldSum))
      const scaledSum = scaled.reduce((a, b) => a + b, 0)
      scaled[scaled.length - 1] += innerWidth - scaledSum // absorb rounding
      widths = clampDoorWidths(closetType, scaled, innerWidth)
    } else {
      widths = existingDoors.widths
    }
  } else {
    widths = computeEqualDoorWidths(closetType, innerWidth, count)
  }

  const doors: DoorConfig = {
    count,
    widths,
    handleStyle: existingDoors?.handleStyle ?? 'point',
    centerHandleDoorIndex: count !== existingDoors?.count ? null : (existingDoors?.centerHandleDoorIndex ?? null),
    strips: existingDoors?.strips ?? null,
    singleDoorPlacement: existingDoors?.singleDoorPlacement,
  }

  const sections = deriveSections(doors, dimensions, closetType, existingSections)

  // Ensure each section has a structural shelf
  const innerHeight = getInnerHeight(dimensions)
  for (const sec of sections) {
    const hasStructural = sec.elements.some(
      el => el.kind === 'shelf' && (el as any).isStructural
    )
    if (!hasStructural) {
      sec.elements.push(createStructuralShelf(computeStructuralShelfY(innerHeight)))
    }
  }

  return { doors, sections }
}

// ── Helper: find section by id ──────────────────────────────

function findSection(sections: Section[], id: string): Section | undefined {
  return sections.find(s => s.id === id)
}

// ── Helper: update a section's elements in place ────────────

function updateSectionElements(
  closet: ClosetConfig,
  sectionId: string,
  updater: (elements: SectionElement[], section: Section) => SectionElement[],
): ClosetConfig {
  return {
    ...closet,
    sections: closet.sections.map(sec => {
      if (sec.id !== sectionId) return sec
      return { ...sec, elements: updater([...sec.elements], sec) }
    }),
  }
}

// ── Store ───────────────────────────────────────────────────

export const useClosetStore = create<ClosetStore>((set, get) => ({
  closet: createInitialCloset(),
  viewMode: 'internal',
  selectedSectionId: null,
  selectedElementId: null,

  // ────────────────────────────────────────────────────────
  // Closet-level actions
  // ────────────────────────────────────────────────────────

  setClosetType: (type: ClosetType) =>
    set(state => {
      const newDepth = getDefaultDepth(type)
      const dims = { ...state.closet.dimensions, depth: newDepth }

      // When switching to sliding, remove all external drawers
      let existingSections = state.closet.sections
      if (type === 'sliding') {
        existingSections = existingSections.map(sec => ({
          ...sec,
          elements: sec.elements.filter(el => {
            if ((el.kind === 'drawer-pair' || el.kind === 'drawer-single')
                && (el as DrawerElement).placement === 'external') {
              return false
            }
            return true
          }),
        }))
      }

      const { doors, sections } = rebuildDoorsAndSections(
        type, dims, existingSections, state.closet.doors,
      )

      return {
        closet: {
          ...state.closet,
          closetType: type,
          dimensions: dims,
          doors,
          sections,
        },
      }
    }),

  setDimensions: (dims: Partial<ClosetDimensions>) =>
    set(state => {
      const newDims = { ...state.closet.dimensions }
      if (dims.width !== undefined) newDims.width = Math.max(2 * WALL_THICKNESS + 30, dims.width)
      if (dims.height !== undefined) newDims.height = Math.max(2 * WALL_THICKNESS + 30, dims.height)
      if (dims.depth !== undefined) newDims.depth = clampDepth(dims.depth)

      const { doors, sections } = rebuildDoorsAndSections(
        state.closet.closetType,
        newDims,
        state.closet.sections,
        state.closet.doors,
      )

      return {
        closet: {
          ...state.closet,
          dimensions: newDims,
          doors,
          sections,
        },
      }
    }),

  setBodyMaterial: (m: MaterialConfig) =>
    set(state => ({
      closet: { ...state.closet, bodyMaterial: m },
    })),

  setFrontMaterial: (m: MaterialConfig) =>
    set(state => ({
      closet: { ...state.closet, frontMaterial: m },
    })),

  setFrontFinish: (f: FrontFinish) =>
    set(state => ({
      closet: { ...state.closet, frontFinish: f },
    })),

  // ────────────────────────────────────────────────────────
  // Door actions
  // ────────────────────────────────────────────────────────

  setDoorCount: (count: number) =>
    set(state => {
      const innerWidth = getInnerWidth(state.closet.dimensions)
      const widths = computeEqualDoorWidths(
        state.closet.closetType, innerWidth, count,
      )

      const doors: DoorConfig = {
        ...state.closet.doors,
        count,
        widths,
        // Reset center handle if count changed
        centerHandleDoorIndex: null,
      }

      const sections = deriveSections(
        doors, state.closet.dimensions, state.closet.closetType, state.closet.sections,
      )

      // Ensure structural shelves
      const innerHeight = getInnerHeight(state.closet.dimensions)
      for (const sec of sections) {
        const hasStructural = sec.elements.some(
          el => el.kind === 'shelf' && (el as any).isStructural
        )
        if (!hasStructural) {
          sec.elements.push(createStructuralShelf(computeStructuralShelfY(innerHeight)))
        }
      }

      return {
        closet: { ...state.closet, doors, sections },
      }
    }),

  setDoorWidths: (widths: number[]) =>
    set(state => {
      const innerWidth = getInnerWidth(state.closet.dimensions)
      const clamped = clampDoorWidths(state.closet.closetType, widths, innerWidth)

      const doors: DoorConfig = { ...state.closet.doors, widths: clamped }
      const sections = deriveSections(
        doors, state.closet.dimensions, state.closet.closetType, state.closet.sections,
      )

      return {
        closet: { ...state.closet, doors, sections },
      }
    }),

  setSingleDoorPlacement: (placement: SingleDoorPlacement) =>
    set(state => {
      const doors: DoorConfig = { ...state.closet.doors, singleDoorPlacement: placement }
      const sections = deriveSections(
        doors, state.closet.dimensions, state.closet.closetType, state.closet.sections,
      )

      // Ensure structural shelves
      const innerHeight = getInnerHeight(state.closet.dimensions)
      for (const sec of sections) {
        const hasStructural = sec.elements.some(
          el => el.kind === 'shelf' && (el as any).isStructural
        )
        if (!hasStructural) {
          sec.elements.push(createStructuralShelf(computeStructuralShelfY(innerHeight)))
        }
      }

      return {
        closet: { ...state.closet, doors, sections },
      }
    }),

  setHandleStyle: (style: HandleStyle) =>
    set(state => ({
      closet: {
        ...state.closet,
        doors: {
          ...state.closet.doors,
          handleStyle: style,
          // Clear center handle index if not center style
          centerHandleDoorIndex: style === 'center'
            ? state.closet.doors.centerHandleDoorIndex
            : null,
        },
      },
    })),

  setCenterHandleDoor: (index: number | null) =>
    set(state => ({
      closet: {
        ...state.closet,
        doors: { ...state.closet.doors, centerHandleDoorIndex: index },
      },
    })),

  setStrips: (strips: StripConfig | null) =>
    set(state => ({
      closet: {
        ...state.closet,
        doors: { ...state.closet.doors, strips },
      },
    })),

  // ────────────────────────────────────────────────────────
  // Section & Element actions
  // ────────────────────────────────────────────────────────

  addElement: (
    sectionId: string,
    kind: ElementKind,
    y?: number,
    options?: { placement?: DrawerPlacement },
  ) =>
    set(state => {
      const section = findSection(state.closet.sections, sectionId)
      if (!section) return state

      const innerHeight = getInnerHeight(state.closet.dimensions)

      // Default Y: bottom of section for drawers, above structural shelf for shelves
      const defaultY = kind === 'shelf'
        ? section.structuralShelfY + SHELF_THICKNESS + 10
        : 0

      // External drawers only allowed on hinge closets
      let placement = options?.placement ?? 'internal'
      if (state.closet.closetType === 'sliding' && placement === 'external') {
        placement = 'internal'
      }

      const element = createElement(kind, y ?? defaultY, {
        placement,
      })

      let elements = [...section.elements, element]

      // Enforce drawer stacking rules
      if (kind === 'drawer-pair' || kind === 'drawer-single') {
        elements = enforceDrawerRules(elements, innerHeight)
      }

      const updatedCloset = updateSectionElements(
        state.closet, sectionId,
        () => elements,
      )

      return {
        closet: updatedCloset,
        selectedSectionId: sectionId,
        selectedElementId: element.id,
      }
    }),

  moveElement: (sectionId: string, elementId: string, newY: number) =>
    set(state => {
      const innerHeight = getInnerHeight(state.closet.dimensions)

      const updatedCloset = updateSectionElements(
        state.closet, sectionId,
        (elements) => {
          const idx = elements.findIndex(el => el.id === elementId)
          if (idx === -1) return elements

          const el = elements[idx]
          if (el.fixed) return elements // Cannot move fixed elements

          elements[idx] = { ...el, y: Math.max(0, Math.min(newY, innerHeight - el.height)) }

          // Re-enforce drawer rules if it's a drawer
          if (el.kind === 'drawer-pair' || el.kind === 'drawer-single') {
            return enforceDrawerRules(elements, innerHeight)
          }

          return elements
        },
      )

      return { closet: updatedCloset }
    }),

  removeElement: (sectionId: string, elementId: string) =>
    set(state => {
      const innerHeight = getInnerHeight(state.closet.dimensions)

      const updatedCloset = updateSectionElements(
        state.closet, sectionId,
        (elements) => {
          const el = elements.find(e => e.id === elementId)
          if (!el) return elements

          // Cannot remove structural shelf
          if (el.kind === 'shelf' && (el as any).isStructural) return elements

          const filtered = elements.filter(e => e.id !== elementId)

          // Re-enforce drawer rules (to clean up orphaned cover shelves)
          return enforceDrawerRules(filtered, innerHeight)
        },
      )

      return {
        closet: updatedCloset,
        selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
      }
    }),

  updateElement: (sectionId: string, elementId: string, patch: Partial<SectionElement>) =>
    set(state => {
      const innerHeight = getInnerHeight(state.closet.dimensions)

      const updatedCloset = updateSectionElements(
        state.closet, sectionId,
        (elements) => {
          let updated = elements.map(el =>
            el.id === elementId ? { ...el, ...patch } as SectionElement : el
          )

          // Re-enforce drawer rules if a drawer was modified
          const el = updated.find(e => e.id === elementId)
          if (el && (el.kind === 'drawer-pair' || el.kind === 'drawer-single')) {
            updated = enforceDrawerRules(updated, innerHeight)
          }

          return updated
        },
      )

      return { closet: updatedCloset }
    }),

  setStructuralShelfY: (sectionId: string, y: number) =>
    set(state => {
      const innerHeight = getInnerHeight(state.closet.dimensions)
      const clampedY = Math.max(SHELF_THICKNESS, Math.min(y, innerHeight - SHELF_THICKNESS))

      const updatedCloset: ClosetConfig = {
        ...state.closet,
        sections: state.closet.sections.map(sec => {
          if (sec.id !== sectionId) return sec

          const newElements = sec.elements.map(el => {
            if (el.kind === 'shelf' && (el as any).isStructural) {
              return { ...el, y: clampedY }
            }
            return el
          })

          return {
            ...sec,
            structuralShelfY: clampedY,
            elements: newElements,
          }
        }),
      }

      return { closet: updatedCloset }
    }),

  distributeShelvesEqually: (sectionId: string) =>
    set(state => {
      const section = findSection(state.closet.sections, sectionId)
      if (!section) return state

      const innerHeight = getInnerHeight(state.closet.dimensions)
      const newElements = distributeShelvesEqually(section, innerHeight)

      const updatedCloset = updateSectionElements(
        state.closet, sectionId,
        () => newElements,
      )

      return { closet: updatedCloset }
    }),

  // ────────────────────────────────────────────────────────
  // View & selection
  // ────────────────────────────────────────────────────────

  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  selectSection: (id: string | null) =>
    set({ selectedSectionId: id, selectedElementId: null }),

  selectElement: (sectionId: string | null, elementId: string | null) =>
    set({ selectedSectionId: sectionId, selectedElementId: elementId }),

  clearAll: () =>
    set({
      closet: createInitialCloset(),
      selectedSectionId: null,
      selectedElementId: null,
    }),

  // ────────────────────────────────────────────────────────
  // Computed
  // ────────────────────────────────────────────────────────

  getValidationErrors: (): ValidationError[] => {
    return validateCloset(get().closet)
  },

  getDoorConfigurations: (): number[] => {
    const { closet } = get()
    return getValidDoorCounts(closet.closetType, closet.dimensions.width)
  },

  getDoorHeightForSection: (sectionId: string): number => {
    const { closet } = get()
    const section = findSection(closet.sections, sectionId)
    if (!section) return getInnerHeight(closet.dimensions)
    return computeDoorHeightForSection(section, getInnerHeight(closet.dimensions))
  },
}))
