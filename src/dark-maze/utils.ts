import { state as game, GameState } from './state.js';

export function mazeGen(cols: number, rows: number) {
  const vis = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const walls = {
    h: Array.from({ length: rows + 1 }, () => new Array(cols).fill(true)),
    v: Array.from({ length: rows }, () => new Array(cols + 1).fill(true)),
  };
  function carve(r: number, c: number) {
    vis[r][c] = true;
    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ].sort(() => Math.random() - 0.5);
    for (const { dr, dc } of dirs) {
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !vis[nr][nc]) {
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

export function isSolvable(rows: number, cols: number, walls: { h: boolean[][], v: boolean[][] }, bombs: { r: number, c: number }[]) {
  const bombSet = new Set(bombs.map((b) => `${b.r},${b.c}`));
  const queue = [{ r: 0, c: 0 }];
  const visited = new Set(["0,0"]);

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    const { r, c } = node;
    if (r === rows - 1 && c === cols - 1) return true;

    // Up
    if (r > 0 && !walls.h[r][c] && !visited.has(`${r - 1},${c}`) && !bombSet.has(`${r - 1},${c}`)) {
      visited.add(`${r - 1},${c}`);
      queue.push({ r: r - 1, c: c });
    }
    // Down
    if (r < rows - 1 && !walls.h[r + 1][c] && !visited.has(`${r + 1},${c}`) && !bombSet.has(`${r + 1},${c}`)) {
      visited.add(`${r + 1},${c}`);
      queue.push({ r: r + 1, c: c });
    }
    // Left
    if (c > 0 && !walls.v[r][c] && !visited.has(`${r},${c - 1}`) && !bombSet.has(`${r},${c - 1}`)) {
      visited.add(`${r},${c - 1}`);
      queue.push({ r: r, c: c - 1 });
    }
    // Right
    if (c < cols - 1 && !walls.v[r][c + 1] && !visited.has(`${r},${c + 1}`) && !bombSet.has(`${r},${c + 1}`)) {
      visited.add(`${r},${c + 1}`);
      queue.push({ r: r, c: c + 1 });
    }
  }
  return false;
}

export function spawnParticles(x: number, y: number, count: number, type: string) {
  const state = game.state as GameState;
  if (type === "explosion") {
    // Fire particles
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      state.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5, life: 1.0, decay: 0.02 + Math.random() * 0.03,
        color: ["#ff4500", "#ff8c00", "#ff0000"][Math.floor(Math.random() * 3)],
        type: "fire"
      });
    }
    // Smoke particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      state.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.5, // float up
        size: 8 + Math.random() * 12, life: 0.8, decay: 0.01 + Math.random() * 0.015,
        color: ["#333", "#555", "#222"][Math.floor(Math.random() * 3)],
        type: "smoke"
      });
    }
    // Sparks/Shrapnel
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 10;
      state.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 2, life: 1.0, decay: 0.04 + Math.random() * 0.06,
        color: "#fff7e0",
        type: "spark"
      });
    }
  } else {
    // Confetti
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      state.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4, life: 1.0, decay: 0.015 + Math.random() * 0.02,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        type: "confetti"
      });
    }
  }
}

export function spawnConfetti(x: number, y: number) {
  const colors = ["#ff5050", "#50ff50", "#5050ff", "#ffff50", "#ff50ff", "#50ffff"];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    (game.state as GameState).particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // Slight upward boost
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1.0,
      decay: 0.015 + Math.random() * 0.02,
      size: 3 + Math.random() * 4,
    });
  }
}

export function flashScreen(color: string, dur: number = 300) {
  (game.state as GameState).flashColor = color;
  (game.state as GameState).flashTimer = performance.now() + dur;
  (game.state as GameState).flashDur = dur;
}

export function shakeScreen(dur: number = 400, intensity: number = 8) {
  (game.state as GameState).shakeTimer = performance.now() + dur;
  (game.state as GameState).shakeIntensity = intensity;
}
