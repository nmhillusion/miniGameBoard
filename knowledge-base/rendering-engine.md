# Rendering Engine Patterns

Comprehensive canvas rendering techniques extracted from `dark-maze/renderer.ts` (517 lines) and `tank-shot/renderer.ts` (477 lines).

---

## 1. High-DPI (Retina) Support

To prevent blurry graphics on high-resolution screens, always account for `devicePixelRatio`. **Tank Shot implements this; Dark Maze does not — new games should follow Tank Shot's approach.**

```typescript
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight - hudHeight;

    // 1. Set display size (CSS pixels)
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // 2. Set actual buffer size (Physical pixels)
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // 3. Scale the context so drawing coords remain in CSS pixels
    ctx.scale(dpr, dpr);
}
```

> **Gotcha**: After calling `ctx.scale(dpr, dpr)`, always draw using CSS pixel coordinates, not physical pixels. The context transformation handles the rest.

---

## 2. Grid-Based Responsive Scaling

Instead of hardcoded pixel values, compute a dynamic `cell` size that fits the screen.

```typescript
// Adapt grid density to screen width
const gridSize = screenWidth > 1024 ? 21 : (screenWidth > 600 ? 15 : 10);

// Calculate cell size to fill available space
const padding = Math.min(20, screenWidth * 0.05);
const availW = screenWidth - padding * 2;
const availH = screenHeight - padding * 2;
const cell = Math.floor(Math.min(availW / gridSize, availH / gridSize));

// Center the board
const boardSize = gridSize * cell;
const offsetLeft = (screenWidth - boardSize) / 2;
const offsetTop = (screenHeight - boardSize) / 2;
```

**Use `offsetLeft` and `offsetTop` everywhere** when translating grid coordinates to canvas pixels:
```typescript
const pixelX = offsetLeft + col * cell;
const pixelY = offsetTop + row * cell;
```

---

## 3. The Render Loop

The `render(ts)` function is the `requestAnimationFrame` callback. It always follows this structure:

```typescript
export function render(ts: number) {
    if (!ctx) return;
    const s = state;
    if (!s) return;

    // 1. Run game logic
    tick(ts);

    // 2. Camera Shake
    let sx = 0, sy = 0;
    if (ts < s.shakeTimer) {
        const prog = (s.shakeTimer - ts) / SHAKE_DUR;
        sx = (Math.random() - 0.5) * s.shakeIntensity * prog;
        sy = (Math.random() - 0.5) * s.shakeIntensity * prog;
    }

    // 3. Clear and set up transform
    ctx.clearRect(0, 0, s.width, s.height);
    ctx.save();
    ctx.translate(sx, sy);

    // 4. Draw layers (back to front)
    drawGrid();
    drawWalls();
    drawEntities();
    drawBullets();
    drawItems();
    drawParticles();
    drawScreenEffects();

    // 5. Restore and schedule next frame
    ctx.restore();
    if (s.animFrame !== null) s.animFrame = requestAnimationFrame(render);
}
```

> **Important**: Store the `requestAnimationFrame` ID in `state.animFrame` so it can be canceled when showing overlays or switching games.

---

## 4. Visual Interpolation (Lerping)

Entities move on a discrete grid but are drawn with smooth interpolation. Both games use the same lerp pattern:

```typescript
// In render(), before drawing:
const lerpSpeed = 0.2; // 0.18 in dark-maze, 0.2 in tank-shot
entity.visualR += (entity.r - entity.visualR) * lerpSpeed;
entity.visualC += (entity.c - entity.visualC) * lerpSpeed;

// Draw at the visual position, not the logical position
const x = offsetLeft + (entity.visualC + 0.5) * cell;
const y = offsetTop + (entity.visualR + 0.5) * cell;
```

This makes grid-based movement feel fluid without complex animation systems.

---

## 5. Camera Shake

Both games use the same shake pattern. Trigger it by setting `shakeTimer` and `shakeIntensity` in the state:

```typescript
// Trigger shake (in game.ts)
state.shakeTimer = performance.now() + durationMs;
state.shakeIntensity = pixelIntensity;

// Apply shake (in renderer.ts, before drawing)
if (ts < state.shakeTimer) {
    const progress = (state.shakeTimer - ts) / SHAKE_DUR;
    sx = (Math.random() - 0.5) * state.shakeIntensity * progress;
    sy = (Math.random() - 0.5) * state.shakeIntensity * progress;
}
ctx.translate(sx, sy);
```

Typical values:
- Small hit: `duration=400, intensity=5`
- Explosion: `duration=600, intensity=8-16`
- Bomb blast: `duration=1000, intensity=15`

---

## 6. Screen Flash

Dark Maze implements a full-screen color flash for impacts:

```typescript
// Trigger
state.flashColor = "rgba(255, 60, 0, 0.45)";
state.flashTimer = performance.now() + 400;
state.flashDur = 400;

// Draw (at end of render, after all entities)
if (ts < state.flashTimer) {
    const progress = (state.flashTimer - ts) / state.flashDur;
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.fillStyle = state.flashColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}
```

---

## 7. Particle System

Both games share an identical particle architecture. Particles are simple objects stored in an array on the state:

```typescript
interface Particle {
    x: number; y: number;           // Current position
    vx: number; vy: number;         // Velocity
    life: number;                   // 1.0 → 0.0
    decay: number;                  // Life lost per frame
    color: string;                  // Fill color
    size: number;                   // Pixel size
    type?: string;                  // "fire" | "smoke" | "spark" | "confetti"
}
```

**Spawning** (fire + smoke + sparks for an explosion):
```typescript
function spawnExplosion(x, y) {
    // Fire (30 particles, fast, warm colors)
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        particles.push({
            x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 5, life: 1.0, decay: 0.02 + Math.random() * 0.03,
            color: ["#ff4500", "#ff8c00", "#ff0000"][Math.floor(Math.random() * 3)]
        });
    }
    // Smoke (20 particles, slow, float upward, dark colors)
    // Sparks (15 particles, very fast, tiny, white/yellow)
}
```

**Updating & Drawing** (in the render loop):
```typescript
for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;        // Gravity
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
}
ctx.globalAlpha = 1;
```

---

## 8. Drawing Complex Entities

### Tank Drawing (tank-shot)
Drawn procedurally with gradients — no images. Layer order:
1. **Tracks** (left & right, metallic gradient, animated segments)
2. **Chassis** (body gradient from base color to darker variant)
3. **Barrel** (metallic gradient with muzzle brake)
4. **Turret** (radial gradient, highlight dot)
5. **Power-up aura** (glow ring when powered up)
6. **Force Shield** (hexagonal grid pattern + shimmer effect)

Rotation is handled via `ctx.translate(centerX, centerY)` + `ctx.rotate(dir * 90 * PI / 180)`.

### Character Drawing (dark-maze)
Multi-directional chibi character drawn with Canvas primitives:
- 4 directional views (UP=back, DOWN=front, LEFT/RIGHT=side)
- Walk cycle animation using `Math.sin(ts * speed)` for leg/arm swing
- Emotion system: `worried`, `scared`, `happy`, `shocked`, `frustrated`, `curious`, `determined`, `sad`
- Blinking timer (random intervals)
- Breathing scale: `1.0 + Math.sin(ts * 0.0022) * 0.035`

### Wall Drawing (tank-shot)
- **Permanent walls**: Dark metallic plate with steel frame, rivets at corners, X-brace detail
- **Destructible walls**: Red brick pattern with mortar, gradient-shaded bricks, offset rows

---

## 9. Fog of War (dark-maze specific)

The maze is hidden by default. Visibility is revealed through:

1. **Trail-based visibility**: Visited cells are shown with a fading trail (`trail` map with timestamps, `TRAIL_MAX_AGE = 10000ms`).
2. **Player proximity**: A radial gradient clip around the player position reveals a small area.
3. **Touch reveal**: Double-clicking reveals a circular area (`REVEAL_R = 72px`) that fades over `REVEAL_DUR = 1600ms`.

```typescript
// Radial visibility around player
ctx.save();
const gOuter = ctx.createRadialGradient(px, py, 0, px, py, CELL * 0.8);
gOuter.addColorStop(0, "rgba(255,255,255,1)");
gOuter.addColorStop(0.8, "rgba(255,255,255,0.8)");
gOuter.addColorStop(1, "rgba(255,255,255,0)");
ctx.beginPath(); ctx.arc(px, py, CELL * 0.8, 0, Math.PI * 2); ctx.clip();
drawMazeBase();
ctx.restore();
```

---

## 10. Crisp 1-Pixel Lines

For grid lines that are exactly 1 CSS pixel wide, offset by 0.5:

```typescript
const y = Math.floor(offsetTop + i * cell) + 0.5; // +0.5 for crisp 1px lines
ctx.moveTo(offsetLeft, y);
ctx.lineTo(offsetLeft + gridSize * cell, y);
```

---

## 11. Color Utilities

A reusable `adjustColor()` function shifts hex colors lighter or darker:

```typescript
function adjustColor(hex: string, amt: number): string {
    let usePound = hex[0] === "#";
    if (usePound) hex = hex.slice(1);
    let num = parseInt(hex, 16);
    let r = Math.min(255, Math.max(0, (num >> 16) + amt));
    let g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amt));
    let b = Math.min(255, Math.max(0, (num & 0xFF) + amt));
    return (usePound ? "#" : "") + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
}
```

Usage: `adjustColor('#38bdf8', -40)` → darker blue for gradient stops.
