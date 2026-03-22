export interface GameParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; decay: number; color: string; size: number;
  type?: string;
}

export interface GameState {
  lvlIdx: number;
  bonusCarry: number;
  lives: number;
  breathPhase: number;
  shakeX: number;
  shakeY: number;
  walls: { h: boolean[][], v: boolean[][] };
  bombs: { r: number, c: number }[];
  monsters: { r: number, c: number, type: string, lastMove?: number, moveDelay?: number }[];
  rows: number;
  cols: number;
  offsetLeft: number;
  offsetTop: number;
  entry: { r: number, c: number };
  exit: { r: number, c: number };
  player: { r: number, c: number, visualR: number, visualC: number };
  alive: boolean;
  won: boolean;
  isDead: boolean;
  shakeTimer: number;
  shakeIntensity: number;
  revealActive: boolean;
  revealX: number;
  revealY: number;
  revealTimer: number;
  stepFlash: number;
  particles: GameParticle[];
  emotion: string;
  lastAction: number;
  lastDir: number;
  blinkTimer: number;
  isBlinking: boolean;
  flashTimer: number;
  flashDur: number;
  flashColor: string;
  touches: number;
}

export interface GameStore {
  W: number;
  H: number;
  state: GameState | Partial<GameState>;
  trail: Record<string, number>;
  animFrame: number | null;
  nextLevelTarget: { lvlIdx: number, bonus: number } | null;
}

export const state: GameStore = {
  W: 320,
  H: 320,
  state: {} as Partial<GameState>,
  trail: {},
  animFrame: null,
  nextLevelTarget: null,
};
