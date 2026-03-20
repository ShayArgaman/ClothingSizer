// ============================================================
// Closet Configurator — Core Type System
// ============================================================

// ── Enums & Literals ────────────────────────────────────────

export type ClosetType = 'hinge' | 'sliding'

export type ViewMode = 'internal' | 'external'

export type ElementKind =
  | 'shelf'
  | 'hanging-rail'
  | 'servetto'
  | 'drawer-pair'
  | 'drawer-single'
  | 'shoe-rack'

export type DrawerPlacement = 'internal' | 'external'

export type HandleStyle = 'point' | 'long' | 'center'

export type StripMaterial = 'nickel' | 'silver' | 'white'

export type FrontFinish =
  | 'standard'
  | 'clear-glass'
  | 'frosted-glass'
  | 'bronze'
  | 'gold'

export type Material = 'oak' | 'walnut' | 'white-mdf' | 'grey-mdf' | 'black-mdf'

// ── Constants ───────────────────────────────────────────────

export const MATERIALS: { value: Material; label: string; color: string }[] = [
  { value: 'oak',       label: 'אלון',      color: '#c8a97e' },
  { value: 'walnut',    label: 'אגוז',      color: '#7b5e3a' },
  { value: 'white-mdf', label: 'MDF לבן',   color: '#f0ede8' },
  { value: 'grey-mdf',  label: 'MDF אפור',  color: '#8e9aab' },
  { value: 'black-mdf', label: 'MDF שחור',  color: '#2d3142' },
]

export const FRONT_FINISH_LABELS: Record<FrontFinish, string> = {
  standard:       'סטנדרטי',
  'clear-glass':  'זכוכית שקופה',
  'frosted-glass':'זכוכית מושחרת',
  bronze:         'ברונזה',
  gold:           'זהב',
}

export const HANDLE_STYLE_LABELS: Record<HandleStyle, string> = {
  point:  'נקודה',
  long:   'מאורכת',
  center: 'מרכזית',
}

export const STRIP_MATERIAL_LABELS: Record<StripMaterial, string> = {
  nickel: 'ניקל',
  silver: 'כסוף',
  white:  'לבן',
}

export const ELEMENT_KIND_LABELS: Record<ElementKind, string> = {
  shelf:          'מדף',
  'hanging-rail': 'מוט תלייה',
  servetto:       'סרווטו',
  'drawer-pair':  'זוג מגירות',
  'drawer-single':'מגירה בודדת',
  'shoe-rack':    'מתלה נעליים',
}

export const ELEMENT_KIND_ICONS: Record<ElementKind, string> = {
  shelf:          '▬',
  'hanging-rail': '⌇',
  servetto:       '⇕',
  'drawer-pair':  '▤▤',
  'drawer-single':'▤',
  'shoe-rack':    '⊿',
}

// ── Physical Constraints ────────────────────────────────────

/** Default depths per closet type (cm) */
export const DEFAULT_DEPTH: Record<ClosetType, number> = {
  hinge:   55,
  sliding: 60,
}

export const MIN_DEPTH = 50
export const MAX_DEPTH = 60

/** Hinge door constraints (cm) */
export const HINGE_DOOR_BASE_WIDTH = 40
export const HINGE_DOOR_MIN_WIDTH = 30
export const HINGE_DOOR_MAX_WIDTH = 60

/** Sliding door constraints (cm) */
export const SLIDING_DOOR_MIN_WIDTH = 60
export const SLIDING_DOOR_MAX_WIDTH = 100
/** Minimum closet width to allow 3 sliding doors */
export const SLIDING_3_DOOR_MIN_WIDTH = 180

/** Drawer dimensions (cm) */
export const DRAWER_MIN_HEIGHT = 20
export const DRAWER_MAX_HEIGHT = 30
export const DRAWER_SINGLE_DEFAULT_HEIGHT = 25
export const DRAWER_PAIR_DEFAULT_HEIGHT = 50

/** Structural shelf default Y from bottom (cm) */
export const STRUCTURAL_SHELF_DEFAULT_Y = 80

/** Shelf thickness (cm) */
export const SHELF_THICKNESS = 2

/** Wall / divider thickness (cm) */
export const WALL_THICKNESS = 2
export const DIVIDER_THICKNESS = 2

// ── Material Config ─────────────────────────────────────────

export interface MaterialConfig {
  material: Material
  color: string
}

// ── Closet Dimensions ───────────────────────────────────────

export interface ClosetDimensions {
  /** Total outer width in cm */
  width: number
  /** Total outer height in cm */
  height: number
  /** Depth in cm — auto-set by closetType, editable 50-60 */
  depth: number
}

// ── Door Configuration ──────────────────────────────────────

export interface StripConfig {
  material: StripMaterial
  /** Y positions (cm from bottom) where strips appear */
  positions: number[]
}

export type SingleDoorPlacement = 'left' | 'right'

export interface DoorConfig {
  /** Number of doors */
  count: number
  /**
   * Per-door widths in cm, left-to-right.
   * length === count. Sum === closet inner width.
   */
  widths: number[]
  /** Handle style — only for hinge closets */
  handleStyle: HandleStyle
  /** Index of the door that receives a center handle (0-based) */
  centerHandleDoorIndex: number | null
  /** Separation strips — only for sliding closets */
  strips: StripConfig | null
  /**
   * For hinge closets with an odd number of doors: which side
   * the unpaired single door sits on. Default: 'right'.
   */
  singleDoorPlacement?: SingleDoorPlacement
}

// ── Section (vertical column) ───────────────────────────────

export interface Section {
  id: string
  /** Index from left (0-based) */
  index: number
  /** X offset from closet inner left edge, in cm */
  x: number
  /** Usable inner width in cm */
  width: number
  /** Elements placed inside this section */
  elements: SectionElement[]
  /**
   * Y of the mandatory structural shelf, measured from
   * the closet bottom in cm. Default ~80cm.
   */
  structuralShelfY: number
  /**
   * Door indices (0-based) that this section covers.
   * For hinge: usually 2 doors per section (pair).
   * For sliding: 1 door per section.
   */
  doorIndices: number[]
}

// ── Section Elements ────────────────────────────────────────

export interface SectionElementBase {
  id: string
  kind: ElementKind
  /**
   * Y offset from section bottom in cm.
   * For shelves this is the bottom edge of the shelf.
   */
  y: number
  /** Height consumed by this element in cm */
  height: number
  /** Is this a fixed/constructive element? (non-draggable) */
  fixed: boolean
}

export interface ShelfElement extends SectionElementBase {
  kind: 'shelf'
  /** true for the mandatory structural shelf */
  isStructural: boolean
}

export interface HangingRailElement extends SectionElementBase {
  kind: 'hanging-rail'
}

export interface ServettoElement extends SectionElementBase {
  kind: 'servetto'
  /** Clear space required above the servetto (cm) — no shelves allowed */
  clearanceAbove: number
}

export interface DrawerElement extends SectionElementBase {
  kind: 'drawer-pair' | 'drawer-single'
  placement: DrawerPlacement
}

export interface ShoeRackElement extends SectionElementBase {
  kind: 'shoe-rack'
}

export type SectionElement =
  | ShelfElement
  | HangingRailElement
  | ServettoElement
  | DrawerElement
  | ShoeRackElement

// ── Full Closet Config ──────────────────────────────────────

export interface ClosetConfig {
  id: string
  dimensions: ClosetDimensions
  closetType: ClosetType
  bodyMaterial: MaterialConfig
  frontMaterial: MaterialConfig
  frontFinish: FrontFinish
  doors: DoorConfig
  sections: Section[]
}

// ── Validation ──────────────────────────────────────────────

export interface ValidationError {
  sectionId?: string
  elementId?: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

// ── Component Palette ───────────────────────────────────────

export interface ComponentTemplate {
  kind: ElementKind
  label: string
  icon: string
  defaultHeight: number
  description: string
}

export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    kind: 'shelf',
    label: 'מדף',
    icon: '▬',
    defaultHeight: SHELF_THICKNESS,
    description: 'מדף שטוח מתכוונן',
  },
  {
    kind: 'hanging-rail',
    label: 'מוט תלייה',
    icon: '⌇',
    defaultHeight: 100,
    description: 'מוט לתלייה בגדים',
  },
  {
    kind: 'servetto',
    label: 'סרווטו',
    icon: '⇕',
    defaultHeight: 100,
    description: 'מתקן תלייה נשלף לארונות גבוהים',
  },
  {
    kind: 'drawer-pair',
    label: 'זוג מגירות',
    icon: '▤▤',
    defaultHeight: DRAWER_PAIR_DEFAULT_HEIGHT,
    description: 'שתי מגירות כבלוק אחד (50 ס״מ)',
  },
  {
    kind: 'drawer-single',
    label: 'מגירה בודדת',
    icon: '▤',
    defaultHeight: DRAWER_SINGLE_DEFAULT_HEIGHT,
    description: 'מגירה בודדת (25 ס״מ)',
  },
  {
    kind: 'shoe-rack',
    label: 'מתלה נעליים',
    icon: '⊿',
    defaultHeight: 25,
    description: 'אחסון נעליים מוטה',
  },
]
