# 🌑 Dark Maze - Technical Documentation

A procedural survival maze game where the player must navigate through total darkness. 

## 🛠️ Technical Stack
- **Language**: TypeScript
- **Rendering**: HTML5 Canvas (2D Context)
- **Styling**: SCSS (Mobile-first responsive)
- **Engine**: Custom procedural logic (Recursive Backtracker + Braiding)

---

## 🏗️ Architecture & Flow

### 1. State Management (`state.ts`)
The game uses a centralized `GameStore` to manage both the current level's `GameState` and global session data (like `trail` and `animFrame`).
- **Trail**: A `Record<string, number>` storing `row,col` keys and the timestamp of the last visit to handle the "fading path" effect.
- **Emotion**: A string-based state (`worried`, `scared`, `happy`, etc.) that drives the procedural character drawing.

### 2. The Game Loop (`main.ts` & `renderer.ts`)
- `main.ts` sets up the `requestAnimationFrame` loop.
- `renderer.ts` handles the multi-layered drawing:
    1. **Clear/Background**: Solid dark color.
    2. **Fog of War Clipping**:
        - **Trail Layer**: Draws recently visited cells with a `globalAlpha` fade.
        - **Reveal Pulse**: A `clip()` circle generated when the player "touches" the screen.
        - **Player Glow**: A radial gradient light that follows the player.
    3. **Base Maze**: The `drawMazeBase()` function renders the actual walls, bombs, and monsters. This is usually clipped by the Fog of War but is called directly when `state.won` or `state.isDead` is true.
    4. **Procedural Character**: `drawBoyFace()` draws the player without external assets, using canvas primitives to animate eyes, mouth, and walking bob based on state.

### 3. Level Logic (`game.ts`)
- **Generation**: Uses `mazeGen` (recursive backtracker) and then "braids" the maze by randomly removing walls to ensure it's not a perfect tree (allowing loops/multiple paths).
- **Collision**: Checks every frame if the player's grid position matches a bomb or monster.
- **Input**: Supports Keyboard (WASD/Arrows), On-screen D-pad (for mobile), and Pointer (for "Reveal" pulses).

---

## ⚙️ Configuration (`constants.ts`)

You can easily tune the game difficulty here:
- `CELL`: Size of each grid square (default 32px).
- `SAFE_TOP / SAFE_BOTTOM`: Padding for HUD and Controls.
- `LEVELS`: An array of objects defining `touches`, `bombCount`, and `monsterTypes`.
- `REVEAL_DUR`: How long a "touch" reveal lasts (ms).
- `REVEAL_R`: The radius of the "touch" reveal.

---

## 📱 Mobile Responsiveness
The game is designed for "Vertical" play:
- **Canvas Scaling**: The canvas automatically resizes to `window.innerWidth/Height` in `main.ts`.
- **Dynamic HUD**: The HUD uses `flex-wrap` and `gap` to stay legible on narrow screens.
- **Large Touch Targets**: The D-pad buttons are sized for thumbs (50px) with `-webkit-tap-highlight-color` removed for a native feel.

---

## 🧪 How to Modify
1. **Add a new Monster**: Define its speed in `game.ts` -> `tickMonsters()` and add its emoji in `renderer.ts` -> `drawMazeBase()`.
2. **Change Character Style**: Modify the colors and shapes in `renderer.ts` -> `drawBoyFace()`.
3. **Add New Levels**: Simply append a new config object to the `LEVELS` array in `constants.ts`.
