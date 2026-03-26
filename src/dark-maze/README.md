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
        - **Reveal Pulse**: A `clip()` circle generated when the player "double-taps" or "double-clicks" the screen.
        - **Player Glow**: A radial gradient light that follows the player.
    3. **Base Maze**: The `drawMazeBase()` function renders the actual walls, bombs, and monsters. This is usually clipped by the Fog of War but is called directly when `state.won` or `state.isDead` is true.
    4. **Procedural Character**: `drawBoyFace()` draws the player without external assets, using canvas primitives to animate eyes, mouth, and walking bob based on state.

### 3. Input & Interaction (`input.ts`)
The game is optimized for mobile-first, vertical play:
- **Swipe to Move**: Uses `touchstart` and `touchend` to detect swipe direction (Up, Down, Left, Right).
- **Double-Tap to Reveal**: A rapid double-tap (within 300ms) consumes a "Touch" to create a temporary reveal pulse around the touch point.
- **Keyboard Support**: Full WASD and Arrow key support for desktop play.
- **Auto-Music**: Any first interaction (swipe, tap, key) triggers `startMusic()` to comply with browser autoplay policies.

---

## ⚙️ Configuration (`constants.ts`)

You can easily tune the game difficulty here:
- `CELL`: Size of each grid square (default 32px).
- `REVEAL_DUR`: How long a "touch" reveal lasts (ms).
- `REVEAL_R`: The radius of the "touch" reveal.
- `LEVELS`: An array defining `touches`, `bombCount`, and `monsterTypes`.

---

## 📱 Mobile Responsiveness
- **Gestures**: Intuitive swipe-to-move removes the need for an on-screen D-pad, maximizing the visible game area.
- **Canvas Scaling**: The canvas automatically resizes to `window.innerWidth/Height`.
- **Touch Targets**: Double-tap threshold is tuned for mobile responsiveness (300ms).
- **HUD**: Uses `backdrop-filter: blur` and semi-transparent backgrounds for a modern mobile look.

## 🎵 Music License

The background music, "Dark Ambience Loop," is by Iwan Gabovitch. It is licensed under **CC-BY 3.0**. Attribution is required: "Dark Ambience Loop by Iwan Gabovitch".

---

## 🧪 How to Modify
1. **Add a new Monster**: Define its speed in `game.ts` -> `tickMonsters()` and add its emoji in `renderer.ts` -> `drawMazeBase()`.
2. **Change Character Style**: Modify the colors and shapes in `renderer.ts` -> `drawBoyFace()`.
3. **Add New Levels**: Simply append a new config object to the `LEVELS` array in `constants.ts`.
