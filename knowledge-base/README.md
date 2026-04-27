# Mini-Game Builder Knowledge Base

A comprehensive reference manual for building consistent, high-quality mini-games for the Mini Game Board project. All patterns are extracted from the live implementations of **Dark Maze** and **Tank Shot**.

---

## Table of Contents

### Architecture & Infrastructure
1. [**Core Architecture**](core-architecture.md)
   - Directory structure, module responsibilities, data flow diagram, build system, and game registration.

### Engine & Systems
2. [**Rendering Engine**](rendering-engine.md)
   - High-DPI support, grid scaling, render loop, visual lerping, camera shake, screen flash, particle system, fog of war, entity drawing, and color utilities.

3. [**Input System**](input-system.md)
   - Keyboard mapping, swipe gestures, virtual joystick, double-click detection, fire button, browser default prevention, and rotate-then-move mechanics.

4. [**Audio Management**](audio-management.md)
   - SoundManager class, all SFX synthesis recipes with frequency tables, BGM handling, mute controls, and Web Audio API patterns.

### Game Design
5. [**State Management & Lifecycle**](state-flow.md)
   - State container pattern, lifecycle state machine, overlay system, level init, difficulty scaling, entity lifecycle flags, and the `tick()` orchestrator.

6. [**Game Mechanics**](game-mechanics.md)
   - Maze generation, wall placement, safe spawning, edge spawning, collision detection (grid + sub-grid), item lifecycle, AoE explosions, invulnerability, monster AI, and bot AI decision trees.

### Visual Design
7. [**UI & Styling**](ui-styling.md)
   - Color palette, typography, HUD pattern, overlay CSS, top bar, message bar, glassmorphism cards, gradient text, responsive breakpoints, CSS resets, favicon pattern, and Pug template skeleton.

---

## How to Build a New Game

### Quick Start Checklist
1. Create `src/<game-name>/` with the 8 core files (see [Core Architecture](core-architecture.md) §1).
2. Copy the Pug template skeleton from [UI & Styling](ui-styling.md) §12.
3. Define your state interfaces in `state.ts` (see [State Management](state-flow.md) §1).
4. Implement the render loop with DPI handling (see [Rendering Engine](rendering-engine.md) §1-3).
5. Wire keyboard + touch input (see [Input System](input-system.md) §2-4).
6. Add synthesized SFX using the recipe book (see [Audio Management](audio-management.md) §3).
7. Register the game in `src/script.ts` (see [Core Architecture](core-architecture.md) §5).
8. Run `npm run build` and `npm start`.

### Design Principles
- **Dark mode only** — Use the established color palette.
- **Canvas for gameplay, HTML for UI** — Overlays, HUD, and buttons are DOM elements.
- **Mobile-first** — Touch controls are required; keyboard is a bonus.
- **Procedural audio** — Generate SFX with Web Audio API; avoid large asset downloads.
- **Grid-based** — All games use cell-based coordinate systems for consistent scaling.

---

## Source Reference

| KB Document           | Primary Sources                                        | Lines Analyzed |
|------------------------|--------------------------------------------------------|----------------|
| Core Architecture      | `build.js`, `src/script.ts`, both `main.ts`            | ~200           |
| Rendering Engine       | `dark-maze/renderer.ts`, `tank-shot/renderer.ts`       | ~1000          |
| Input System           | `dark-maze/input.ts`, `tank-shot/input.ts`             | ~250           |
| Audio Management       | `dark-maze/utils.ts`, `tank-shot/sound.ts`             | ~500           |
| State & Lifecycle      | Both `state.ts`, both `game.ts`                        | ~800           |
| Game Mechanics         | `tank-shot/bot-ai.ts`, `tank-shot/items.ts`, `dark-maze/utils.ts`, `dark-maze/game.ts` | ~750 |
| UI & Styling           | `index.scss`, both `style.scss`, both `index.pug`      | ~750           |
