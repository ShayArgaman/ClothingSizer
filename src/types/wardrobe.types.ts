export type ElementType = 'shelf' | 'hanging-rail' | 'drawer' | 'shoe-rack' | 'corner-unit'
export type Material = 'oak' | 'walnut' | 'white-mdf' | 'grey-mdf' | 'black-mdf'
export type DoorType = 'none' | 'hinged' | 'sliding'

export type MirrorSide = 'left' | 'right' | 'both'

export interface SectionConfig {
  doorType: DoorType
  hasMirror: boolean
  mirrorSide: MirrorSide
}

export interface WardrobeElement {
  id: string
  type: ElementType
  x: number       // cm from wardrobe left
  y: number       // cm from wardrobe top
  width: number   // cm
  height: number  // cm
  depth: number   // cm
  color: string
  material: Material
  label: string
}

export interface WardrobeDimensions {
  width: number
  height: number
  depth: number
}

export interface WardrobeState {
  wardrobe: WardrobeDimensions
  door: SectionConfig            // ← unified for both sections
  elements: WardrobeElement[]
  selectedId: string | null
  unit: 'cm'

  setWardrobeDimensions: (dims: Partial<WardrobeDimensions>) => void
  setDoorConfig: (cfg: Partial<SectionConfig>) => void
  addElement: (element: WardrobeElement) => void
  updateElement: (id: string, updates: Partial<WardrobeElement>) => void
  removeElement: (id: string) => void
  selectElement: (id: string | null) => void
  clearAll: () => void
}

export interface ComponentTemplate {
  type: ElementType
  label: string
  icon: string
  defaultWidth: number
  defaultHeight: number
  defaultDepth: number
  color: string
  description: string
}

export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    type: 'shelf',
    label: 'מדף',
    icon: '▬',
    defaultWidth: 80,
    defaultHeight: 3,
    defaultDepth: 50,
    color: '#c8a97e',
    description: 'מדף שטוח מתכוונן',
  },
  {
    type: 'hanging-rail',
    label: 'מוט תלייה',
    icon: '⌇',
    defaultWidth: 80,
    defaultHeight: 120,
    defaultDepth: 50,
    color: '#94a3b8',
    description: 'מוט לתלייה בגדים',
  },
  {
    type: 'drawer',
    label: 'מגירה',
    icon: '▤',
    defaultWidth: 80,
    defaultHeight: 20,
    defaultDepth: 50,
    color: '#c8a97e',
    description: 'מגירה בודדת',
  },
  {
    type: 'shoe-rack',
    label: 'מתלה נעליים',
    icon: '👟',
    defaultWidth: 80,
    defaultHeight: 15,
    defaultDepth: 35,
    color: '#a3b8a0',
    description: 'אחסון נעליים מוטה',
  },
  {
    type: 'corner-unit',
    label: 'יחידת פינה',
    icon: '⌐',
    defaultWidth: 60,
    defaultHeight: 60,
    defaultDepth: 60,
    color: '#c8a97e',
    description: 'ממלא מרחב פינתי',
  },
]

export const MATERIALS: { value: Material; label: string; color: string }[] = [
  { value: 'oak',       label: 'אלון',      color: '#c8a97e' },
  { value: 'walnut',    label: 'אגוז',      color: '#7b5e3a' },
  { value: 'white-mdf', label: 'MDF לבן',  color: '#f0ede8' },
  { value: 'grey-mdf',  label: 'MDF אפור', color: '#8e9aab' },
  { value: 'black-mdf', label: 'MDF שחור', color: '#2d3142' },
]

export const DIM_LABELS: Record<string, string> = {
  width:  'רוחב',
  height: 'גובה',
  depth:  'עומק',
  x:      'מיקום X',
  y:      'מיקום Y',
}

export const DOOR_TYPE_LABELS: Record<DoorType, string> = {
  none:   'ללא',
  hinged: 'הזזה',
  sliding:'צירים',
}
