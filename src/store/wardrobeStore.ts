import { create } from 'zustand'
import type { WardrobeState, WardrobeElement, WardrobeDimensions, SectionConfig } from '../types/wardrobe.types'

export const useWardrobeStore = create<WardrobeState>((set) => ({
  wardrobe: { width: 200, height: 240, depth: 60 },
  door: { doorType: 'none', hasMirror: false },
  elements: [],
  selectedId: null,
  unit: 'cm',

  setWardrobeDimensions: (dims: Partial<WardrobeDimensions>) =>
    set((state) => ({ wardrobe: { ...state.wardrobe, ...dims } })),

  setDoorConfig: (cfg: Partial<SectionConfig>) =>
    set((state) => ({ door: { ...state.door, ...cfg } })),

  addElement: (element: WardrobeElement) =>
    set((state) => ({ elements: [...state.elements, element], selectedId: element.id })),

  updateElement: (id: string, updates: Partial<WardrobeElement>) =>
    set((state) => ({
      elements: state.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    })),

  removeElement: (id: string) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  selectElement: (id: string | null) => set({ selectedId: id }),
  clearAll: () => set({ elements: [], selectedId: null }),
}))
