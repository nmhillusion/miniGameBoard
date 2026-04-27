# Core Architecture: Mini-Game Pattern

This document defines the canonical architecture every mini-game in this project **must** follow. Patterns are extracted from the live implementations of `dark-maze` and `tank-shot`.

---

## 1. Directory Structure

Each mini-game lives in `src/<game-name>/` with these standard files:

```text
src/<game-name>/
├── main.ts        # Bootstrapper: canvas init, resize, overlay wiring, event listeners
├── game.ts        # Core logic: initLevel(), tick/update(), collision, win/die, HUD updates
├── state.ts       # Type definitions (interfaces) + the single exported state object
├── renderer.ts    # Canvas drawing: render loop, all visual drawing functions
├── input.ts       # Keyboard, touch, pointer handling — maps raw events to game actions
├── constants.ts   # Enums, magic numbers, level configs — all tweakable params
├── index.pug      # HTML template (compiled to HTML by the build engine)
├── style.scss     # Game-specific styling (compiled to CSS)
├── README.md      # Game-specific design documentation
└── [optional]
    ├── utils.ts       # Shared algorithms (maze gen, pathfinding, particles, audio helpers)
    ├── sound.ts       # Dedicated SoundManager class (for complex audio needs)
    ├── bot-ai.ts      # AI behavior module (when enemies have complex decision trees)
    ├── items.ts       # Item/power-up spawn, collection, and lifecycle logic
    └── assets/        # Static files (mp3, images) — auto-copied by the build engine
```

### File Count Guideline
- A simple game: **8 files** (main, game, state, renderer, input, constants, pug, scss)
- A complex game: **10-12 files** (add sound, bot-ai, items, utils as needed)

---

## 2. Component Responsibilities (Detailed)

### `main.ts` — The Bootstrapper
Owns the canvas element and the bridge between HTML and the game engine. It:
- Obtains the `<canvas>` element and its `2d` context.
- Calls `setContext(ctx)` to pass the context to `renderer.ts`.
- Defines and invokes `resizeCanvas()`, binding it to `window.resize`.
- Wires DOM event listeners for overlay buttons (`#ov-btn`), home (`#btn-home`), and mute toggles.
- Exports `handleOverlayAction()` which handles start/restart/next-level transitions.
- Starts the `requestAnimationFrame` loop by calling `render()`.

**Key pattern — Tank Shot overlay handler:**
```typescript
export function handleOverlayAction() {
    let s = gameContainer.state;
    if (!s) {
        s = gameContainer.state = initState(W, H, gridSize);
        initLevel(1);
    } else if (s.won) {
        initLevel(s.level + 1);
    } else if (s.isDead) {
        s = gameContainer.state = initState(W, H, gridSize);
        initLevel(1);
    }
    resizeCanvas();
    overlay.style.display = "none";
    soundManager.playBGM();
    s.animFrame = requestAnimationFrame(render);
}
```

### `state.ts` — The Source of Truth
Defines all TypeScript interfaces and exports the single mutable state object.
- **NEVER** contains logic or functions beyond a `initState()` factory.
- All entity types (`Tank`, `Bullet`, `Particle`, `Item`, `Monster`) are interfaces here.
- The state is often wrapped in a container to allow full reassignment:

**Pattern A (Tank Shot):** Container with nullable inner state, plus a factory function.
```typescript
export const state: { state: GameState | null } = { state: null };
export function initState(W, H, gridSize): GameState { return { ... }; }
```

**Pattern B (Dark Maze):** Container with screen dimensions alongside partial state.
```typescript
export const state: GameStore = { W: 320, H: 320, state: {}, trail: {}, animFrame: null };
```

### `game.ts` — The Brain
The central hub for game mechanics. Responsibilities:
- `initLevel(level)` — Generates the grid/maze, spawns entities, resets timers.
- `updateHUD()` — Writes game stats to DOM elements (`#h-level`, `#h-score`, etc.).
- `setMsg(text)` — Shows transient messages via `#msg-bar`.
- Collision detection (`checkCollisions()`).
- Damage, death, and win conditions (`takeDamage()`, `die()`, `winLevel()`).
- `tick(ts)` — Called every frame to update all subsystems (bullets, AI, items).

### `renderer.ts` — The Painter
**Only reads state; never mutates it** (except visual interpolation fields like `visualR`, `visualC`).
- Exports `setContext()` to receive the canvas context from `main.ts`.
- Exports `render(ts)` which is the `requestAnimationFrame` callback.
- Calls `tick(ts)` at the top of each frame (or the game module does this).
- Draws layers in order: background → grid/walls → entities → effects → particles → HUD overlays.
- Exports `showOverlay(title, desc, btn)` to transition to menu screens.

### `input.ts` — The Sensor
Maps physical input to game actions. Must handle:
- **Keyboard**: Arrow keys + WASD for movement, Space for action, Enter for overlay.
- **Touch**: Swipe detection (dark-maze) or virtual joystick (tank-shot).
- **Pointer**: `pointerdown` for click-based actions (e.g., double-click reveal).
- **Guard clauses**: Always check `!state || !state.alive || state.won || state.isDead` before processing.

### `constants.ts` — The Config
All magic numbers live here. This makes tuning easy and keeps logic files clean.
```typescript
// Enums
export enum Direction { UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3 }
export enum WallType { NONE = 0, PERMANENT = 1, DESTRUCTIBLE = 2 }

// Direction vectors (indexed by Direction enum)
export const DIR_VECTORS = [
    { r: -1, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 0, c: -1 }
];

// Tuning
export const SHAKE_DUR = 500;
export const EXPLOSION_PARTICLES = 15;

// Level progression table
export const LEVELS = [
    { touches: 5, bombCount: 3, monsterTypes: [] },
    { touches: 4, bombCount: 4, monsterTypes: ["slow"] },
    // ...
];
```

---

## 3. Data Flow

```
┌──────┐    init     ┌──────┐   mutates   ┌───────┐   reads    ┌──────────┐
│ main │ ──────────▶ │ game │ ──────────▶ │ state │ ◀──────── │ renderer │
└──────┘             └──────┘             └───────┘            └──────────┘
     │                   ▲                     ▲                     │
     │                   │                     │                     │
     │              ┌─────────┐          ┌──────────┐                │
     └─ events ──▶  │  input  │          │  bot-ai  │   tick() ◀─────┘
                    └─────────┘          │  items   │
                         │               └──────────┘
                    calls game
                    functions
```

- **`main` → `game`**: Calls `initLevel()`, `handleOverlayAction()`.
- **`input` → `game`**: Calls `movePlayer()`, `tryMove()`, `shoot()`.
- **`game` → `state`**: Mutates the global state object.
- **`renderer` → `state`**: Reads state to draw. Also updates `visualR`/`visualC` for lerp.
- **`renderer` → `game`**: Calls `tick(ts)` each frame.
- **`game` → `bot-ai`/`items`**: Delegates `updateBots(ts)`, `updateItems(ts)` inside `tick()`.

---

## 4. Build System

Uses `@nmhillusion/n2ngin-bull-engine` via `build.js`:

```javascript
const engine = new BullEngine();
engine.config({
    rootDir: __dirname + "/src",
    outDir: __dirname + "/dist",
    pug: { enabled: true },
    scss: { enabled: true },
    typescript: { enabled: true },
    copyResource: {
        enabled: true,
        config: { extsToCopy: [".jpg", ".png", ".gif", ".mp3", /* ... */] }
    },
    rewriteJavascript: { enabled: true, config: { rewriteImport: true } }
});
```

**Key rules:**
- TypeScript is compiled to ES Modules.
- All `.ts` imports must use the `.js` extension (e.g., `import { state } from './state.js'`).
- Pug compiles to HTML, SCSS compiles to CSS.
- Static assets (images, audio) in `assets/` folders are copied verbatim.
- The build output goes to `dist/`, served via `serve dist`.

---

## 5. Registering a New Game on the Board

After creating `src/<game-name>/`, add an entry in `src/script.ts`:

```typescript
const GAME_INDEXES = [
  // ... existing games
  {
    id: 3,
    name: "New Game Name",
    description: "A short description of the game.",
    url: "<game-name>/index.html",
    icon: "🎯",
  },
];
```
