export const CELL = 32;
export const SAFE_TOP = 140;
export const SAFE_BOTTOM = 200;

export const LEVELS = [
  { touches: 5, bombCount: 3, monsterTypes: [] },
  { touches: 4, bombCount: 4, monsterTypes: ["slow"] },
  { touches: 3, bombCount: 4, monsterTypes: ["slow", "slow"] },
  { touches: 3, bombCount: 5, monsterTypes: ["slow", "fast"] },
  { touches: 2, bombCount: 5, monsterTypes: ["slow", "fast", "fast"] },
];

export const REVEAL_DUR = 1600;
export const REVEAL_R = 72;
