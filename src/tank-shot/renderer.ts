import { state as gameContainer } from './state.js';
import { CELL, TANK_COLORS, WallType, GRID_SIZE, Direction } from './constants.js';
import { tick } from './game.js';

let ctx: CanvasRenderingContext2D | null = null;

export function setContext(c: CanvasRenderingContext2D | null) {
    ctx = c;
}

function drawTank(r: number, c: number, dir: Direction, color: string, isPlayer: boolean) {
    if (!ctx) return;
    const s = gameContainer.state;
    if (!s) return;

    const x = s.offsetLeft + c * CELL;
    const y = s.offsetTop + r * CELL;
    const centerX = x + CELL / 2;
    const centerY = y + CELL / 2;
    const size = CELL * 0.8;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((dir * 90) * Math.PI / 180);

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Tracks
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-size/2 - 2, -size/2, 4, size);
    ctx.fillRect(size/2 - 2, -size/2, 4, size);

    // Turret
    ctx.fillStyle = isPlayer ? '#7dd3fc' : '#fda4af';
    ctx.fillRect(-size/4, -size/4, size/2, size/2);
    
    // Barrel
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-2, -size/2 - 5, 4, size/2);

    ctx.restore();
}

function drawWall(r: number, c: number, type: WallType) {
    if (!ctx) return;
    const s = gameContainer.state;
    if (!s) return;

    const x = s.offsetLeft + c * CELL;
    const y = s.offsetTop + r * CELL;

    if (type === WallType.PERMANENT) {
        ctx.fillStyle = '#059669'; // Emerald
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        ctx.strokeStyle = '#10b981';
        ctx.strokeRect(x + 5, y + 5, CELL - 10, CELL - 10);
    } else if (type === WallType.DESTRUCTIBLE) {
        ctx.fillStyle = '#78350f'; // Amber/Brown
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        // Brick pattern
        ctx.strokeStyle = '#92400e';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + CELL/2); ctx.lineTo(x + CELL - 2, y + CELL/2);
        ctx.moveTo(x + CELL/2, y + 2); ctx.lineTo(x + CELL/2, y + CELL/2);
        ctx.stroke();
    }
}

export function render(ts: number) {
    if (!ctx) return;
    const s = gameContainer.state;
    if (!s) return;

    tick(ts);

    // Camera Shake
    let sx = 0, sy = 0;
    if (ts < s.shakeTimer) {
        const prog = (s.shakeTimer - ts) / 500;
        sx = (Math.random() - 0.5) * s.shakeIntensity * prog;
        sy = (Math.random() - 0.5) * s.shakeIntensity * prog;
    }

    ctx.clearRect(0, 0, s.width, s.height);
    ctx.save();
    ctx.translate(sx, sy);

    // Draw Grid / Floor
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(s.offsetLeft + i * CELL, s.offsetTop);
        ctx.lineTo(s.offsetLeft + i * CELL, s.offsetTop + GRID_SIZE * CELL);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.offsetLeft, s.offsetTop + i * CELL);
        ctx.lineTo(s.offsetLeft + GRID_SIZE * CELL, s.offsetTop + i * CELL);
        ctx.stroke();
    }

    // Draw Walls
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (s.grid[r][c] !== WallType.NONE) {
                drawWall(r, c, s.grid[r][c]);
            }
        }
    }

    // Draw Tanks
    const lerpSpeed = 0.2;
    if (s.player.alive) {
        s.player.visualR += (s.player.r - s.player.visualR) * lerpSpeed;
        s.player.visualC += (s.player.c - s.player.visualC) * lerpSpeed;
        drawTank(s.player.visualR, s.player.visualC, s.player.dir, TANK_COLORS.PLAYER, true);
    }

    for (const bot of s.bots) {
        if (bot.alive) {
            bot.visualR += (bot.r - bot.visualR) * lerpSpeed;
            bot.visualC += (bot.c - bot.visualC) * lerpSpeed;
            drawTank(bot.visualR, bot.visualC, bot.dir, TANK_COLORS.BOT, false);
        }
    }

    // Draw Bullets
    ctx.fillStyle = '#fbbf24';
    for (const b of s.bullets) {
        ctx.beginPath();
        ctx.arc(s.offsetLeft + (b.visualX + 0.5) * CELL, s.offsetTop + (b.visualY + 0.5) * CELL, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { s.particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    if (s.animFrame !== null) s.animFrame = requestAnimationFrame(render);
}

export function showOverlay(title: string, desc: string, btn: string) {
    const s = gameContainer.state;
    if (!s) return;
    if (s.animFrame !== null) { cancelAnimationFrame(s.animFrame); s.animFrame = null; }
    
    const h2 = document.getElementById("ov-title");
    const p = document.getElementById("ov-desc");
    const b = document.getElementById("ov-btn");
    const ov = document.getElementById("overlay");

    if (h2) h2.textContent = title;
    if (p) p.innerHTML = desc;
    if (b) b.textContent = btn;
    if (ov) ov.style.display = "flex";
}
