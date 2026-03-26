import { state as game, GameState } from './state.js';
import { CELL, LEVELS, SAFE_TOP, SAFE_BOTTOM } from './constants.js';
import { mazeGen, isSolvable, spawnParticles, spawnConfetti, flashScreen, shakeScreen, playSound, stopMusic } from './utils.js';
import { showOverlay } from './renderer.js';

export function initLevel(lvlIdx: number, bonusCarry: number) {
  // We'll need a way to trigger resize and get W/H from main
  const W = game.W;
  const H = game.H;
  const cols = Math.floor(W / CELL);
  const rows = Math.floor((H - SAFE_TOP - SAFE_BOTTOM) / CELL);
  const offsetTop = SAFE_TOP + (H - SAFE_TOP - SAFE_BOTTOM - rows * CELL) / 2;
  const offsetLeft = (W - cols * CELL) / 2;

  const cfg = LEVELS[Math.min(lvlIdx, LEVELS.length - 1)];
  const walls = mazeGen(cols, rows);

  const braidAmount = Math.floor(cols * rows * 0.2);
  for (let i = 0; i < braidAmount; i++) {
    const r = Math.floor(Math.random() * (rows - 1)) + 1;
    const c = Math.floor(Math.random() * (cols - 1)) + 1;
    if (Math.random() > 0.5) walls.h[r][c] = false;
    else walls.v[r][c] = false;
  }
  if (rows > 1 && cols > 1) {
    walls.h[1][0] = false;
    walls.v[0][1] = false;
    walls.h[rows - 1][cols - 1] = false;
    walls.v[rows - 1][cols - 1] = false;
  }

  const used = new Set(["0,0", `${rows - 1},${cols - 1}`]);
  let bombs: { r: number, c: number }[] = [];
  let attempts = 0;

  do {
    bombs = [];
    const bombUsed = new Set(used);
    while (bombs.length < cfg.bombCount) {
      const r = Math.floor(Math.random() * rows),
        c = Math.floor(Math.random() * cols);
      const k = `${r},${c}`;
      if (!bombUsed.has(k)) {
        bombs.push({ r, c });
        bombUsed.add(k);
      }
    }
    attempts++;
  } while (!isSolvable(rows, cols, walls, bombs) && attempts < 50);

  const monsters: { 
    r: number, 
    c: number, 
    type: string, 
    lastMove: number, 
    lastRevealR: number, 
    lastRevealC: number, 
    lastRevealTime: number 
  }[] = [];
  for (const type of cfg.monsterTypes || []) {
    let r = 0, c = 0, k = "";
    do {
      r = Math.floor(Math.random() * rows);
      c = Math.floor(Math.random() * cols);
      k = `${r},${c}`;
    } while (used.has(k));
    used.add(k);
    monsters.push({ r, c, type, lastMove: 0, lastRevealR: r, lastRevealC: c, lastRevealTime: 0 });
  }
  game.trail = {};
  game.trail["0,0"] = performance.now();
  game.state = {
    lvlIdx,
    cols,
    rows,
    offsetTop,
    offsetLeft,
    walls,
    bombs,
    monsters,
    player: { r: 0, c: 0, visualR: 0, visualC: 0 },
    entry: { r: 0, c: 0 },
    exit: { r: rows - 1, c: cols - 1 },
    touches: cfg.touches + bonusCarry,
    bonusCarry,
    alive: true,
    won: false,
    revealActive: false,
    revealX: 0,
    revealY: 0,
    revealTimer: 0,
    stepFlash: 0,
    breathPhase: 0,
    isDead: false,
    lives: 5,
    particles: [],
    emotion: "worried",
    lastAction: performance.now(),
    lastDir: 1, // Default facing down
    blinkTimer: 0,
    isBlinking: false,
    shakeX: 0,
    shakeY: 0,
    shakeTimer: 0,
    flashColor: "",
    flashTimer: 0,
    flashDur: 0,
    lastClickTime: 0,
    roundStartTime: performance.now(),
  };
  updateHUD();
}

export function updateHUD() {
  const state = game.state as GameState;
  document.getElementById("h-level")!.textContent = String(state.lvlIdx + 1);
  document.getElementById("h-touches")!.textContent = String(state.touches);
  document.getElementById("h-bonus")!.textContent = String(state.bonusCarry);
  document.getElementById("h-lives")!.textContent = "❤️".repeat(state.lives);
  document.getElementById("h-bombs")!.textContent = String(state.bombs.length);
  document.getElementById("h-monsters")!.textContent = String(state.monsters.length);
}

export function updateTimerDisplay(currentTime: number) {
  const state = game.state as GameState;
  if (!state || !state.roundStartTime) return;
  
  const endTime = state.roundEndTime || currentTime;
  const elapsed = endTime - state.roundStartTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const displaySeconds = seconds % 60;
  const displayMinutes = minutes % 60;
  
  const timerEl = document.getElementById("h-time");
  if (!timerEl) return;
  
  timerEl.textContent = `${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
  
  // Update color based on elapsed time
  timerEl.classList.remove('orange', 'red');
  if (elapsed > 5 * 60 * 1000) {
    timerEl.classList.add('red');
  } else if (elapsed > 3 * 60 * 1000) {
    timerEl.classList.add('orange');
  }
}

export function setMsg(txt: string, cls: string = "") {
  const el = document.getElementById("msg-bar");
  if (!el) return;
  el.textContent = txt;
  el.className = cls;
}

export function canMove(r: number, c: number, dir: number) {
  const { walls, rows, cols } = game.state as GameState;
  if (dir === 0) return r > 0 && !walls.h[r][c];
  if (dir === 1) return r < rows - 1 && !walls.h[r + 1][c];
  if (dir === 2) return c > 0 && !walls.v[r][c];
  if (dir === 3) return c < cols - 1 && !walls.v[r][c + 1];
  return false;
}

export function movePlayer(dir: number) {
  const state = game.state as GameState;
  if (!state.alive || state.won) return;
  if (!canMove(state.player.r, state.player.c, dir)) {
    setMsg("Có tường!");
    playSound("damage");
    state.emotion = "frustrated";
    state.lastAction = performance.now();
    setTimeout(() => {
      if (state.emotion === "frustrated" && state.alive && !state.won) {
        state.emotion = "worried";
      }
    }, 800);
    return;
  }
  if (dir === 0) state.player.r--;
  else if (dir === 1) state.player.r++;
  else if (dir === 2) state.player.c--;
  else state.player.c++;
  
  state.lastDir = dir;
  playSound("move");
  
  const k = `${state.player.r},${state.player.c}`;
  game.trail[k] = performance.now();
  state.stepFlash = performance.now();
  state.lastAction = performance.now();
  
  if (state.emotion !== "shocked" && state.emotion !== "scared") {
    state.emotion = "determined";
  }
  
  setMsg("");
  checkCollisions();
}

export function checkCollisions() {
  const state = game.state as GameState;
  const { player, bombs, monsters, exit } = state;
  const nr = player.r;
  const nc = player.c;
  if (bombs.some((b) => b.r === nr && b.c === nc)) {
      const px = state.offsetLeft + (nc + 0.5) * CELL;
      const py = state.offsetTop + (nr + 0.5) * CELL;
      spawnParticles(px, py, 60, "explosion");
      shakeScreen(600, 16);
      flashScreen("rgba(255, 60, 0, 0.45)", 400);
      state.emotion = "shocked";
      playSound("explosion");
      takeDamage("Bùm! Bạn giẫm phải bôm!");
      return;
    }
  for (const m of monsters)
    if (m.r === player.r && m.c === player.c) {
      takeDamage("Bị quái vật bắt!");
      return;
    }
  if (player.r === exit.r && player.c === exit.c) {
    winLevel();
    return;
  }
}

export function takeDamage(msg: string) {
  const state = game.state as GameState;
  state.lives--;
  updateHUD();
  if (state.lives <= 0) {
    playSound("lose");
    die(msg);
  } else {
    setMsg(`${msg} Còn ${state.lives} ❤️`, "alert");
    state.player.r = state.entry.r;
    state.player.c = state.entry.c;
    state.player.visualR = state.entry.r;
    state.player.visualC = state.entry.c;
    state.emotion = "shocked";
    state.stepFlash = performance.now();
    setTimeout(() => {
      if (state.alive && !state.won) state.emotion = "worried";
    }, 1500);
  }
}

export function die(msg: string) {
  const state = game.state as GameState;
  state.alive = false;
  state.isDead = true;
  state.emotion = "sad";
  game.nextLevelTarget = { lvlIdx: 0, bonus: 0 };
  setMsg(msg, "alert");
  updateHUD();
  state.roundEndTime = performance.now();
  stopMusic();
  setTimeout(
    () =>
      showOverlay(
        "GAME OVER",
        msg + "\n\nKhởi động lại từ ải 1?",
        "Chơi lại",
      ),
    800,
  );
}

export function winLevel() {
  const state = game.state as GameState;
  state.won = true;
  state.emotion = "happy";
  playSound("win");
  spawnParticles(game.W / 2, game.H / 2, 80, "confetti");
  setMsg("Bạn đã thoát khỏi mê cung!");
  const bonus = state.touches;
  updateHUD();
  state.roundEndTime = performance.now();
  stopMusic();
  const exitX = (state.exit.c + 0.5) * CELL;
  const exitY = (state.exit.r + 0.5) * CELL;
  spawnConfetti(exitX, exitY);

  if (state.lvlIdx >= LEVELS.length - 1) {
    game.nextLevelTarget = { lvlIdx: 0, bonus: 0 };
    setTimeout(
      () =>
        showOverlay(
          "CHIẾN THẮNG! 🏆",
          `Vượt tất cả ${LEVELS.length} ải!\nChạm dư: ${bonus}`,
          "Chơi lại",
        ),
      800,
    );
  } else {
    game.nextLevelTarget = { lvlIdx: state.lvlIdx + 1, bonus: bonus };
    setTimeout(
      () =>
        showOverlay(
          "VƯỢT ẢI! 🏁",
          `Chúc mừng! Bạn đã tìm thấy lối thoát.\n\nChạm dư (+): ${bonus}`,
          "Ải tiếp theo",
        ),
      800,
    );
  }
}

export function tickMonsters(ts: number) {
  const state = game.state as GameState;
  if (!state.alive || state.won) return;
  const speeds: Record<string, number> = { slow: 900, fast: 420 };
  for (const m of state.monsters) {
    if (ts - (m.lastMove || 0) < (speeds[m.type] || 900)) continue;
    m.lastMove = ts;
    const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    for (const d of dirs) {
      if (canMove(m.r, m.c, d)) {
        if (d === 0) m.r--;
        else if (d === 1) m.r++;
        else if (d === 2) m.c--;
        else m.c++;
        break;
      }
    }
  }
  checkCollisions();
}
