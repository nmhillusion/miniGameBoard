import { state as gameContainer } from './state.js';
import { TANK_COLORS, WallType, Direction } from './constants.js';
import { tick } from './game.js';

let ctx: CanvasRenderingContext2D | null = null;

export function setContext(c: CanvasRenderingContext2D | null) {
    ctx = c;
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
    if (!ctx) return;
    if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(x, y, w, h, r);
    } else {
        // Fallback for older browsers
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

function drawTank(tank: any, ts: number, color: string, isPlayer: boolean) {
    if (!ctx) return;
    const s = gameContainer.state;
    if (!s) return;

    const r = tank.visualR;
    const c = tank.visualC;
    const dir = tank.dir;

    const x = s.offsetLeft + c * s.cell;
    const y = s.offsetTop + r * s.cell;
    const centerX = x + s.cell / 2;
    const centerY = y + s.cell / 2;
    const size = s.cell * 0.75;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((dir * 90) * Math.PI / 180);

    // 1. Shadows
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // 2. Tracks (Left & Right)
    const trackW = size * 0.22;
    const trackH = size;
    const isMoving = Math.hypot(tank.r - tank.visualR, tank.c - tank.visualC) > 0.01;
    
    // Track Animation Offset
    const segmentGap = 8;
    const moveOffset = isMoving ? (ts * 0.15) % segmentGap : 0;

    const drawTrack = (tx: number) => {
        if (!ctx) return;
        // Track Base (Metallic Silver/Gray)
        const trackGrad = ctx.createLinearGradient(tx - trackW/2, 0, tx + trackW/2, 0);
        trackGrad.addColorStop(0, '#334155');
        trackGrad.addColorStop(0.5, '#64748b');
        trackGrad.addColorStop(1, '#334155');
        
        ctx.fillStyle = trackGrad;
        ctx.beginPath();
        roundRect(tx - trackW/2, -trackH/2, trackW, trackH, 4);
        ctx.fill();

        // Track segments (Animated - much brighter)
        ctx.strokeStyle = '#cbd5e1'; // Lighter gray/silver
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]); 

        for (let i = -trackH/2 - moveOffset; i < trackH/2 + moveOffset; i += segmentGap) {
            if (i < -trackH/2 || i > trackH/2) continue;
            ctx.beginPath();
            ctx.moveTo(tx - trackW/2 + 1, i);
            ctx.lineTo(tx + trackW/2 - 1, i);
            ctx.stroke();
        }
    };
    drawTrack(-size/2);
    drawTrack(size/2);

    ctx.shadowBlur = 0; // Reset shadow for main body

    // 3. Main Body (Chassis)
    const chassisSize = size * 0.8;
    const bodyGrad = ctx.createLinearGradient(-chassisSize/2, -chassisSize/2, chassisSize/2, chassisSize/2);
    bodyGrad.addColorStop(0, color);
    bodyGrad.addColorStop(1, adjustColor(color, -40)); // Darker version
    
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    roundRect(-chassisSize/2, -chassisSize/2, chassisSize, chassisSize, 4);
    ctx.fill();
    
    // Chassis detail lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-chassisSize/4, -chassisSize/3, chassisSize/2, chassisSize/1.5);

    // 4. Barrel
    const barrelW = Math.max(4, size * 0.15);
    const barrelL = size * 0.7;
    const barrelGrad = ctx.createLinearGradient(-barrelW/2, 0, barrelW/2, 0);
    barrelGrad.addColorStop(0, '#94a3b8');
    barrelGrad.addColorStop(0.5, '#cbd5e1');
    barrelGrad.addColorStop(1, '#64748b');
    
    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    roundRect(-barrelW/2, -size/2 - (barrelL * 0.3), barrelW, barrelL, 2);
    ctx.fill();
    
    // Muzzle Brake
    ctx.fillStyle = '#475569';
    ctx.fillRect(-barrelW/2 - 1, -size/2 - (barrelL * 0.35), barrelW + 2, 4);

    // 5. Turret
    const turretSize = size * 0.5;
    const turretGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, turretSize/2);
    turretGrad.addColorStop(0, isPlayer ? '#7dd3fc' : '#fda4af');
    turretGrad.addColorStop(1, isPlayer ? '#0284c7' : '#e11d48');
    
    ctx.fillStyle = turretGrad;
    ctx.beginPath();
    ctx.arc(0, 0, turretSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hatch / Glow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, turretSize/6, 0, Math.PI * 2);
    ctx.fill();

    // Powerup Aura
    if (tank.powerType === 'penetrating') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, turretSize/2 + 2, 0, Math.PI * 2);
        ctx.stroke();
    } else if (isPlayer) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();
    }

    ctx.restore();
}

// Helper for modern colors
function adjustColor(hex: string, amt: number): string {
    let usePound = false;
    if (hex[0] === "#") { hex = hex.slice(1); usePound = true; }
    let num = parseInt(hex, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let g = ((num >> 8) & 0x00FF) + amt;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    let b = (num & 0x0000FF) + amt;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    return (usePound ? "#" : "") + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
}

function drawWall(r: number, c: number, type: WallType) {
    if (!ctx) return;
    const s = gameContainer.state;
    if (!s) return;

    const x = Math.floor(s.offsetLeft + c * s.cell);
    const y = Math.floor(s.offsetTop + r * s.cell);
    const cs = s.cell;

    if (type === WallType.PERMANENT) {
        // Metallic Reinforced Plate
        const grad = ctx.createLinearGradient(x, y, x + cs, y + cs);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(0.5, '#475569');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

        // Steel frame
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, cs - 8, cs - 8);

        // Rivets
        ctx.fillStyle = '#cbd5e1';
        const rSize = Math.max(2, cs * 0.08);
        const pad = cs * 0.15;
        const rivetPositions = [
            [pad, pad], [cs - pad, pad],
            [pad, cs - pad], [cs - pad, cs - pad]
        ];
        for (const [px, py] of rivetPositions) {
            ctx.beginPath();
            ctx.arc(x + px, y + py, rSize/2, 0, Math.PI * 2);
            ctx.fill();
        }

        // "X" brace detail
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + cs - 6, y + cs - 6);
        ctx.moveTo(x + cs - 6, y + 6); ctx.lineTo(x + 6, y + cs - 6);
        ctx.stroke();

    } else if (type === WallType.DESTRUCTIBLE) {
        // Red Brick Pattern
        ctx.fillStyle = '#451a03'; // Mortar color
        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

        const rows = 4;
        const cols = 2;
        const bh = (cs - 2) / rows;
        const bw = (cs - 2) / cols;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols + 1; col++) {
                const offset = (row % 2) * (bw / 2);
                const bx = x + 1 + col * bw - offset;
                const by = y + 1 + row * bh;
                
                // Only draw if within cell bounds
                const drawW = Math.min(bw - 1, x + cs - 1 - bx);
                if (drawW <= 0) continue;
                const finalX = Math.max(x + 1, bx);
                const finalW = drawW - (finalX - bx);

                const bGrad = ctx.createLinearGradient(finalX, by, finalX, by + bh);
                bGrad.addColorStop(0, '#92400e');
                bGrad.addColorStop(1, '#78350f');
                
                ctx.fillStyle = bGrad;
                ctx.fillRect(finalX, by, finalW, bh - 1);
                
                // Brick highlight
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.strokeRect(finalX + 1, by + 1, finalW - 2, 1);
            }
        }
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
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= s.gridSize; i++) {
        // Horizontal lines
        ctx.beginPath();
        const y = Math.floor(s.offsetTop + i * s.cell) + 0.5; // +0.5 for crisp 1px lines
        ctx.moveTo(s.offsetLeft, y);
        ctx.lineTo(s.offsetLeft + s.gridSize * s.cell, y);
        ctx.stroke();

        // Vertical lines
        ctx.beginPath();
        const x = Math.floor(s.offsetLeft + i * s.cell) + 0.5;
        ctx.moveTo(x, s.offsetTop);
        ctx.lineTo(x, s.offsetTop + s.gridSize * s.cell);
        ctx.stroke();
    }

    // Draw Walls
    for (let r = 0; r < s.gridSize; r++) {
        for (let c = 0; c < s.gridSize; c++) {
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
        drawTank(s.player, ts, TANK_COLORS.PLAYER, true);
    }

    for (const bot of s.bots) {
        if (bot.alive) {
            bot.visualR += (bot.r - bot.visualR) * lerpSpeed;
            bot.visualC += (bot.c - bot.visualC) * lerpSpeed;
            drawTank(bot, ts, TANK_COLORS.BOT, false);
        }
    }

    // Draw Bullets
    const bulletSize = Math.max(3, s.cell * 0.1);
    for (const b of s.bullets) {
        ctx.beginPath();
        if (b.penetrating) {
            ctx.fillStyle = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#38bdf8';
        } else {
            ctx.fillStyle = '#fbbf24';
            ctx.shadowBlur = 0;
        }
        ctx.arc(s.offsetLeft + (b.visualX + 0.5) * s.cell, s.offsetTop + (b.visualY + 0.5) * s.cell, b.penetrating ? bulletSize * 1.5 : bulletSize, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Draw Items (Hearts)
    for (const item of s.items) {
        if (!item.alive) continue;
        const x = s.offsetLeft + (item.c + 0.5) * s.cell;
        const y = s.offsetTop + (item.r + 0.5) * s.cell;
        
        const age = ts - item.spawnTime;
        const maxAge = item.type === 'heart' ? 20000 : 30000;
        const isExpiring = age > (maxAge - 5000);
        
        // Faster blinking for bombs
        const blinkRate = item.type === 'bomb' && age > (maxAge - 3000) ? 100 : 200;
        const blink = isExpiring ? Math.floor(ts / blinkRate) % 2 === 0 : true;

        if (blink) {
            const pulseRate = item.type === 'bomb' ? 100 : 200;
            const pulse = 1 + Math.sin(ts / pulseRate) * 0.1;
            ctx.font = `${Math.floor(s.cell * 0.6 * pulse)}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            let icon = "❤️";
            if (item.type === 'bomb') icon = "💣";
            if (item.type === 'powerup') icon = "⚡";
            ctx.fillText(icon, x, y);
        }
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
