import { state as gameContainer, initState } from './state.js';
import { initLevel, updateHUD } from './game.js';
import { setContext, render } from './renderer.js';
import { initInputs } from './input.js';
import { GRID_SIZE } from './constants.js';
import { soundManager } from './sound.js';

const canvas = document.getElementById("gc") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
setContext(ctx);

function resizeCanvas() {
    const s = gameContainer.state;
    if (!s) return;

    s.width = window.innerWidth;
    s.height = window.innerHeight - 80; // Adjusted for HUD
    canvas.width = s.width;
    canvas.height = s.height;

    // Calculate dynamic cell size to fit screen
    const padding = 20;
    const availW = s.width - padding * 2;
    const availH = s.height - padding * 2;
    s.cell = Math.floor(Math.min(availW / GRID_SIZE, availH / GRID_SIZE));

    // Center the grid
    const boardSize = GRID_SIZE * s.cell;
    s.offsetLeft = (s.width - boardSize) / 2;
    s.offsetTop = (s.height - boardSize) / 2;
}

window.addEventListener("resize", resizeCanvas);

document.getElementById("btn-home")?.addEventListener("click", () => {
    window.location.href = "/index.html";
});

document.getElementById("btn-mute")?.addEventListener("click", (e) => {
    const muted = soundManager.toggleMute();
    const btn = e.currentTarget as HTMLButtonElement;
    btn.textContent = muted ? "🔇" : "🔊";
});

export function handleOverlayAction() {
    let s = gameContainer.state;
    
    if (!s) {
        // Initial start
        s = gameContainer.state = initState(window.innerWidth, window.innerHeight - 80);
        initLevel(1);
    } else if (s.won) {
        // Next Level
        initLevel(s.level + 1);
    } else if (s.isDead) {
        // Restart Campaign
        const score = s.score; // Optional: persist score or reset
        const level = 1;
        s = gameContainer.state = initState(window.innerWidth, window.innerHeight - 80);
        s.score = 0; 
        initLevel(level);
    }

    resizeCanvas();
    const ov = document.getElementById("overlay");
    if (ov) ov.style.display = "none";
    
    if (s.animFrame !== null) cancelAnimationFrame(s.animFrame);
    s.animFrame = requestAnimationFrame(render);
}

document.getElementById("ov-btn")?.addEventListener("click", handleOverlayAction);

// Initialize inputs at startup to allow Enter key to start the game
initInputs(handleOverlayAction);
