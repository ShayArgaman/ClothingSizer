# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wardrobe configurator web app — users visually design their wardrobe using drag-and-drop onto a Konva.js canvas, with an AI advisor agent (Claude API) that analyses the current layout and gives optimization suggestions.

## Tech Stack

- **Framework:** React 19 + TypeScript (strict mode)
- **Build tool:** Vite 6
- **Styling:** Tailwind CSS 3
- **Canvas/interactions:** Konva.js via react-konva
- **AI advisor:** `@anthropic-ai/sdk` — streaming, browser-direct with `dangerouslyAllowBrowser`
- **State:** Zustand

## Commands

```bash
npm run dev        # start dev server on port 3000
npm run build      # tsc -b && vite build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Environment

Copy `.env.example` to `.env` and set `VITE_ANTHROPIC_API_KEY`. The app works without it (canvas is fully functional), but the AI advisor panel will be disabled.

## Architecture

### Layout (`App.tsx`)
Three-column layout: `ComponentsPanel` | `WardrobeCanvas` + `AIAdvisorPanel` | `PropertiesPanel`. The canvas and AI panel share vertical space in the center column.

### State (`src/store/wardrobeStore.ts`)
Single Zustand store. All element positions/dimensions are stored in **cm** (not pixels). Pixel conversion happens at render time via `cmToPx()` in `src/utils/dimensions.ts`.

Key constants in `dimensions.ts`:
- `PX_PER_CM = 3.5` — scale factor
- `GRID_CM = 5` — snap grid granularity
- `CANVAS_PADDING = 60` — px offset of the wardrobe frame within the Stage

### Canvas (`src/components/Canvas/`)
- `WardrobeCanvas.tsx` — Konva `<Stage>` + `<Layer>`. Handles drop events from the sidebar, renders the wardrobe frame with architectural dimension lines, grid overlay, and all placed elements.
- `WardrobeElement.tsx` — Individual element node. Each type (`shelf`, `hanging-rail`, `drawer`, `shoe-rack`, `corner-unit`) renders custom Konva shapes. Drag-end snaps to the 5cm grid. A bottom-right `<Circle>` resize handle updates width/height on drag.

### AI Advisor (`src/agents/wardrobeAgent.ts`)
`sendMessage()` builds a system prompt from the live wardrobe state (dimensions, all elements, unused area, layout errors) and streams a response via `client.messages.stream()`. The panel appends streamed chunks to the last message in real time.

### Types (`src/types/wardrobe.types.ts`)
- `WardrobeElement` — the persisted shape of every placed item (x/y/w/h in cm, material, color)
- `COMPONENT_TEMPLATES` — the palette definitions used by both the sidebar and `App.tsx` to construct new elements
- `MATERIALS` — material presets with their hex colours, used by `PropertiesPanel`
