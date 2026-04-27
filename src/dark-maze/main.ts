import { state as game, GameState } from './state.js';
import { initLevel, updateHUD, setMsg } from './game.js';
import { setContext, render } from './renderer.js';
import { startMusic, toggleMusicMute, toggleSFXMute } from './utils.js';
import { initInputs } from './input.js';

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
});

// Initialize canvas size and inputs
resizeCanvas();
initInputs(canvas);

document.getElementById("ov-btn")?.addEventListener("click", () => {
  startMusic();
  document.getElementById("overlay")!.style.display = "none";
  document.getElementById("hud")?.classList.add("visible");
  document.getElementById("legend")?.classList.add("visible");
  
  // Explicitly reset the game state before initializing level
  const target = game.nextLevelTarget || { lvlIdx: 0, bonus: 0 };
  initLevel(target.lvlIdx, target.bonus);
  
  setMsg("Vuốt để di chuyển. Chạm nhanh 2 lần để nhìn thấy mê cung!");
  
  if (game.animFrame !== null) cancelAnimationFrame(game.animFrame);
  game.animFrame = requestAnimationFrame(render);
});

document.getElementById("btn-home")?.addEventListener("click", () => {
  window.location.href = "/index.html";
});

document.getElementById("btn-mute-music")?.addEventListener("click", (e) => {
  const muted = toggleMusicMute();
  (e.currentTarget as HTMLElement).classList.toggle("muted", muted);
});

document.getElementById("btn-mute-sfx")?.addEventListener("click", (e) => {
  const muted = toggleSFXMute();
  (e.currentTarget as HTMLElement).classList.toggle("muted", muted);
});
