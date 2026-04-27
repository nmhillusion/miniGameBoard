# State Management & Game Lifecycle

Patterns for managing game state, level transitions, and the Start → Play → Win/Die → Restart lifecycle.

---

## 1. The State Object Architecture

### Interface Hierarchy
Define granular interfaces for each entity type, then compose them into the `GameState`:

```typescript
// Entity interfaces
export interface Particle {
    x: number; y: number; vx: number; vy: number;
    life: number; decay: number; color: string; size: number;
    type?: string;
}

export interface Tank {
    r: number; c: number;               // Logical grid position
    dir: Direction;
    visualR: number; visualC: number;   // Interpolated drawing position
    lastAction: number;                 // Timestamp for action cooldowns
    alive: boolean;
    type: 'player' | 'bot';
    powerType: 'none' | 'penetrating';
    powerTimer: number;
    guardTimer: number;
    botClass?: 'scout' | 'heavy' | 'tactician';
}

export interface Bullet {
    r: number; c: number;
    dir: Direction;
    owner: 'player' | 'bot';
    active: boolean;
    visualX: number; visualY: number;    // Sub-grid position for smooth movement
    penetrating: boolean;
}

export interface Item {
    r: number; c: number;
    type: 'heart' | 'bomb' | 'powerup';
    alive: boolean;
    spawnTime: number;                   // Used for despawn timers & blink effects
}

// Composite game state
export interface GameState {
    level: number;
    score: number;
    lives: number;
    grid: WallType[][];
    player: Tank;
    bots: Tank[];
    bullets: Bullet[];
    items: Item[];
    particles: Particle[];
    cell: number;
    width: number; height: number;
    offsetLeft: number; offsetTop: number;
    won: boolean;
    isDead: boolean;
    shakeTimer: number;
    shakeIntensity: number;
    gridSize: number;
    animFrame: number | null;
    // Spawn timers
    lastHeartSpawn: number;
    lastBombSpawn: number;
    lastPowerupSpawn: number;
    // Progress tracking
    totalBotsToSpawn: number;
    botsSpawnedCount: number;
    botsDestroyedCount: number;
}
```

### The Container Pattern
The state object is wrapped in a container so it can be fully replaced (for restarting):

```typescript
// Tank Shot style: nullable inner state
export const state: { state: GameState | null } = { state: null };

// Dark Maze style: container with screen dimensions
export const state: GameStore = {
    W: 320, H: 320,
    state: {} as Partial<GameState>,
    trail: {},
    animFrame: null,
    nextLevelTarget: null,
};
```

**Why a container?** JavaScript modules export bindings by reference. If you export `let state = {...}` and reassign it, other modules won't see the new value. The container object stays stable — only its `.state` property changes.

### The `initState()` Factory
Returns a fresh, fully-initialized state:

```typescript
export function initState(W: number, H: number, gridSize: number): GameState {
    return {
        level: 1, score: 0, lives: 3,
        grid: [], player: { r: 0, c: 0, dir: Direction.UP, /* ... */ },
        bots: [], bullets: [], items: [], particles: [],
        cell: 40, width: W, height: H,
        offsetLeft: 0, offsetTop: 0,
        won: false, isDead: false,
        shakeTimer: 0, shakeIntensity: 0,
        gridSize, animFrame: null,
        lastHeartSpawn: performance.now(),
        lastBombSpawn: performance.now(),
        lastPowerupSpawn: performance.now(),
        totalBotsToSpawn: 0, botsSpawnedCount: 0, botsDestroyedCount: 0,
    };
}
```

---

## 2. The Lifecycle State Machine

```
 ┌──────────────────────────────────────────┐
 │                 OVERLAY                   │
 │  (Start / Game Over / Level Complete)    │
 │    [#overlay display:flex]               │
 └─────────────┬────────────────────────────┘
               │ click #ov-btn
               ▼
 ┌──────────────────────────────────────────┐
 │               PLAYING                     │
 │  [#overlay display:none]                 │
 │  [requestAnimationFrame active]          │
 │  [input handlers active]                 │
 └──────┬───────────────────────┬───────────┘
        │ all bots destroyed    │ lives <= 0
        │ (s.won = true)        │ (s.isDead = true)
        ▼                       ▼
 ┌──────────────┐      ┌──────────────┐
 │  WIN OVERLAY  │      │ DEATH OVERLAY │
 │  "Next Level" │      │   "Retry"     │
 └──────┬───────┘      └──────┬───────┘
        │ click                │ click
        ▼                      ▼
   initLevel(lvl+1)      initState() + initLevel(1)
```

### The Overlay System
All transition screens use the same HTML overlay, dynamically populated:

```typescript
export function showOverlay(title: string, desc: string, btn: string) {
    // Stop the game loop
    if (s.animFrame !== null) { cancelAnimationFrame(s.animFrame); s.animFrame = null; }
    
    // Update overlay content
    document.getElementById("ov-title")!.textContent = title;
    document.getElementById("ov-desc")!.innerHTML = desc;
    document.getElementById("ov-btn")!.textContent = btn;
    document.getElementById("overlay")!.style.display = "flex";
}
```

### Win Condition (Tank Shot)
```typescript
if (s.botsDestroyedCount >= s.totalBotsToSpawn && !s.won) {
    s.won = true;
    soundManager.stopBGM();
    soundManager.playWin();
    showOverlay("MISSION ACCOMPLISHED", `Level ${s.level} complete.`, "NEXT LEVEL");
}
```

### Death Condition (Tank Shot)
```typescript
s.lives--;
if (s.lives <= 0) {
    s.isDead = true;
    soundManager.stopBGM();
    soundManager.playLose();
    showOverlay("MISSION FAILED", "Your tank was lost.", "RETRY");
} else {
    // Respawn with invulnerability
    setTimeout(() => {
        s.player.alive = true;
        s.player.guardTimer = performance.now() + 5000;
        s.player.r = spawnRow;
        s.player.c = spawnCol;
    }, 1000);
}
```

### Level Progression (Dark Maze)
Dark Maze carries over unused "touches" as a bonus to the next level:
```typescript
// On win
const bonus = state.touches;  // Remaining touches become bonus
game.nextLevelTarget = { lvlIdx: state.lvlIdx + 1, bonus: bonus };

// On next level init
initLevel(target.lvlIdx, target.bonus);
// Inside initLevel:
state.touches = cfg.touches + bonusCarry;
```

---

## 3. Level Initialization

Every `initLevel()` follows this pattern:

1. **Reset transient state**: Clear bullets, particles, items.
2. **Generate the world**: Build grid/maze, place walls.
3. **Spawn the player**: Place at a fixed safe position.
4. **Spawn enemies/hazards**: Place bots/monsters/bombs, ensuring minimum distance from player.
5. **Validate the world** (if applicable): Dark Maze uses BFS to verify the maze is solvable.
6. **Update HUD**: Reflect new level state.

```typescript
export function initLevel(lvl: number) {
    s.level = lvl;
    s.won = false;
    s.isDead = false;
    s.bullets = [];
    s.particles = [];
    s.items = [];

    // Generate world (procedural)
    s.grid = generateGrid(s.gridSize, wallDensity);

    // Spawn player at safe position
    s.player.r = s.gridSize - 2;
    s.player.c = Math.floor(s.gridSize / 2);
    s.player.alive = true;
    s.player.guardTimer = performance.now() + 5000;
    s.grid[s.player.r][s.player.c] = WallType.NONE;  // Clear spawn point

    // Spawn enemies with scaling difficulty
    s.totalBotsToSpawn = 5 + Math.floor(lvl * 1.5);
    const maxActive = Math.min(3 + Math.floor(lvl / 4), 6);
    for (let i = 0; i < maxActive; i++) spawnBot();

    updateHUD();
}
```

---

## 4. Difficulty Scaling

Both games scale difficulty through the level number:

| Parameter              | Formula (Tank Shot)                        |
|------------------------|--------------------------------------------|
| Total bots             | `5 + floor(level * 1.5)`                   |
| Max active bots        | `min(3 + floor(level / 4), 6)`             |
| Wall density           | `0.1 + min(0.2, level * 0.02)`             |
| Permanent wall ratio   | `0.3 + max(0, 0.4 - level * 0.05)`         |

| Parameter              | Approach (Dark Maze)                       |
|------------------------|--------------------------------------------|
| Touches allowed        | `LEVELS[lvlIdx].touches` (decreases)       |
| Bomb count             | `LEVELS[lvlIdx].bombCount` (increases)     |
| Monster types          | `LEVELS[lvlIdx].monsterTypes` (more/faster)|

---

## 5. Entity Lifecycle Flags

All killable entities use an `alive` flag:
- Set `entity.alive = false` to "kill" it.
- The render loop skips dead entities.
- Cleanup happens by filtering: `s.bots = s.bots.filter(b => b.alive);`

Items additionally use `spawnTime` for age-based despawning:
```typescript
const age = ts - item.spawnTime;
if (age > DESPAWN_TIME) item.alive = false;
```

---

## 6. The `tick()` Function

Called once per frame inside `render()`. Orchestrates all game subsystems:

```typescript
export function tick(ts: number) {
    const s = state;
    if (!s) return;

    // 1. Update timers (power-ups, cooldowns)
    if (s.player.powerTimer > 0 && ts > s.player.powerTimer) {
        s.player.powerType = 'none';
    }

    // 2. Update subsystems
    updateBullets(ts);   // Move bullets, check collisions
    updateBots(ts);      // AI decision making
    updateItems(ts);     // Spawn/despawn items, check collection
}
```
