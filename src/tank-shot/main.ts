import { state as gameContainer, initState } from './state.js';
import { initLevel, updateHUD } from './game.js';
import { setContext, render } from './renderer.js';
import { initInputs } from './input.js';
import { soundManager } from './sound.js';

const canvas = document.getElementById("gc") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
setContext(ctx);

function resizeCanvas() {
    const s = gameContainer.state;
    if (!s) return;

    const hud = document.getElementById("hud");
    const hudHeight = hud ? hud.getBoundingClientRect().height : 0;
    const dpr = window.devicePixelRatio || 1;

    s.width = window.innerWidth;
    s.height = window.innerHeight - hudHeight;

    // Set display size (css)
    canvas.style.width = s.width + 'px';
    canvas.style.height = s.height + 'px';

    // Set actual resolution
    canvas.width = s.width * dpr;
    canvas.height = s.height * dpr;

    // Scale context to match DPR
    ctx?.scale(dpr, dpr);

    // Calculate dynamic cell size to fit screen
    const padding = Math.min(20, s.width * 0.05);
    const availW = s.width - padding * 2;
    const availH = s.height - padding * 2;
    s.cell = Math.floor(Math.min(availW / s.gridSize, availH / s.gridSize));

    // Center the grid
    const boardSize = s.gridSize * s.cell;
    s.offsetLeft = (s.width - boardSize) / 2;
    s.offsetTop = (s.height - boardSize) / 2;
}

// Prevent scrolling on mobile
document.addEventListener('touchmove', (e) => {
    if (e.target === canvas || (e.target as HTMLElement).closest('#controls-layer')) {
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener("resize", resizeCanvas);

document.getElementById("btn-home")?.addEventListener("click", () => {
    window.location.href = "/index.html";
});

document.getElementById("btn-mute-music")?.addEventListener("click", (e) => {
    const muted = soundManager.toggleMusicMute();
    (e.currentTarget as HTMLElement).classList.toggle("muted", muted);
});

document.getElementById("btn-mute-sfx")?.addEventListener("click", (e) => {
    const muted = soundManager.toggleSFXMute();
    (e.currentTarget as HTMLElement).classList.toggle("muted", muted);
});

export function handleOverlayAction() {
    let s = gameContainer.state;
    const hud = document.getElementById("hud");
    const hudHeight = hud ? hud.getBoundingClientRect().height : 0;
    
    // Determine grid size based on screen
    const w = window.innerWidth;
    const gridSize = w > 1024 ? 21 : (w > 600 ? 15 : 10);

    if (!s) {
        // Initial start
        s = gameContainer.state = initState(window.innerWidth, window.innerHeight - hudHeight, gridSize);
        initLevel(1);
    } else if (s.won) {
        // Next Level
        initLevel(s.level + 1);
    } else if (s.isDead) {
        // Restart Campaign
        const score = s.score; 
        const level = 1;
        s = gameContainer.state = initState(window.innerWidth, window.innerHeight - hudHeight, gridSize);
        s.score = 0; 
        initLevel(level);
    }

    resizeCanvas();
    const ov = document.getElementById("overlay");
    if (ov) ov.style.display = "none";

    soundManager.playBGM();
    
    if (s.animFrame !== null) cancelAnimationFrame(s.animFrame);
    s.animFrame = requestAnimationFrame(render);
}

document.getElementById("ov-btn")?.addEventListener("click", handleOverlayAction);

// Initialize inputs at startup to allow Enter key to start the game
initInputs(handleOverlayAction);
