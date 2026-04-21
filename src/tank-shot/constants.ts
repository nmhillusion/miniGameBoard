export const REVEAL_DUR = 3000;

export enum Direction {
    UP = 0,
    RIGHT = 1,
    DOWN = 2,
    LEFT = 3
}

export const DIR_VECTORS = [
    { r: -1, c: 0 }, // UP
    { r: 0, c: 1 },  // RIGHT
    { r: 1, c: 0 },  // DOWN
    { r: 0, c: -1 }  // LEFT
];

export enum WallType {
    NONE = 0,
    PERMANENT = 1,
    DESTRUCTIBLE = 2
}

export const TANK_COLORS = {
    PLAYER: '#38bdf8',
    BOT: '#ff6060',
    BOT_SCOUT: '#4ade80',
    BOT_HEAVY: '#a855f7',
    BOT_TACTICIAN: '#fb923c'
};

export const SHAKE_DUR = 500;
export const EXPLOSION_PARTICLES = 15;
