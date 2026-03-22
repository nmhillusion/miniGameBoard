import { state as game, GameState } from './state.js';
import { CELL, REVEAL_DUR, REVEAL_R } from './constants.js';
import { tickMonsters } from './game.js';

let ctx: CanvasRenderingContext2D | null = null;

export function setContext(c: CanvasRenderingContext2D | null) {
  ctx = c;
}

export function drawBoyFace(cx: number, cy: number, scale: number, breathScale: number, isDead: boolean, ts: number, emotion: string = "worried", dir: number = 3, isWalking: boolean = false) {
  if (!ctx) return;
  const state = game.state as GameState;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale * breathScale, scale * breathScale);

  // Chibi Boy style (without weapon)
  // Scale down a bit to fit the cell since the head in the original is 20px wide
  ctx.scale(0.8, 0.8);

  if (dir === 2) ctx.scale(-1, 1);

  const skinColor = "#fcd5a0";
  const hatColor = "#cc3333";
  const hatBand = "#f0f0f0";
  const shirtColor = "#f0f4f8";
  const sleeveColor = "#3b4f6e";
  const pantsColor = "#2c3e50";
  const shoeColor = "#5d90c0";
  const eyeColor = "#4a3219";

  // offset so he sits on the ground
  ctx.translate(0, -5);

  // Walk cycle phase
  const walkSpeed = 12; // cycles per second
  const walkPhase = isWalking ? Math.sin(ts * walkSpeed * 0.01) : 0;
  const legSwing = walkPhase * 0.4; // radians
  const armSwing = walkPhase * 0.25;
  const bodyBob = isWalking ? Math.abs(Math.sin(ts * walkSpeed * 0.02)) * 1.5 : 0;

  if (dir === 0 || dir === 1) { // Up or Down (Front/Back)
    // Left Leg
    ctx.save(); ctx.translate(-3, 10); ctx.rotate(-legSwing);
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.roundRect(-1, 0, 3, 7, 2); ctx.fill();
    ctx.fillStyle = shoeColor;
    ctx.beginPath(); ctx.ellipse(0, 7, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Right Leg
    ctx.save(); ctx.translate(3, 10); ctx.rotate(legSwing);
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.roundRect(-1, 0, 3, 7, 2); ctx.fill();
    ctx.fillStyle = shoeColor;
    ctx.beginPath(); ctx.ellipse(0, 7, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    
    // Pants
    ctx.fillStyle = pantsColor;
    ctx.beginPath(); ctx.roundRect(-5, 5, 10, 7, 2); ctx.fill();
    // Shirt (with body bob)
    ctx.fillStyle = shirtColor;
    ctx.beginPath(); ctx.roundRect(-5, -2 - bodyBob, 10, 8, 2); ctx.fill();
    
    // Left Arm
    ctx.save(); ctx.translate(-6, 1 - bodyBob); ctx.rotate(armSwing);
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.ellipse(0, 5, 2, 5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sleeveColor;
    ctx.beginPath(); ctx.ellipse(0, 0, 3, 4, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Right Arm
    ctx.save(); ctx.translate(6, 1 - bodyBob); ctx.rotate(-armSwing);
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.ellipse(0, 5, 2, 5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sleeveColor;
    ctx.beginPath(); ctx.ellipse(0, 0, 3, 4, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else { // Left or Right (Side profile)
    // Back leg
    ctx.save(); ctx.translate(-4, 10); ctx.rotate(legSwing);
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.roundRect(-1, 0, 3, 7, 2); ctx.fill();
    ctx.fillStyle = shoeColor;
    ctx.beginPath(); ctx.ellipse(0, 6, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(3, 6.5, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    
    // Front leg
    ctx.save(); ctx.translate(2, 11); ctx.rotate(-legSwing);
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.roundRect(-1, 0, 3, 6, 2); ctx.fill();
    ctx.fillStyle = shoeColor;
    ctx.beginPath(); ctx.ellipse(0, 6, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(3, 6.5, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    
    // Pants 
    ctx.fillStyle = pantsColor;
    ctx.beginPath(); ctx.roundRect(-7, 5, 12, 7, 2); ctx.fill();
    // Shirt (with body bob)
    ctx.fillStyle = shirtColor;
    ctx.beginPath(); ctx.roundRect(-6, 0 - bodyBob, 11, 7, 3); ctx.fill();
    
    // Sleeve back
    ctx.fillStyle = sleeveColor;
    ctx.beginPath(); ctx.ellipse(-4, 3 - bodyBob, 2.5, 3, 0.5, 0, Math.PI * 2); ctx.fill();
  }

  // Head
  if (dir === 0) { // UP (Back of head)
    // Skin base (back of head peeking)
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(0, -4, 8, 0, Math.PI * 2); ctx.fill();

    // Hat dome
    ctx.fillStyle = hatColor;
    ctx.beginPath(); ctx.arc(0, -8, 10, Math.PI, 0); ctx.fill();
    // Hat brim (back edge visible)
    ctx.beginPath(); ctx.ellipse(0, -8, 12, 3, 0, Math.PI * 0.85, Math.PI * 0.15, true); ctx.fill();
    // Hat band
    ctx.fillStyle = hatBand;
    ctx.fillRect(-10, -10, 20, 2);
  } else if (dir === 1) { // DOWN (Front face)
    // Hair base (hidden under hat, just a sliver)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(0, -6, 10, 0, Math.PI * 2); ctx.fill();

    // Face Skin
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(0, -4, 8, 0, Math.PI * 2); ctx.fill();

    // Two Eyes
    if (emotion === "sad" || isDead) {
      ctx.strokeStyle = "#333"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(-1, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(-4, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(1, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(4, -4); ctx.stroke();
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.ellipse(-3, -4, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3, -4, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(-3, -4, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -4, 1, 0, Math.PI * 2); ctx.fill();
    }

    // Mouth
    ctx.strokeStyle = "#402010"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (emotion === "sad" || isDead || emotion === "frustrated") {
      ctx.arc(0, 1, 1.5, 0, Math.PI, true);
    } else if (emotion === "happy") {
      ctx.arc(0, 0, 1.5, 0, Math.PI, false);
    } else {
      ctx.moveTo(-1, 1); ctx.lineTo(1, 1);
    }
    ctx.stroke();

    // Hat dome
    ctx.fillStyle = hatColor;
    ctx.beginPath(); ctx.arc(0, -8, 10, Math.PI, 0); ctx.fill();
    // Hat brim
    ctx.beginPath(); ctx.ellipse(0, -8, 13, 3, 0, Math.PI, 0); ctx.fill();
    // Hat band
    ctx.fillStyle = hatBand;
    ctx.fillRect(-10, -10, 20, 2);

    if (state && state.isBlinking && !isDead && !["shocked", "frustrated"].includes(emotion)) {
      ctx.fillStyle = skinColor;
      ctx.fillRect(-5, -6, 10, 5); // Cover both eyes
      ctx.strokeStyle = "#402010"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(-1, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, -4); ctx.lineTo(5, -4); ctx.stroke();
    }

  } else { // Side Profile
    // Hair base (hidden under hat)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(-2, -6, 10, 0, Math.PI * 2); ctx.fill();

    // Face Skin
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(2, -4, 8, 0, Math.PI * 2); ctx.fill();

    // Hat dome (side)
    ctx.fillStyle = hatColor;
    ctx.beginPath(); ctx.arc(0, -8, 10, Math.PI, 0); ctx.fill();
    // Hat brim (side, extends forward)
    ctx.beginPath();
    ctx.moveTo(-10, -8); ctx.lineTo(14, -8); ctx.lineTo(14, -6); ctx.lineTo(-10, -6);
    ctx.fill();
    // Hat band
    ctx.fillStyle = hatBand;
    ctx.fillRect(-10, -10, 24, 2);

    // Eye
    if (emotion === "sad" || isDead) {
      ctx.strokeStyle = "#333"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(6, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(2, -2); ctx.stroke();
    } else if (emotion === "happy") {
      ctx.strokeStyle = "#444"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(4, -8, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (emotion === "shocked") {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(4, -8, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(4, -8, 1.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(4, -4, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = eyeColor;
      const shift = (emotion === "scared" ? 1 : 0);
      ctx.beginPath(); ctx.ellipse(4.5 - shift, -4, 1.5, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(5 - shift, -4, 0.8, 1.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(5 - shift, -4.5, 0.5, 0, Math.PI * 2); ctx.fill();
    }

    // Mouth
    ctx.strokeStyle = "#402010"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (emotion === "sad" || isDead || emotion === "frustrated") {
      ctx.arc(5, 1, 1.5, 0, Math.PI, true);
    } else if (emotion === "happy") {
      ctx.arc(5, -1, 1.5, 0, Math.PI, false);
    } else if (emotion === "shocked" || emotion === "curious") {
      ctx.fillStyle = "#603020"; ctx.ellipse(5, 0, 1, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.moveTo(4, 1); ctx.lineTo(6, 1);
    }
    ctx.stroke();

    // Eyebrow
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.5; ctx.beginPath();
    if(emotion === "scared" || emotion === "worried") { ctx.moveTo(3, -9); ctx.lineTo(6, -10); }
    else if(emotion === "determined" || emotion === "frustrated") { ctx.moveTo(3, -10); ctx.lineTo(6, -8); }
    else { ctx.moveTo(3, -9); ctx.lineTo(6, -9); }
    ctx.stroke();

    // Front Arm & Hand (empty without weapon)
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.ellipse(2, 8, 2, 4, -0.5, 0, Math.PI * 2); ctx.fill(); // arm
    ctx.beginPath(); ctx.arc(4, 12, 2, 0, Math.PI * 2); ctx.fill(); // hand (fist)

    // Front Sleeve
    ctx.fillStyle = sleeveColor;
    ctx.beginPath(); ctx.ellipse(0, 4, 3, 3.5, -0.3, 0, Math.PI * 2); ctx.fill();

    if (state && state.isBlinking && !isDead && !["shocked", "frustrated"].includes(emotion)) {
      ctx.fillStyle = skinColor;
      ctx.fillRect(2, -7, 5, 5);
      ctx.strokeStyle = "#402010"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(6, -4); ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawEntryMarker(r: number, c: number) {
  if (!ctx) return;
  const { offsetLeft, offsetTop } = game.state as GameState;
  const x = offsetLeft + c * CELL, y = offsetTop + r * CELL;
  ctx.fillStyle = "rgba(40,255,100,0.12)";
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.strokeStyle = "#40ff80";
  ctx.lineWidth = 2;
  const m = 4, len = 7;
  ctx.beginPath();
  ctx.moveTo(x + m, y + m + len); ctx.lineTo(x + m, y + m); ctx.lineTo(x + m + len, y + m);
  ctx.moveTo(x + CELL - m - len, y + m); ctx.lineTo(x + CELL - m, y + m); ctx.lineTo(x + CELL - m, y + m + len);
  ctx.moveTo(x + m, y + CELL - m - len); ctx.lineTo(x + m, y + CELL - m); ctx.lineTo(x + m + len, y + CELL - m);
  ctx.moveTo(x + CELL - m - len, y + CELL - m); ctx.lineTo(x + CELL - m, y + CELL - m); ctx.lineTo(x + CELL - m, y + CELL - m - len);
  ctx.stroke();
  ctx.fillStyle = "#40ff80";
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ENTER", x + CELL / 2, y + 3);
}

export function drawExitMarker(r: number, c: number) {
  if (!ctx) return;
  const { offsetLeft, offsetTop } = game.state as GameState;
  const x = offsetLeft + c * CELL, y = offsetTop + r * CELL;
  ctx.fillStyle = "rgba(255,80,40,0.13)";
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.strokeStyle = "#ff6040";
  ctx.lineWidth = 2;
  const m = 4, len = 7;
  ctx.beginPath();
  ctx.moveTo(x + m, y + m + len); ctx.lineTo(x + m, y + m); ctx.lineTo(x + m + len, y + m);
  ctx.moveTo(x + CELL - m - len, y + m); ctx.lineTo(x + CELL - m, y + m); ctx.lineTo(x + CELL - m, y + m + len);
  ctx.moveTo(x + m, y + CELL - m - len); ctx.lineTo(x + m, y + CELL - m); ctx.lineTo(x + m + len, y + CELL - m);
  ctx.moveTo(x + CELL - m - len, y + CELL - m); ctx.lineTo(x + CELL - m, y + CELL - m); ctx.lineTo(x + CELL - m, y + CELL - m - len);
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

export function drawMazeBase() {
  if (!ctx) return;
  const state = game.state as GameState;
  const { walls, bombs, monsters, rows, cols, offsetLeft, offsetTop } = state;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = "#141420";
      ctx.fillRect(offsetLeft + c * CELL + 1, offsetTop + r * CELL + 1, CELL - 2, CELL - 2);
    }
  ctx.strokeStyle = "#3a3a60";
  ctx.lineWidth = 2;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = offsetLeft + c * CELL, y = offsetTop + r * CELL;
      if (walls.h[r][c]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + CELL, y); ctx.stroke(); }
      if (walls.h[r + 1][c]) { ctx.beginPath(); ctx.moveTo(x, y + CELL); ctx.lineTo(x + CELL, y + CELL); ctx.stroke(); }
      if (walls.v[r][c]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + CELL); ctx.stroke(); }
      if (walls.v[r][c + 1]) { ctx.beginPath(); ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL); ctx.stroke(); }
    }
  drawEntryMarker(state.entry.r, state.entry.c);
  drawExitMarker(state.exit.r, state.exit.c);
  ctx.font = "18px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const b of bombs) ctx.fillText("💣", offsetLeft + (b.c + 0.5) * CELL, offsetTop + (b.r + 0.5) * CELL);
  for (const m of monsters) ctx.fillText(m.type === "fast" ? "👹" : "👾", offsetLeft + (m.c + 0.5) * CELL, offsetTop + (m.r + 0.5) * CELL);
}

export function render(ts: number) {
  if (!ctx) return;
  const { W, H } = game;
  const state = game.state as GameState;
  if (!state || (!state.alive && !state.isDead)) return;
  tickMonsters(ts);

  const now = ts || performance.now();
  let sx = 0, sy = 0;
  if (now < state.shakeTimer) {
    const progress = (state.shakeTimer - now) / 500;
    const intensity = state.shakeIntensity * progress;
    sx = (Math.random() - 0.5) * intensity;
    sy = (Math.random() - 0.5) * intensity;
  }

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(-Math.abs(sx), -Math.abs(sy), W + Math.abs(sx)*2, H + Math.abs(sy)*2);

  const { player, revealActive, revealX, revealY, revealTimer, stepFlash, isDead, particles, offsetLeft, offsetTop } = state;

  const lerpSpeed = 0.18;
  player.visualR += (player.r - player.visualR) * lerpSpeed;
  player.visualC += (player.c - player.visualC) * lerpSpeed;

  const px = offsetLeft + (player.visualC + 0.5) * CELL,
    py = offsetTop + (player.visualR + 0.5) * CELL;

  if (state.alive && !state.won && !["shocked", "frustrated", "curious"].includes(state.emotion)) {
    let newEmotion = "worried";
    for (const m of state.monsters) {
      if (Math.hypot(player.r - m.r, player.c - m.c) < 2.2) { newEmotion = "scared"; break; }
    }
    if (Math.hypot(player.r - state.exit.r, player.c - state.exit.c) < 1.8 && newEmotion !== "scared") newEmotion = "happy";
    const idleTime = now - state.lastAction;
    if (idleTime > 6000 && newEmotion === "worried") newEmotion = "thinking";
    else if (idleTime > 1500 && state.emotion === "determined") newEmotion = "worried";
    state.emotion = newEmotion;
  }
  if (state.alive && !state.won && state.emotion === "curious" && !state.revealActive && (now - state.lastAction) > 1000) state.emotion = "worried";

  if (now > state.blinkTimer) {
    if (state.isBlinking) { state.isBlinking = false; state.blinkTimer = now + 2000 + Math.random() * 4000; }
    else { state.isBlinking = true; state.blinkTimer = now + 150; }
  }

  const breathAmt = isDead ? 1.0 : 1.0 + Math.sin(now * 0.0022) * 0.035;
  const stepProg = Math.max(0, 1 - (now - (stepFlash || 0)) / 500);
  let revealProg = 0;
  if (revealActive) { revealProg = Math.max(0, 1 - (now - revealTimer) / REVEAL_DUR); if (revealProg <= 0) state.revealActive = false; }

  ctx.save(); ctx.fillStyle = "#0c0c14"; ctx.fillRect(0, 0, W, H); ctx.restore();

  if (state.won || state.isDead) {
    drawMazeBase();
  } else {
    ctx.save();
    const TRAIL_MAX_AGE = 10000;
    for (const [key, visitTs] of Object.entries(game.trail)) {
      const age = now - visitTs;
      if (age > TRAIL_MAX_AGE) { delete game.trail[key]; continue; }
      const fade = 1 - age / TRAIL_MAX_AGE;
      const [tr, tc] = key.split(",").map(Number);
      const tx = offsetLeft + tc * CELL, ty = offsetTop + tr * CELL;
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#141420"; ctx.fillRect(tx + 1, ty + 1, CELL - 2, CELL - 2);
      const { walls } = state;
      ctx.strokeStyle = "#404070"; ctx.lineWidth = 2;
      if (walls.h[tr][tc]) { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + CELL, ty); ctx.stroke(); }
      if (walls.h[tr + 1][tc]) { ctx.beginPath(); ctx.moveTo(tx, ty + CELL); ctx.lineTo(tx + CELL, ty + CELL); ctx.stroke(); }
      if (walls.v[tr][tc]) { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + CELL); ctx.stroke(); }
      if (walls.v[tr][tc + 1]) { ctx.beginPath(); ctx.moveTo(tx + CELL, ty); ctx.lineTo(tx + CELL, ty + CELL); ctx.stroke(); }
      ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const b of state.bombs) if (b.r === tr && b.c === tc) ctx.fillText("💣", tx + CELL / 2, ty + CELL / 2);
      for (const m of state.monsters) if (m.r === tr && m.c === tc) ctx.fillText(m.type === "fast" ? "👹" : "👾", tx + CELL / 2, ty + CELL / 2);
    }
    ctx.restore();

    if (revealActive && revealProg > 0) {
      ctx.save();
      const r = REVEAL_R * (0.5 + revealProg * 0.6);
      ctx.beginPath(); ctx.arc(revealX, revealY, r, 0, Math.PI * 2); ctx.clip();
      drawMazeBase();
      ctx.restore();
    }

    {
      ctx.save();
      const vr = CELL * 0.8;
      const gOuter = ctx.createRadialGradient(px, py, 0, px, py, vr);
      gOuter.addColorStop(0, "rgba(255,255,255,1)");
      gOuter.addColorStop(0.8, "rgba(255,255,255,0.8)");
      gOuter.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(px, py, vr, 0, Math.PI * 2); ctx.clip();
      drawMazeBase();
      ctx.restore();
    }
  }

  drawEntryMarker(state.entry.r, state.entry.c);
  drawExitMarker(state.exit.r, state.exit.c);

  if (stepProg > 0) {
    ctx.save();
    ctx.globalAlpha = stepProg * 0.7; ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, CELL * 0.72 * (1 + (1 - stepProg) * 0.4), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  const walkDist = Math.abs(player.r - player.visualR) + Math.abs(player.c - player.visualC);
  const isWalking = walkDist > 0.05;

  drawBoyFace(px, py - 2, 1.0, breathAmt, isDead, now, state.emotion, state.lastDir, isWalking);

  if (particles && particles.length > 0) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  if (now < state.flashTimer) {
    const flashProg = (state.flashTimer - now) / state.flashDur;
    ctx.save(); ctx.globalAlpha = flashProg; ctx.fillStyle = state.flashColor;
    ctx.fillRect(-Math.abs(sx), -Math.abs(sy), W + Math.abs(sx)*2, H + Math.abs(sy)*2);
    ctx.restore();
  }

  ctx.restore();
  if (game.animFrame !== null) game.animFrame = requestAnimationFrame(render);
}

export function showOverlay(title: string, desc: string, btn: string) {
  if (game.animFrame !== null) { cancelAnimationFrame(game.animFrame); game.animFrame = null; }
  document.getElementById("ov-title")!.textContent = title;
  document.getElementById("ov-desc")!.textContent = desc;
  document.getElementById("ov-btn")!.textContent = btn;
  document.getElementById("overlay")!.style.display = "flex";
}
