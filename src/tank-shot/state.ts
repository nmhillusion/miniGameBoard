import { Direction, WallType } from './constants.js';

export interface Item {
    r: number;
    c: number;
    type: 'heart' | 'bomb' | 'powerup';
    alive: boolean;
    spawnTime: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    decay: number;
    color: string;
    size: number;
}

export interface Bullet {
    r: number;
    c: number;
    dir: Direction;
    owner: 'player' | 'bot';
    active: boolean;
    // For smooth sub-grid movement if desired, but we'll stick to grid-steps for now or small increments
    visualX: number;
    visualY: number;
    penetrating: boolean;
}

export interface Tank {
    r: number;
    c: number;
    dir: Direction;
    visualR: number;
    visualC: number;
    lastAction: number;
    alive: boolean;
    type: 'player' | 'bot';
    powerType: 'none' | 'penetrating';
    powerTimer: number;
    botClass?: 'scout' | 'heavy' | 'tactician';
}

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
    width: number;
    height: number;
    offsetLeft: number;
    offsetTop: number;
    lastHeartSpawn: number;
    lastBombSpawn: number;
    lastPowerupSpawn: number;
    won: boolean;
    isDead: boolean;
    totalBotsToSpawn: number;
    botsSpawnedCount: number;
    botsDestroyedCount: number;
    shakeTimer: number;
    shakeIntensity: number;
    gridSize: number;
    animFrame: number | null;
}

export const state: Partial<GameState> & { state: GameState | null } = {
    state: null
};

export function initState(W: number, H: number, gridSize: number): GameState {
    return {
        level: 1,
        score: 0,
        lives: 3,
        grid: [],
        player: {
            r: 0, c: 0, dir: Direction.UP, visualR: 0, visualC: 0,
            lastAction: 0, alive: true, type: 'player',
            powerType: 'none', powerTimer: 0
        },
        bots: [],
        bullets: [],
        items: [],
        particles: [],
        cell: 40,
        width: W,
        height: H,
        offsetLeft: 0,
        offsetTop: 0,
        lastHeartSpawn: performance.now(),
        lastBombSpawn: performance.now(),
        lastPowerupSpawn: performance.now(),
        won: false,
        isDead: false,
        totalBotsToSpawn: 0,
        botsSpawnedCount: 0,
        botsDestroyedCount: 0,
        shakeTimer: 0,
        shakeIntensity: 0,
        gridSize,
        animFrame: null
    };
}
