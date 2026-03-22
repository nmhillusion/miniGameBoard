import { state as game, GameState } from './state.js';
import { initLevel, movePlayer, updateHUD, setMsg } from './game.js';
import { setContext, render } from './renderer.js';
import { CELL } from './constants.js';
import { startMusic, toggleMute } from './utils.js';

const canvas = document.getElementById("gc") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
setContext(ctx);

function resizeCanvas() {
  game.W = window.innerWidth;
  game.H = window.innerHeight;
  canvas.width = game.W;
  canvas.height = game.H;
}

window.addEventListener("resize", () => {
  resizeCanvas();
  // If game is running, we might need to re-init some offsets, 
  // but for now let's just resize.
});

// Initialize canvas size before first level
resizeCanvas();

// Initial HUD update
// initLevel will be called when user clicks start

canvas.addEventListener("pointerdown", (e: PointerEvent) => {
  startMusic();
  const state = game.state as GameState;
  if (!state || !state.alive || state.won) return;
  if (state.touches <= 0) {
    setMsg("Hết lần chạm!", "alert");
    return;
  }
  const rect = canvas.getBoundingClientRect();
  state.touches--;
  updateHUD();
  const rawX = (e.clientX - rect.left) * (game.W / rect.width);
  const rawY = (e.clientY - rect.top) * (game.H / rect.height);
  state.revealX = rawX;
  state.revealY = rawY;
  state.revealActive = true;
  state.revealTimer = performance.now();
  state.lastAction = performance.now();
  if (state.emotion !== "shocked" && state.emotion !== "scared") {
    state.emotion = "curious";
  }
  if (state.touches === 0) setMsg("Đây là lần chạm cuối!", "alert");
  else setMsg("");
});

document.getElementById("ov-btn")?.addEventListener("click", () => {
  startMusic();
  document.getElementById("overlay")!.style.display = "none";
  document.getElementById("hud")?.classList.add("visible");
  document.getElementById("legend")?.classList.add("visible");
  document.getElementById("controls")?.classList.add("visible");
  const target = game.nextLevelTarget || { lvlIdx: 0, bonus: 0 };
  initLevel(target.lvlIdx, target.bonus);
  setMsg("Chạm vào màn hình để nhìn thấy mê cung!");
  if (game.animFrame !== null) cancelAnimationFrame(game.animFrame);
  game.animFrame = requestAnimationFrame(render);
});

document.getElementById("btn-home")?.addEventListener("click", () => {
  window.location.href = "/index.html";
});

document.getElementById("btn-mute")?.addEventListener("click", () => {
  const muted = toggleMute();
  const btn = document.getElementById("btn-mute");
  if (btn) btn.textContent = muted ? "🔇" : "🔊";
});

document.getElementById("btn-up")?.addEventListener("click", () => movePlayer(0));
document.getElementById("btn-down")?.addEventListener("click", () => movePlayer(1));
document.getElementById("btn-left")?.addEventListener("click", () => movePlayer(2));
document.getElementById("btn-right")?.addEventListener("click", () => movePlayer(3));

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "ArrowUp" || e.key === "w") movePlayer(0);
  else if (e.key === "ArrowDown" || e.key === "s") movePlayer(1);
  else if (e.key === "ArrowLeft" || e.key === "a") movePlayer(2);
  else if (e.key === "ArrowRight" || e.key === "d") movePlayer(3);
});
