import { state as game, GameState } from './state.js';
import { movePlayer, updateHUD, setMsg } from './game.js';
import { startMusic } from './utils.js';

export function initInputs(canvas: HTMLCanvasElement) {
  let touchStartX = 0;
  let touchStartY = 0;

  // 1. Swipe Gestures
  canvas.addEventListener("touchstart", (e: TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  canvas.addEventListener("touchend", (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 20) {
      if (absDx > absDy) {
        if (dx > 0) movePlayer(3); // Right
        else movePlayer(2); // Left
      } else {
        if (dy > 0) movePlayer(1); // Down
        else movePlayer(0); // Up
      }
    }
  }, { passive: true });

  // 2. Double-click to Reveal
  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    const state = game.state as GameState;
    if (!state || !state.alive || state.won || state.isDead) return;

    const now = performance.now();
    const timeSinceLastClick = now - (state.lastClickTime || 0);
    state.lastClickTime = now;

    if (timeSinceLastClick > 300) {
      state.lastAction = now;
      return;
    }

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

  // 3. Keyboard Controls
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    const state = game.state as GameState;
    if (!state || !state.alive || state.won || state.isDead) return;

    if (e.key === "ArrowUp" || e.key === "w") movePlayer(0);
    else if (e.key === "ArrowDown" || e.key === "s") movePlayer(1);
    else if (e.key === "ArrowLeft" || e.key === "a") movePlayer(2);
    else if (e.key === "ArrowRight" || e.key === "d") movePlayer(3);
  });
}
