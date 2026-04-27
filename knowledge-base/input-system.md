# Input System Patterns

Comprehensive input handling patterns extracted from `dark-maze/input.ts` and `tank-shot/input.ts`.

---

## 1. Guard Clauses (Always First)

Every input handler **must** check the game state before processing:

```typescript
const s = gameContainer.state;
if (!s || !s.alive || s.won || s.isDead) return;
// For player-specific actions:
if (!s.player.alive) return;
```

This prevents inputs from being processed during overlays, death animations, or win screens.

---

## 2. Keyboard Input

### Direct Key Mapping
Both games use `keydown` with both Arrow keys and WASD:

```typescript
window.addEventListener("keydown", (e) => {
    const s = state;
    if (!s || !s.alive || s.won || s.isDead) return;

    switch (e.key) {
        case "ArrowUp": case "w": case "W":
            movePlayer(Direction.UP); break;
        case "ArrowDown": case "s": case "S":
            movePlayer(Direction.DOWN); break;
        case "ArrowLeft": case "a": case "A":
            movePlayer(Direction.LEFT); break;
        case "ArrowRight": case "d": case "D":
            movePlayer(Direction.RIGHT); break;
        case " ":
            shoot(s.player); break;
    }
});
```

### Enter Key for Overlay Transitions
Tank Shot lets the Enter key start/restart the game:

```typescript
if (e.key === "Enter") {
    if (!s || s.won || s.isDead) {
        onOverlayAction();
        return;
    }
}
```

---

## 3. Touch Input — Swipe Detection (Dark Maze)

For maze/puzzle games where movement is directional, use swipe gestures:

```typescript
let touchStartX = 0, touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

canvas.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 20) {       // Minimum swipe distance threshold
        if (absDx > absDy) {
            movePlayer(dx > 0 ? Direction.RIGHT : Direction.LEFT);
        } else {
            movePlayer(dy > 0 ? Direction.DOWN : Direction.UP);
        }
    }
}, { passive: true });
```

**Key design choice**: Use `screenX`/`screenY` (not `clientX`/`clientY`) for swipes, as they're more stable during browser UI interactions.

---

## 4. Touch Input — Virtual Joystick (Tank Shot)

For action games needing continuous directional input, implement a virtual joystick:

### HTML Structure
```pug
#controls-layer
  #joystick-zone
    #joystick-base
      #joystick-thumb
  #fire-zone
    button#btn-fire 🚀
```

### JavaScript Logic
```typescript
function initJoystick() {
    const base = document.getElementById("joystick-base");
    const thumb = document.getElementById("joystick-thumb");

    let active = false;
    let startX = 0, startY = 0;
    let moveInterval: number | null = null;
    let currentDir: Direction | null = null;

    const handleStart = (x: number, y: number) => {
        active = true;
        startX = x; startY = y;
        thumb.style.transition = "none";
    };

    const handleMove = (x: number, y: number) => {
        if (!active) return;
        const dx = x - startX, dy = y - startY;
        const dist = Math.hypot(dx, dy);
        const maxDist = 40;
        const ratio = Math.min(1, dist / maxDist);
        const angle = Math.atan2(dy, dx);

        // Move the thumb visually
        thumb.style.transform = `translate(${Math.cos(angle) * ratio * maxDist}px, ${Math.sin(angle) * ratio * maxDist}px)`;

        if (dist > 20) {                     // Dead zone threshold
            const deg = angle * 180 / Math.PI;
            let dir: Direction;
            if (deg > -45 && deg <= 45) dir = Direction.RIGHT;
            else if (deg > 45 && deg <= 135) dir = Direction.DOWN;
            else if (deg > 135 || deg <= -135) dir = Direction.LEFT;
            else dir = Direction.UP;

            if (currentDir !== dir) {
                currentDir = dir;
                tryMove(player, dir);         // Immediate action on direction change
                if (moveInterval) clearInterval(moveInterval);
                moveInterval = setInterval(() => {
                    if (active && currentDir !== null) tryMove(player, currentDir);
                }, 200);                      // Repeat interval for held direction
            }
        } else {
            currentDir = null;                // Inside dead zone — stop
            if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
        }
    };

    const handleEnd = () => {
        active = false;
        thumb.style.transition = "transform 0.2s";
        thumb.style.transform = "translate(0, 0)";
        currentDir = null;
        if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
    };

    // Bind both touch AND mouse events
    base.addEventListener("touchstart", (e) => { e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY); });
    window.addEventListener("touchmove", (e) => { if (active) handleMove(e.touches[0].clientX, e.touches[0].clientY); });
    window.addEventListener("touchend", handleEnd);
    base.addEventListener("mousedown", (e) => handleStart(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));
    window.addEventListener("mouseup", handleEnd);
}
```

### CSS for the Joystick
```scss
#controls-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;          // Pass through by default
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 2rem;

  #joystick-zone, #fire-zone { pointer-events: auto; }

  #joystick-base {
    width: min(120px, 30vw);     // Responsive sizing
    height: min(120px, 30vw);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  #joystick-thumb {
    width: 45px; height: 45px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
  }
}

// Hide on desktop (keyboard is primary)
@media (min-width: 1024px) {
  #controls-layer {
    opacity: 0.3;
    pointer-events: none;
    &:hover { opacity: 0.8; }
  }
}
```

---

## 5. Double-Click / Double-Tap Detection (Dark Maze)

For special actions triggered by rapid tapping:

```typescript
canvas.addEventListener("pointerdown", (e) => {
    const now = performance.now();
    const timeSinceLastClick = now - (state.lastClickTime || 0);
    state.lastClickTime = now;

    if (timeSinceLastClick > 300) {          // Too slow — not a double-click
        return;
    }

    // Double-click detected! Execute special action
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasW / rect.width);
    const y = (e.clientY - rect.top) * (canvasH / rect.height);
    revealAt(x, y);
});
```

> **Note**: The coordinate transformation `(e.clientX - rect.left) * (canvasW / rect.width)` accounts for CSS sizing vs canvas resolution differences.

---

## 6. Fire Button (Tank Shot)

A dedicated HTML button for shooting on mobile:

```typescript
const btnFire = document.getElementById("btn-fire");
btnFire.addEventListener("touchstart", (e) => {
    e.preventDefault();          // Prevent ghost clicks
    if (s && s.player.alive && !s.won && !s.isDead) shoot(s.player);
});
btnFire.addEventListener("mousedown", (e) => {
    if (s && s.player.alive && !s.won && !s.isDead) shoot(s.player);
});
```

---

## 7. Preventing Browser Defaults

**Critical for mobile gameplay.** Without these, the browser scrolls, zooms, or shows context menus during play:

```typescript
// Prevent scroll when touching the canvas
document.addEventListener('touchmove', (e) => {
    if (e.target === canvas || (e.target as HTMLElement).closest('#controls-layer')) {
        e.preventDefault();
    }
}, { passive: false });
```

```scss
body { touch-action: none; }    // CSS-level prevention
canvas { touch-action: none; }  // Disable all default touch behaviors on canvas
```

```pug
// Viewport meta to prevent zoom
meta(name="viewport", content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no")
```

---

## 8. Movement Mechanic: Rotate-Then-Move (Tank Shot)

Tank Shot uses a "rotate first, then move" pattern. Pressing a direction once rotates the tank; pressing the same direction again moves it:

```typescript
export function tryMove(tank: Tank, dir: Direction) {
    if (tank.dir !== dir) {
        tank.dir = dir;     // First press: rotate only
        return;
    }
    // Second press (same direction): move forward
    const vec = DIR_VECTORS[dir];
    const nr = tank.r + vec.r;
    const nc = tank.c + vec.c;
    if (isInBounds(nr, nc) && grid[nr][nc] === WallType.NONE && !isOccupied(nr, nc)) {
        tank.r = nr;
        tank.c = nc;
    }
}
```

This creates a deliberate, tactical feel suitable for grid-based combat games.
