import { state as gameContainer, GameState, Tank, Bullet, Particle } from './state.js';
import { GRID_SIZE, Direction, DIR_VECTORS, WallType, CELL, SHAKE_DUR, EXPLOSION_PARTICLES, TANK_COLORS } from './constants.js';

export function setMsg(text: string) {
    const bar = document.getElementById("msg-bar");
    if (bar) {
        bar.textContent = text;
        bar.classList.add("visible");
        setTimeout(() => bar.classList.remove("visible"), 3000);
    }
}

export function updateHUD() {
    const s = gameContainer.state;
    if (!s) return;
    const hLvl = document.getElementById("h-level");
    const hBots = document.getElementById("h-bots");
    const hLives = document.getElementById("h-lives");
    const hScore = document.getElementById("h-score");

    if (hLvl) hLvl.textContent = String(s.level);
    if (hBots) hBots.textContent = String(s.bots.filter(b => b.alive).length);
    if (hLives) hLives.textContent = "❤️".repeat(Math.max(0, s.lives));
    if (hScore) hScore.textContent = String(s.score);
}

export function spawnExplosion(r: number, c: number, color: string) {
    const s = gameContainer.state;
    if (!s) return;
    const x = s.offsetLeft + (c + 0.5) * CELL;
    const y = s.offsetTop + (r + 0.5) * CELL;
    for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
        s.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1,
            decay: 0.02 + Math.random() * 0.02,
            color,
            size: 2 + Math.random() * 4
        });
    }
    s.shakeTimer = performance.now() + SHAKE_DUR;
    s.shakeIntensity = 5;
}

export function initLevel(lvl: number) {
    const s = gameContainer.state;
    if (!s) return;

    s.level = lvl;
    s.won = false;
    s.isDead = false;
    s.bullets = [];
    s.particles = [];

    // Build grid
    s.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(WallType.NONE));
    
    // Procedural walls based on level
    const wallDensity = 0.1 + Math.min(0.2, lvl * 0.02);
    const permRatio = 0.3 + Math.max(0, 0.4 - lvl * 0.05); // More perm walls in early levels

    for(let r=0; r<GRID_SIZE; r++) {
        for(let c=0; c<GRID_SIZE; c++) {
            if (Math.random() < wallDensity) {
                s.grid[r][c] = Math.random() < permRatio ? WallType.PERMANENT : WallType.DESTRUCTIBLE;
            }
        }
    }

    // Spawn Player
    s.player.r = GRID_SIZE - 2;
    s.player.c = Math.floor(GRID_SIZE / 2);
    s.player.dir = Direction.UP;
    s.player.visualR = s.player.r;
    s.player.visualC = s.player.c;
    s.player.alive = true;
    s.grid[s.player.r][s.player.c] = WallType.NONE;

    // Spawn Bots
    const botCount = 2 + Math.floor(lvl / 2);
    s.bots = [];
    let spawned = 0;
    while(spawned < botCount) {
        const r = Math.floor(Math.random() * (GRID_SIZE / 2));
        const c = Math.floor(Math.random() * GRID_SIZE);
        if (s.grid[r][c] === WallType.NONE && (r !== s.player.r || c !== s.player.c)) {
            s.bots.push({
                r, c, dir: Direction.DOWN, visualR: r, visualC: c,
                lastAction: 0, alive: true, type: 'bot'
            });
            spawned++;
        }
    }

    updateHUD();
}

export function tryMove(tank: Tank, dir: Direction) {
    const s = gameContainer.state;
    if (!s || !tank.alive) return;

    if (tank.dir !== dir) {
        tank.dir = dir;
        return;
    }

    const vec = DIR_VECTORS[dir];
    const nr = tank.r + vec.r;
    const nc = tank.c + vec.c;

    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && s.grid[nr][nc] === WallType.NONE) {
        // Check bots collision
        const otherTank = s.bots.find(b => b.alive && b.r === nr && b.c === nc) || 
                         (tank.type === 'bot' && s.player.alive && s.player.r === nr && s.player.c === nc ? s.player : null);
        
        if (!otherTank) {
            tank.r = nr;
            tank.c = nc;
        }
    }
}

export function shoot(tank: Tank) {
    const s = gameContainer.state;
    if (!s || !tank.alive) return;

    const cooldown = tank.type === 'player' ? 250 : 1000;
    const now = performance.now();
    if (now - tank.lastAction < cooldown) return;
    tank.lastAction = now;

    s.bullets.push({
        r: tank.r,
        c: tank.c,
        dir: tank.dir,
        owner: tank.type,
        active: true,
        visualX: tank.c,
        visualY: tank.r
    });
}

function updateBullets(ts: number) {
    const s = gameContainer.state;
    if (!s) return;

    const bulletSpeed = 0.2;

    for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        if (!b.active) continue;

        const vec = DIR_VECTORS[b.dir];
        b.visualX += vec.c * bulletSpeed;
        b.visualY += vec.r * bulletSpeed;

        const gr = Math.round(b.visualY);
        const gc = Math.round(b.visualX);

        // Out of bounds
        if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) {
            b.active = false;
            continue;
        }

        // Hit Wall
        const wall = s.grid[gr][gc];
        if (wall !== WallType.NONE) {
            if (wall === WallType.DESTRUCTIBLE) {
                s.grid[gr][gc] = WallType.NONE;
                spawnExplosion(gr, gc, '#eab308');
            }
            b.active = false;
            continue;
        }

        // Hit Tank
        if (b.owner === 'bot' && s.player.alive && Math.hypot(b.visualX - s.player.c, b.visualY - s.player.r) < 0.4) {
            s.player.alive = false;
            b.active = false;
            s.lives--;
            spawnExplosion(s.player.r, s.player.c, TANK_COLORS.PLAYER);
            if (s.lives <= 0) {
                s.isDead = true;
            } else {
                setTimeout(() => {
                    s.player.alive = true;
                    s.player.r = GRID_SIZE - 2;
                    s.player.c = Math.floor(GRID_SIZE / 2);
                }, 1000);
            }
            updateHUD();
        } else if (b.owner === 'player') {
            for (const bot of s.bots) {
                if (bot.alive && Math.hypot(b.visualX - bot.c, b.visualY - bot.r) < 0.4) {
                    bot.alive = false;
                    b.active = false;
                    s.score += 100;
                    spawnExplosion(bot.r, bot.c, TANK_COLORS.BOT);
                    updateHUD();
                    break;
                }
            }
        }
    }

    s.bullets = s.bullets.filter(b => b.active);

    if (s.bots.every(b => !b.alive) && !s.won) {
        s.won = true;
        setTimeout(() => {
            initLevel(s.level + 1);
            setMsg(`Chasing next mission: Level ${s.level}`);
        }, 2000);
    }
}

function updateBots(ts: number) {
    const s = gameContainer.state;
    if (!s || s.won || s.isDead) return;

    for (const bot of s.bots) {
        if (!bot.alive) continue;

        const dist = Math.hypot(bot.r - s.player.r, bot.c - s.player.c);
        const now = ts;

        if (now - bot.lastAction > 1000) {
            if (dist < 4) { // Hunt range
                // Try to align and shoot
                if (bot.r === s.player.r) {
                    const dir = s.player.c > bot.c ? Direction.RIGHT : Direction.LEFT;
                    if (bot.dir !== dir) bot.dir = dir;
                    else shoot(bot);
                } else if (bot.c === s.player.c) {
                    const dir = s.player.r > bot.r ? Direction.DOWN : Direction.UP;
                    if (bot.dir !== dir) bot.dir = dir;
                    else shoot(bot);
                } else {
                    // Move towards player
                    const dr = s.player.r - bot.r;
                    const dc = s.player.c - bot.c;
                    if (Math.abs(dr) > Math.abs(dc)) {
                        tryMove(bot, dr > 0 ? Direction.DOWN : Direction.UP);
                    } else {
                        tryMove(bot, dc > 0 ? Direction.RIGHT : Direction.LEFT);
                    }
                }
            } else {
                // Random move
                const rand = Math.random();
                if (rand < 0.05) shoot(bot);
                else if (rand < 0.4) tryMove(bot, Math.floor(Math.random() * 4));
            }
            bot.lastAction = now;
        }
    }
}

export function tick(ts: number) {
    updateBullets(ts);
    updateBots(ts);
}
