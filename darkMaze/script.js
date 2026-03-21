const canvas = document.getElementById("gc");
const ctx = canvas.getContext("2d");
const CELL = 32,
  COLS = 10,
  ROWS = 10,
  W = 320,
  H = 320;

const LEVELS = [
  { touches: 5, bombCount: 3, monsterTypes: [] },
  { touches: 4, bombCount: 4, monsterTypes: ["slow"] },
  { touches: 3, bombCount: 4, monsterTypes: ["slow", "slow"] },
  { touches: 3, bombCount: 5, monsterTypes: ["slow", "fast"] },
  { touches: 2, bombCount: 5, monsterTypes: ["slow", "fast", "fast"] },
];

let state = {};
let animFrame = null;
let nextLevelTarget = null;
const REVEAL_DUR = 1600;
const REVEAL_R = 72;

// Visited trail: cells player has walked through, with fade timestamp
let trail = {}; // key "r,c" -> timestamp of last visit

function mazeGen(cols, rows) {
  const vis = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const walls = {
    h: Array.from({ length: rows + 1 }, () => new Array(cols).fill(true)),
    v: Array.from({ length: rows }, () => new Array(cols + 1).fill(true)),
  };
  function carve(r, c) {
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

function initLevel(lvlIdx, bonusCarry) {
  const cfg = LEVELS[Math.min(lvlIdx, LEVELS.length - 1)];
  const walls = mazeGen(COLS, ROWS);

  // Braiding: Remove more random walls to create better flow and alternative routes
  const braidAmount = Math.floor(COLS * ROWS * 0.2); // Increased to 20%
  for (let i = 0; i < braidAmount; i++) {
    const r = Math.floor(Math.random() * (ROWS - 1)) + 1;
    const c = Math.floor(Math.random() * (COLS - 1)) + 1;
    if (Math.random() > 0.5) walls.h[r][c] = false;
    else walls.v[r][c] = false;
  }
  // Ensure Start and Exit area has at least two openings if possible
  walls.h[1][0] = false;
  walls.v[0][1] = false;
  walls.h[ROWS - 1][COLS - 1] = false;
  walls.v[ROWS - 1][COLS - 1] = false;

  const used = new Set(["0,0", `${ROWS - 1},${COLS - 1}`]);
  let bombs = [];
  let attempts = 0;

  // Keep trying to place bombs until the level is solvable
  do {
    bombs = [];
    const bombUsed = new Set(used);
    while (bombs.length < cfg.bombCount) {
      const r = Math.floor(Math.random() * ROWS),
        c = Math.floor(Math.random() * COLS);
      const k = `${r},${c}`;
      if (!bombUsed.has(k)) {
        bombs.push({ r, c });
        bombUsed.add(k);
      }
    }
    attempts++;
  } while (!isSolvable(ROWS, COLS, walls, bombs) && attempts < 50);

  const monsters = [];
  for (const type of cfg.monsterTypes || []) {
    let r, c, k;
    do {
      r = Math.floor(Math.random() * ROWS);
      c = Math.floor(Math.random() * COLS);
      k = `${r},${c}`;
    } while (used.has(k));
    used.add(k);
    monsters.push({ r, c, type, lastMove: 0 });
  }
  trail = {};
  trail["0,0"] = performance.now(); // start cell always revealed
  state = {
    lvlIdx,
    walls,
    bombs,
    monsters,
    player: { r: 0, c: 0, visualR: 0, visualC: 0 },
    entry: { r: 0, c: 0 },
    exit: { r: ROWS - 1, c: COLS - 1 },
    touches: cfg.touches + bonusCarry,
    bonusCarry,
    alive: true,
    won: false,
    revealActive: false,
    revealX: 0,
    revealY: 0,
    revealTimer: 0,
    stepFlash: 0, // timestamp of last step (for flash effect)
    breathPhase: 0, // for breathing animation
    isDead: false,
    lives: 5,
    particles: [],
    emotion: "worried",
    lastAction: performance.now(),
    blinkTimer: 0,
    isBlinking: false,
  };
  updateHUD();
}

function isSolvable(rows, cols, walls, bombs) {
  const bombSet = new Set(bombs.map((b) => `${b.r},${b.c}`));
  const queue = [{ r: 0, c: 0 }];
  const visited = new Set(["0,0"]);

  while (queue.length > 0) {
    const { r, c } = queue.shift();
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

function updateHUD() {
  document.getElementById("h-level").textContent = state.lvlIdx + 1;
  document.getElementById("h-touches").textContent = state.touches;
  document.getElementById("h-bonus").textContent = state.bonusCarry;
  document.getElementById("h-lives").textContent = "❤️".repeat(state.lives);
  const st = document.getElementById("h-status");
  if (!state.alive) {
    st.textContent = "Chết rồi";
    st.style.color = "#ff6060";
  } else if (state.won) {
    st.textContent = "Thắng!";
    st.style.color = "#80ffb0";
  } else {
    st.textContent = "Đang chơi";
    st.style.color = "#80ffb0";
  }
}
function setMsg(txt, cls = "") {
  const el = document.getElementById("msg-bar");
  el.textContent = txt;
  el.className = cls;
}

function canMove(r, c, dir) {
  const { walls } = state;
  if (dir === 0) return r > 0 && !walls.h[r][c];
  if (dir === 1) return r < ROWS - 1 && !walls.h[r + 1][c];
  if (dir === 2) return c > 0 && !walls.v[r][c];
  if (dir === 3) return c < COLS - 1 && !walls.v[r][c + 1];
  return false;
}

function movePlayer(dir) {
  if (!state.alive || state.won) return;
  if (!canMove(state.player.r, state.player.c, dir)) {
    setMsg("Có tường!");
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
  // record trail
  const k = `${state.player.r},${state.player.c}`;
  trail[k] = performance.now();
  state.stepFlash = performance.now();
  state.lastAction = performance.now();
  
  // Set determined emotion while moving
  if (state.emotion !== "shocked" && state.emotion !== "scared") {
    state.emotion = "determined";
  }
  
  setMsg("");
  checkCollisions();
}

function checkCollisions() {
  const { player, bombs, monsters, exit } = state;
  for (const b of bombs)
    if (b.r === player.r && b.c === player.c) {
      takeDamage("Dẫm phải bom 💣");
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

function takeDamage(msg) {
  state.lives--;
  updateHUD();
  if (state.lives <= 0) {
    die(msg);
  } else {
    setMsg(`${msg} Còn ${state.lives} ❤️`, "alert");
    // Pulse effect or reset position
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

function die(msg) {
  state.alive = false;
  state.isDead = true;
  state.emotion = "sad";
  nextLevelTarget = { lvlIdx: 0, bonus: 0 };
  setMsg(msg, "alert");
  updateHUD();
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
function winLevel() {
  state.won = true;
  state.emotion = "happy";
  const bonus = state.touches;
  updateHUD();
  const exitX = (state.exit.c + 0.5) * CELL;
  const exitY = (state.exit.r + 0.5) * CELL;
  spawnConfetti(exitX, exitY);

  if (state.lvlIdx >= LEVELS.length - 1) {
    nextLevelTarget = { lvlIdx: 0, bonus: 0 };
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
    nextLevelTarget = { lvlIdx: state.lvlIdx + 1, bonus: bonus };
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

function spawnConfetti(x, y) {
  const colors = ["#ff5050", "#50ff50", "#5050ff", "#ffff50", "#ff50ff", "#50ffff"];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    state.particles.push({
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

function tickMonsters(ts) {
  if (!state.alive || state.won) return;
  const speeds = { slow: 900, fast: 420 };
  for (const m of state.monsters) {
    if (ts - m.lastMove < (speeds[m.type] || 900)) continue;
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

canvas.addEventListener("pointerdown", (e) => {
  if (!state.alive || state.won) return;
  if (state.touches <= 0) {
    setMsg("Hết lần chạm!", "alert");
    return;
  }
  const rect = canvas.getBoundingClientRect();
  state.touches--;
  updateHUD();
  state.revealX = (e.clientX - rect.left) * (W / rect.width);
  state.revealY = (e.clientY - rect.top) * (H / rect.height);
  state.revealActive = true;
  state.revealTimer = performance.now();
  state.lastAction = performance.now();
  if (state.emotion !== "shocked" && state.emotion !== "scared") {
    state.emotion = "curious";
  }
  if (state.touches === 0) setMsg("Đây là lần chạm cuối!", "alert");
  else setMsg("");
});

// ── DRAW FUNCTIONS ────────────────────────────────────────────

function drawBoyFace(cx, cy, scale, breathScale, isDead, ts, emotion = "worried") {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale * breathScale, scale * breathScale);

  // Body / torso hint
  ctx.fillStyle = "#5b8dd9";
  ctx.beginPath();
  ctx.ellipse(0, 14, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#fcd5a0";
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = "#3a2208";
  ctx.beginPath();
  ctx.ellipse(0, -8, 10, 6, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // hair tuft
  ctx.beginPath();
  ctx.ellipse(3, -12, 4, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();

  const pupilShift = Math.sin(ts * 0.003) * 0.4;

  if (emotion === "sad" || isDead) {
    // X eyes
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.6;
    [
      [-4, -1],
      [4, -1],
    ].forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.moveTo(ex - 2, ey - 2);
      ctx.lineTo(ex + 2, ey + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex + 2, ey - 2);
      ctx.lineTo(ex - 2, ey + 2);
      ctx.stroke();
    });
    // sad mouth
    ctx.beginPath();
    ctx.arc(0, 7, 4, 0, Math.PI, true);
    ctx.strokeStyle = "#a05030";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (emotion === "happy") {
    // Closed smiling eyes ^^
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    // Left eye
    ctx.beginPath();
    ctx.arc(-4, 0, 3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    // Right eye
    ctx.beginPath();
    ctx.arc(4, 0, 3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    // Happy mouth
    ctx.fillStyle = "#c05040";
    ctx.beginPath();
    ctx.arc(0, 4, 4, 0, Math.PI, false);
    ctx.fill();
  } else if (emotion === "shocked") {
    // Big white eyes with tiny dots
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-4, -1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-4, -1, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -1, 1, 0, Math.PI * 2);
    ctx.fill();
    // Big O mouth
    ctx.fillStyle = "#603020";
    ctx.beginPath();
    ctx.ellipse(0, 6, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (emotion === "curious") {
    // One eye bigger, tilted brows
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-4, -1, 3.5, 4.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -1, 3.5, 3.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(-4 + pupilShift, -1, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4 + pupilShift, -1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Brows
    ctx.strokeStyle = "#3a2208";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(-1, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -5); ctx.quadraticCurveTo(4, -7, 7, -5); ctx.stroke();
    // Small o mouth
    ctx.fillStyle = "#c07050";
    ctx.beginPath(); ctx.arc(0, 6, 2, 0, Math.PI * 2); ctx.fill();
  } else if (emotion === "determined") {
    // Narrowed eyes, firm mouth
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(-4, -1, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -1, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(-4 + pupilShift, -1, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4 + pupilShift, -1, 1.5, 0, Math.PI * 2); ctx.fill();
    // Lowered brows
    ctx.strokeStyle = "#3a2208";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-1, -3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(7, -4); ctx.stroke();
    // Straight mouth
    ctx.strokeStyle = "#a05030";
    ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(3, 6); ctx.stroke();
  } else if (emotion === "frustrated") {
    // > < eyes
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    // Left >
    ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(-2, -1); ctx.lineTo(-6, 1); ctx.stroke();
    // Right <
    ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(2, -1); ctx.lineTo(6, 1); ctx.stroke();
    // Squiggly mouth
    ctx.beginPath();
    ctx.moveTo(-4, 6);
    for (let i = -3; i <= 4; i += 2) {
      ctx.lineTo(i, 6 + (i % 4 === 1 ? -1 : 1));
    }
    ctx.stroke();
  } else if (emotion === "thinking") {
    // Looking up/aside
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-4, -1, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -1, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(-3, -3, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -3, 1.5, 0, Math.PI * 2); ctx.fill();
    // Tilted mouth
    ctx.strokeStyle = "#a05030";
    ctx.beginPath(); ctx.moveTo(-2, 7); ctx.quadraticCurveTo(1, 5, 4, 6); ctx.stroke();
  } else {
    // Worried or Scared
    const isScared = emotion === "scared";

    // Eyes
    ctx.fillStyle = "#fff";
    const eyeSize = isScared ? 4.2 : 3.5;
    ctx.beginPath();
    ctx.ellipse(-4, -1, 3, eyeSize, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -1, 3, eyeSize, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.ellipse(-4 + pupilShift, -1, 1.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4 + pupilShift, -1, 1.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = "#3a2208";
    ctx.lineWidth = 1.5;
    const browLift = isScared ? -1.5 : 0;
    ctx.beginPath();
    ctx.moveTo(-7, -5.5 + browLift);
    ctx.quadraticCurveTo(-4, -8 + browLift, -1, -4.5 + browLift);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, -4.5 + browLift);
    ctx.quadraticCurveTo(4, -8 + browLift, 7, -5.5 + browLift);
    ctx.stroke();

    // Mouth
    const mouthW = isScared ? 3.2 : 2.5;
    const mouthH = isScared ? 4.2 : 2.5;
    ctx.fillStyle = "#c07050";
    ctx.beginPath();
    ctx.ellipse(0, 6, mouthW, mouthH, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isScared) {
      // Sweat drops
      ctx.fillStyle = "#70c0ff";
      for (let i = 0; i < 2; i++) {
        const sx = -8 + i * 16;
        const sweatY = -12 + Math.sin(ts * 0.005 + i) * 2;
        ctx.beginPath();
        ctx.arc(sx, sweatY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // rosy cheeks
    ctx.fillStyle = "rgba(255,160,120,0.2)";
    ctx.beginPath();
    ctx.ellipse(-7, 2, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7, 2, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  if (state.isBlinking && !isDead && emotion !== "shocked" && emotion !== "frustrated") {
    // Overwrite eyes with skin color (closed eyes)
    ctx.fillStyle = "#fcd5a0";
    ctx.fillRect(-8, -5, 16, 8);
    ctx.strokeStyle = "#3a2208";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-7, -1); ctx.lineTo(-1, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -1); ctx.lineTo(7, -1); ctx.stroke();
  }

  ctx.restore();
}

function drawEntryMarker(r, c) {
  const x = c * CELL,
    y = r * CELL;
  ctx.fillStyle = "rgba(40,255,100,0.12)";
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.strokeStyle = "#40ff80";
  ctx.lineWidth = 2;
  const m = 4,
    len = 7;
  ctx.beginPath();
  ctx.moveTo(x + m, y + m + len);
  ctx.lineTo(x + m, y + m);
  ctx.lineTo(x + m + len, y + m);
  ctx.moveTo(x + CELL - m - len, y + m);
  ctx.lineTo(x + CELL - m, y + m);
  ctx.lineTo(x + CELL - m, y + m + len);
  ctx.moveTo(x + m, y + CELL - m - len);
  ctx.lineTo(x + m, y + CELL - m);
  ctx.lineTo(x + m + len, y + CELL - m);
  ctx.moveTo(x + CELL - m - len, y + CELL - m);
  ctx.lineTo(x + CELL - m, y + CELL - m);
  ctx.lineTo(x + CELL - m, y + CELL - m - len);
  ctx.stroke();
  ctx.fillStyle = "#40ff80";
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ENTER", x + CELL / 2, y + 3);
}

function drawExitMarker(r, c) {
  const x = c * CELL,
    y = r * CELL;
  ctx.fillStyle = "rgba(255,80,40,0.13)";
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.strokeStyle = "#ff6040";
  ctx.lineWidth = 2;
  const m = 4,
    len = 7;
  ctx.beginPath();
  ctx.moveTo(x + m, y + m + len);
  ctx.lineTo(x + m, y + m);
  ctx.lineTo(x + m + len, y + m);
  ctx.moveTo(x + CELL - m - len, y + m);
  ctx.lineTo(x + CELL - m, y + m);
  ctx.lineTo(x + CELL - m, y + m + len);
  ctx.moveTo(x + m, y + CELL - m - len);
  ctx.lineTo(x + m, y + CELL - m);
  ctx.lineTo(x + m + len, y + CELL - m);
  ctx.moveTo(x + CELL - m - len, y + CELL - m);
  ctx.lineTo(x + CELL - m, y + CELL - m);
  ctx.lineTo(x + CELL - m, y + CELL - m - len);
  ctx.stroke();
  ctx.fillStyle = "#ff6040";
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("EXIT", x + CELL / 2, y + 3);
  ctx.font = "14px serif";
  ctx.textBaseline = "middle";
  ctx.fillText("★", x + CELL / 2, y + CELL * 0.62);
}

function drawMazeBase() {
  const { walls, exit, entry, bombs, monsters } = state;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = "#141420";
      ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
    }
  ctx.strokeStyle = "#3a3a60";
  ctx.lineWidth = 2;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (walls.h[r][c]) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, r * CELL);
        ctx.lineTo((c + 1) * CELL, r * CELL);
        ctx.stroke();
      }
      if (walls.h[r + 1][c]) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, (r + 1) * CELL);
        ctx.lineTo((c + 1) * CELL, (r + 1) * CELL);
        ctx.stroke();
      }
      if (walls.v[r][c]) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, r * CELL);
        ctx.lineTo(c * CELL, (r + 1) * CELL);
        ctx.stroke();
      }
      if (walls.v[r][c + 1]) {
        ctx.beginPath();
        ctx.moveTo((c + 1) * CELL, r * CELL);
        ctx.lineTo((c + 1) * CELL, (r + 1) * CELL);
        ctx.stroke();
      }
    }
  drawEntryMarker(entry.r, entry.c);
  drawExitMarker(exit.r, exit.c);
  ctx.font = "18px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const b of bombs)
    ctx.fillText("💣", (b.c + 0.5) * CELL, (b.r + 0.5) * CELL);
  for (const m of monsters)
    ctx.fillText(
      m.type === "fast" ? "👹" : "👾",
      (m.c + 0.5) * CELL,
      (m.r + 0.5) * CELL,
    );
}

function render(ts) {
  if (!state.alive && !state.isDead) return;
  tickMonsters(ts);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, W, H);

  const {
    player,
    revealActive,
    revealX,
    revealY,
    revealTimer,
    stepFlash,
    isDead,
    particles,
    emotion,
  } = state;

  const now = ts || performance.now();

  // Smooth Movement (Lerp)
  const lerpSpeed = 0.18;
  player.visualR += (player.r - player.visualR) * lerpSpeed;
  player.visualC += (player.c - player.visualC) * lerpSpeed;

  const px = (player.visualC + 0.5) * CELL,
    py = (player.visualR + 0.5) * CELL;

  // Dynamic Emotion Detection
  if (state.alive && !state.won && !["shocked", "frustrated", "curious"].includes(state.emotion)) {
    let newEmotion = "worried";
    
    // Near monster?
    for (const m of state.monsters) {
      const dist = Math.hypot(player.r - m.r, player.c - m.c);
      if (dist < 2.2) {
        newEmotion = "scared";
        break;
      }
    }
    
    // Near exit?
    const exitDist = Math.hypot(player.r - state.exit.r, player.c - state.exit.c);
    if (exitDist < 1.8 && newEmotion !== "scared") {
      newEmotion = "happy";
    }

    // Idle thinking?
    const idleTime = now - state.lastAction;
    if (idleTime > 6000 && newEmotion === "worried") {
      newEmotion = "thinking";
    } else if (idleTime > 1500 && state.emotion === "determined") {
      // Revert from determined after some idle time
      newEmotion = "worried";
    }

    state.emotion = newEmotion;
  }

  // Revert temporary emotions
  if (state.alive && !state.won) {
    const elapsedSinceLastAction = now - state.lastAction;
    if (state.emotion === "curious" && !state.revealActive && elapsedSinceLastAction > 1000) {
      state.emotion = "worried";
    }
  }

  // Blinking logic
  if (now > state.blinkTimer) {
    if (state.isBlinking) {
      state.isBlinking = false;
      state.blinkTimer = now + 2000 + Math.random() * 4000;
    } else {
      state.isBlinking = true;
      state.blinkTimer = now + 150;
    }
  }

  // Breathing scale
  const breathAmt = isDead ? 1.0 : 1.0 + Math.sin(now * 0.0022) * 0.035;
  state.breathPhase = now;

  // Step flash progress (0..1, decays over 500ms)
  const stepElapsed = now - (stepFlash || 0);
  const stepProg = Math.max(0, 1 - stepElapsed / 500);

  // Reveal progress
  let revealProg = 0;
  if (revealActive) {
    revealProg = Math.max(0, 1 - (now - revealTimer) / REVEAL_DUR);
    if (revealProg <= 0) state.revealActive = false;
  }

  // ── Layer 1: Fog ──
  ctx.save();
  ctx.fillStyle = "#0c0c14"; // slightly lighter than background to differentiate unvisited areas
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // ── Layer 2: Draw trail cells (fading out over 10s) ──
  ctx.save();
  const TRAIL_MAX_AGE = 10000;
  for (const [key, visitTs] of Object.entries(trail)) {
    const age = now - visitTs;
    if (age > TRAIL_MAX_AGE) {
      delete trail[key]; // Clean up old trail entries
      continue;
    }
    const fade = 1 - age / TRAIL_MAX_AGE;
    const [tr, tc] = key.split(",").map(Number);
    const tx = tc * CELL,
      ty = tr * CELL;
    ctx.globalAlpha = fade;
    // Draw this cell's floor + walls
    ctx.fillStyle = "#141420";
    ctx.fillRect(tx + 1, ty + 1, CELL - 2, CELL - 2);
    // Draw walls for this cell
    const { walls } = state;
    ctx.strokeStyle = "#404070";
    ctx.lineWidth = 2;
    if (walls.h[tr][tc]) {
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + CELL, ty);
      ctx.stroke();
    }
    if (walls.h[tr + 1][tc]) {
      ctx.beginPath();
      ctx.moveTo(tx, ty + CELL);
      ctx.lineTo(tx + CELL, ty + CELL);
      ctx.stroke();
    }
    if (walls.v[tr][tc]) {
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, ty + CELL);
      ctx.stroke();
    }
    if (walls.v[tr][tc + 1]) {
      ctx.beginPath();
      ctx.moveTo(tx + CELL, ty);
      ctx.lineTo(tx + CELL, ty + CELL);
      ctx.stroke();
    }
    // Items in trail
    ctx.font = "16px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const b of state.bombs)
      if (b.r === tr && b.c === tc)
        ctx.fillText("💣", tx + CELL / 2, ty + CELL / 2);
    for (const m of state.monsters)
      if (m.r === tr && m.c === tc)
        ctx.fillText(
          m.type === "fast" ? "👹" : "👾",
          tx + CELL / 2,
          ty + CELL / 2,
        );
  }
  ctx.restore();

  // ── Layer 3: reveal circle (touch) ──
  if (revealActive && revealProg > 0) {
    ctx.save();
    const r = REVEAL_R * (0.5 + revealProg * 0.6);
    ctx.beginPath();
    ctx.arc(revealX, revealY, r, 0, Math.PI * 2);
    ctx.clip();
    drawMazeBase();
    ctx.restore();
  }

  // ── Layer 4: player vicinity ──
  {
    ctx.save();
    const vr = CELL * 0.8; // big enough to help user determine if there is a wall or not
    const gOuter = ctx.createRadialGradient(px, py, 0, px, py, vr);
    gOuter.addColorStop(0, "rgba(255,255,255,1)");
    gOuter.addColorStop(0.8, "rgba(255,255,255,0.8)");
    gOuter.addColorStop(1, "rgba(255,255,255,0)");
    
    ctx.beginPath();
    ctx.arc(px, py, vr, 0, Math.PI * 2);
    ctx.clip();
    drawMazeBase();
    ctx.restore();
  }

  // ── Layer 5: always-visible entry/exit markers ──
  drawEntryMarker(state.entry.r, state.entry.c);
  drawExitMarker(state.exit.r, state.exit.c);

  // ── Layer 6: step flash ring ──
  if (stepProg > 0) {
    ctx.save();
    ctx.globalAlpha = stepProg * 0.7;
    ctx.strokeStyle = "#ffe08a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, CELL * 0.72 * (1 + (1 - stepProg) * 0.4), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Layer 7: player character ──
  drawBoyFace(px, py - 2, 1.0, breathAmt, isDead, now, state.emotion);

  // ── Layer 8: Particles (Confetti) ──
  if (particles && particles.length > 0) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  if (animFrame !== null) animFrame = requestAnimationFrame(render);
}

function showOverlay(title, desc, btn) {
  if (animFrame !== null) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  document.getElementById("ov-title").textContent = title;
  document.getElementById("ov-desc").textContent = desc;
  document.getElementById("ov-btn").textContent = btn;
  document.getElementById("overlay").style.display = "flex";
}

document.getElementById("ov-btn").addEventListener("click", () => {
  document.getElementById("overlay").style.display = "none";
  const target = nextLevelTarget || { lvlIdx: 0, bonus: 0 };
  initLevel(target.lvlIdx, target.bonus);
  setMsg("Chạm vào màn hình để nhìn thấy mê cung!");
  if (animFrame !== null) cancelAnimationFrame(animFrame);
  animFrame = requestAnimationFrame(render);
});

document
  .getElementById("btn-up")
  .addEventListener("click", () => movePlayer(0));
document
  .getElementById("btn-down")
  .addEventListener("click", () => movePlayer(1));
document
  .getElementById("btn-left")
  .addEventListener("click", () => movePlayer(2));
document
  .getElementById("btn-right")
  .addEventListener("click", () => movePlayer(3));
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") movePlayer(0);
  else if (e.key === "ArrowDown" || e.key === "s") movePlayer(1);
  else if (e.key === "ArrowLeft" || e.key === "a") movePlayer(2);
  else if (e.key === "ArrowRight" || e.key === "d") movePlayer(3);
});
