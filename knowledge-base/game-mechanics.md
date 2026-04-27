# Game Mechanics Patterns

Reusable gameplay patterns extracted from `dark-maze` and `tank-shot`. Use these as building blocks for new mini-games.

---

## 1. Grid-Based World Generation

### Procedural Maze (Dark Maze)
Uses **recursive backtracking** (depth-first search) to carve a perfect maze, then "braids" it by removing ~20% of dead-end walls for multiple paths:

```typescript
function mazeGen(cols: number, rows: number) {
    const vis = Array.from({ length: rows }, () => new Array(cols).fill(false));
    const walls = {
        h: Array.from({ length: rows + 1 }, () => new Array(cols).fill(true)),
        v: Array.from({ length: rows }, () => new Array(cols + 1).fill(true)),
    };

    function carve(r: number, c: number) {
        vis[r][c] = true;
        const dirs = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        ].sort(() => Math.random() - 0.5);         // Randomize direction order

        for (const { dr, dc } of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !vis[nr][nc]) {
                // Remove the wall between current and neighbor
                if (dr === -1) walls.h[r][c] = false;
                else if (dr === 1) walls.h[r + 1][c] = false;
                else if (dc === -1) walls.v[r][c] = false;
                else walls.v[r][c + 1] = false;
                carve(nr, nc);
            }
        }
    }
    carve(0, 0);
    return walls;
}
```

### Braiding (Making mazes less frustrating)
```typescript
const braidAmount = Math.floor(cols * rows * 0.2);
for (let i = 0; i < braidAmount; i++) {
    const r = Math.floor(Math.random() * (rows - 1)) + 1;
    const c = Math.floor(Math.random() * (cols - 1)) + 1;
    if (Math.random() > 0.5) walls.h[r][c] = false;
    else walls.v[r][c] = false;
}
```

### Solvability Validation (BFS)
After placing hazards, verify the maze is still solvable:

```typescript
function isSolvable(rows, cols, walls, bombs): boolean {
    const bombSet = new Set(bombs.map(b => `${b.r},${b.c}`));
    const queue = [{ r: 0, c: 0 }];
    const visited = new Set(["0,0"]);

    while (queue.length > 0) {
        const { r, c } = queue.shift()!;
        if (r === rows - 1 && c === cols - 1) return true;
        // Try all 4 directions, skipping walls and bombs
        // ...
    }
    return false;
}
```

### Random Wall Placement (Tank Shot)
For combat games, simpler random placement with density control:

```typescript
const wallDensity = 0.1 + Math.min(0.2, level * 0.02);
const permRatio = 0.3 + Math.max(0, 0.4 - level * 0.05);

for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
        if (Math.random() < wallDensity) {
            grid[r][c] = Math.random() < permRatio
                ? WallType.PERMANENT
                : WallType.DESTRUCTIBLE;
        }
    }
}
// Always clear the player spawn point
grid[player.r][player.c] = WallType.NONE;
```

---

## 2. Entity Spawning

### Safe Spawning (Avoiding Overlaps)
Always check for collisions with existing entities before placing:

```typescript
function spawnEntity(type: string) {
    let attempts = 0;
    while (attempts < 50) {                              // Max attempts to prevent infinite loops
        const r = Math.floor(Math.random() * gridSize);
        const c = Math.floor(Math.random() * gridSize);

        if (grid[r][c] !== WallType.NONE) { attempts++; continue; }
        if (hasTankAt(r, c)) { attempts++; continue; }
        if (hasItemAt(r, c)) { attempts++; continue; }

        items.push({ r, c, type, alive: true, spawnTime: performance.now() });
        return;
    }
}
```

### Edge Spawning (Tank Shot Bots)
Spawn enemies from the edges of the screen, facing inward:

```typescript
function spawnBot() {
    const edge = Math.floor(Math.random() * 4); // 0=Top, 1=Right, 2=Bottom, 3=Left
    let r = 0, c = 0, dir: Direction, visualR: number, visualC: number;

    if (edge === 0) { r = 0; c = random(gridSize); dir = Direction.DOWN; visualR = -1; }
    else if (edge === 1) { r = random(gridSize); c = gridSize - 1; dir = Direction.LEFT; visualC = gridSize; }
    // ...

    // Ensure minimum distance from player
    if (Math.hypot(r - player.r, c - player.c) > 3 && !isOccupied(r, c)) {
        bots.push({ r, c, dir, visualR, visualC, /* ... */ });
    }
}
```

Setting `visualR = -1` (off-screen) creates a smooth "entry animation" as the lerp pulls the visual position toward the actual grid position.

---

## 3. Collision Detection

### Grid-Based (Exact Cell Match)
For grid-locked entities, collision is a simple coordinate comparison:

```typescript
// Player vs hazard (dark-maze)
if (bombs.some(b => b.r === player.r && b.c === player.c)) { takeDamage(); }
for (const m of monsters) {
    if (m.r === player.r && m.c === player.c) { takeDamage(); }
}
```

### Sub-Grid Distance (Tank Shot Bullets)
For entities with smooth movement (bullets), use distance thresholds:

```typescript
// Bullet vs tank (distance < 0.4 grid units)
if (Math.hypot(bullet.visualX - tank.c, bullet.visualY - tank.r) < 0.4) {
    // Hit!
}

// Bullet vs bullet (distance < 0.5)
if (Math.hypot(b1.visualX - b2.visualX, b1.visualY - b2.visualY) < 0.5) {
    // Cancel each other
    b1.active = false;
    b2.active = false;
}
```

### Line-of-Sight (Tank Shot AI)
Check for clear line-of-sight along rows/columns:

```typescript
function canSeeTarget(bot: Tank, tr: number, tc: number, grid: WallType[][]): boolean {
    if (bot.r === tr) {                              // Same row
        for (let c = Math.min(bot.c, tc) + 1; c < Math.max(bot.c, tc); c++) {
            if (grid[bot.r][c] !== WallType.NONE) return false;
        }
        return true;
    }
    if (bot.c === tc) {                              // Same column
        // Same pattern, iterate rows
    }
    return false;                                     // Not aligned = no LOS
}
```

---

## 4. Item Lifecycle

### Timed Spawning
Items spawn on cooldown timers with randomized intervals:

```typescript
function updateItems(ts: number) {
    // Only spawn if no instance of this type exists
    const hasHeart = items.some(i => i.alive && i.type === 'heart');
    if (!hasHeart && ts - lastHeartSpawn > 20000 + Math.random() * 20000) {
        spawnHeart();
        lastHeartSpawn = ts;
    }
}
```

### Despawning & Blinking
Items despawn after a set lifetime, with a visual warning:

```typescript
const age = ts - item.spawnTime;
const maxAge = 20000;                              // 20 seconds
const isExpiring = age > (maxAge - 5000);          // Last 5 seconds

// Blink effect (hide every other frame)
const blinkRate = 200;  // ms
const visible = isExpiring ? Math.floor(ts / blinkRate) % 2 === 0 : true;

if (age > maxAge) item.alive = false;              // Despawn
```

### Collection
```typescript
if (player.alive && player.r === item.r && player.c === item.c) {
    item.alive = false;
    if (item.type === 'heart') {
        if (lives < 5) lives++;
        else score += 500;                          // Overflow bonus
    } else if (item.type === 'powerup') {
        player.powerType = 'penetrating';
        player.powerTimer = ts + 15000;
    }
    soundManager.playCollect();
    updateHUD();
}
```

---

## 5. Area-of-Effect: Bomb Explosion (Tank Shot)

Destroys everything in a 3×3 grid radius:

```typescript
function explodeBomb(r: number, c: number) {
    soundManager.playLargeExplosion();
    state.shakeTimer = performance.now() + 1000;
    state.shakeIntensity = 15;

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (!inBounds(nr, nc)) continue;

            grid[nr][nc] = WallType.NONE;            // Destroy ALL walls (even permanent)
            spawnExplosion(nr, nc, '#ef4444');

            // Kill any tank in this cell
            if (player.alive && player.r === nr && player.c === nc) killPlayer();
            for (const bot of bots) {
                if (bot.alive && bot.r === nr && bot.c === nc) killBot(bot);
            }
        }
    }
}
```

---

## 6. Invulnerability / Guard Timer

After respawning, the player is temporarily invulnerable:

```typescript
player.guardTimer = performance.now() + 5000;    // 5 seconds of invulnerability

// In collision check:
if (player.guardTimer > performance.now()) {
    bullet.active = false;                         // Deflect bullet
    spawnExplosion(bullet.pos, '#ffffff');          // Visual feedback
    return;                                        // No damage
}
```

Visual feedback: A hexagonal "force shield" effect is drawn around the player during guard time (see `rendering-engine.md`).

---

## 7. Monster AI (Dark Maze)

Simple random-walk AI with speed classes:

```typescript
function tickMonsters(ts: number) {
    const speeds: Record<string, number> = { slow: 900, fast: 420 };
    for (const m of monsters) {
        if (ts - (m.lastMove || 0) < (speeds[m.type] || 900)) continue;
        m.lastMove = ts;
        const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        for (const d of dirs) {
            if (canMove(m.r, m.c, d)) {
                // Move in first valid random direction
                if (d === 0) m.r--;
                // ...
                break;
            }
        }
    }
    checkCollisions();
}
```

### Proximity Warnings
When a monster is within 2 cells, a pulsing ring warns the player:

```typescript
if (Math.hypot(m.r - player.r, m.c - player.c) <= 2) {
    const pulse = (Math.sin(ts * 0.005) + 1) * 0.5;
    ctx.strokeStyle = "rgba(255, 60, 0, 0.8)";
    ctx.arc(mx, my, CELL * (1 + 0.2 * pulse), 0, Math.PI * 2);
    ctx.stroke();
}
```

---

## 8. Bot AI System (Tank Shot)

Three bot classes with distinct behaviors:

| Class      | Speed   | Aggression | Special Behavior                             |
|------------|---------|------------|----------------------------------------------|
| Scout      | Fast    | Low        | Flanks via secondary paths, collects powerups |
| Heavy      | Slow    | High       | Blasts through walls, blocks hearts           |
| Tactician  | Medium  | Medium     | Triggers bombs near player, prioritizes items |

### AI Decision Tree (Per Tick)
```
1. Select Target
   ├─ Is player near a heart? → Move to block it (Tactician/Heavy)
   ├─ Is there a nearby powerup? → Move to collect it (Scout/Tactician)
   ├─ Is there a bomb near player? → Shoot the bomb (Tactician)
   └─ Default → Target the player

2. Has Line-of-Sight to target?
   ├─ YES & target is shootable → Face target, then shoot
   └─ NO → Hunt mode
       ├─ Primary direction toward target
       ├─ If blocked by destructible wall → Shoot wall
       ├─ If blocked by permanent wall → Try secondary direction
       └─ If stuck → Random movement (or shoot randomly for Heavy)
```

### Power-up Speed Boost
Powered-up bots act 30% faster:
```typescript
if (bot.powerType !== 'none') actionDelay *= 0.7;
```
