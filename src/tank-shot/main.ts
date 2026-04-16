import { state as gameContainer, initState } from './state.js';
import { initLevel, updateHUD } from './game.js';
import { setContext, render } from './renderer.js';
import { initInputs } from './input.js';
import { CELL, GRID_SIZE } from './constants.js';

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

    // Center the grid
    const boardSize = GRID_SIZE * CELL;
    s.offsetLeft = (s.width - boardSize) / 2;
    s.offsetTop = (s.height - boardSize) / 2;
}

window.addEventListener("resize", resizeCanvas);

document.getElementById("btn-home")?.addEventListener("click", () => {
    window.location.href = "/index.html";
});

document.getElementById("ov-btn")?.addEventListener("click", () => {
    const s = gameContainer.state = initState(window.innerWidth, window.innerHeight - 80);
    resizeCanvas();
    initInputs();
    initLevel(1);
    
    document.getElementById("overlay")!.style.display = "none";
    
    if (s.animFrame !== null) cancelAnimationFrame(s.animFrame);
    s.animFrame = requestAnimationFrame(render);
});
