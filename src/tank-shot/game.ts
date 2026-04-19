import { state as gameContainer, GameState, Tank, Bullet, Particle } from './state.js';
import { Direction, DIR_VECTORS, WallType, SHAKE_DUR, EXPLOSION_PARTICLES, TANK_COLORS } from './constants.js';
import { showOverlay } from './renderer.js';
import { soundManager } from './sound.js';

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
    if (hBots) hBots.textContent = `${s.botsDestroyedCount}/${s.totalBotsToSpawn}`;
    if (hLives) {
        const active = Math.max(0, Math.min(5, s.lives));
        const empty = 5 - active;
        hLives.textContent = "❤️".repeat(active) + "🖤".repeat(empty);
    }
    if (hScore) hScore.textContent = String(s.score);
}

export function spawnExplosion(r: number, c: number, color: string) {
    const s = gameContainer.state;
    if (!s) return;
    soundManager.playExplosion();
    const x = s.offsetLeft + (c + 0.5) * s.cell;
    const y = s.offsetTop + (r + 0.5) * s.cell;
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
    s.items = [];

    // Build grid
    s.grid = Array.from({ length: s.gridSize }, () => Array(s.gridSize).fill(WallType.NONE));
    
    // Procedural walls based on level
    const wallDensity = 0.1 + Math.min(0.2, lvl * 0.02);
    const permRatio = 0.3 + Math.max(0, 0.4 - lvl * 0.05); // More perm walls in early levels

    for(let r=0; r<s.gridSize; r++) {
        for(let c=0; c<s.gridSize; c++) {
            if (Math.random() < wallDensity) {
                s.grid[r][c] = Math.random() < permRatio ? WallType.PERMANENT : WallType.DESTRUCTIBLE;
            }
        }
    }

    // Spawn Player
    s.player.r = s.gridSize - 2;
    s.player.c = Math.floor(s.gridSize / 2);
    s.player.dir = Direction.UP;
    s.player.visualR = s.player.r;
    s.player.visualC = s.player.c;
    s.player.alive = true;
    s.grid[s.player.r][s.player.c] = WallType.NONE;

    // Spawn Bots
    s.totalBotsToSpawn = 5 + Math.floor(lvl * 1.5);
    s.botsSpawnedCount = 0;
    s.botsDestroyedCount = 0;
    s.bots = [];

    const maxActive = Math.min(3 + Math.floor(lvl / 4), 6);
    for (let i = 0; i < maxActive; i++) {
        spawnBot();
    }

    updateHUD();
}

export function spawnBot() {
    const s = gameContainer.state;
    if (!s || s.botsSpawnedCount >= s.totalBotsToSpawn) return;

    let attempts = 0;
    while(attempts < 100) {
        let r = 0, c = 0;
        const edge = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
        
        if (edge === 0) { // Top
            r = 0;
            c = Math.floor(Math.random() * s.gridSize);
        } else if (edge === 1) { // Right
            r = Math.floor(Math.random() * s.gridSize);
            c = s.gridSize - 1;
        } else if (edge === 2) { // Bottom
            r = s.gridSize - 1;
            c = Math.floor(Math.random() * s.gridSize);
        } else { // Left
            r = Math.floor(Math.random() * s.gridSize);
            c = 0;
        }
        
        // Ensure spawn point is clear and not too close to player
        const distToPlayer = Math.hypot(r - s.player.r, c - s.player.c);
        if (s.grid[r][c] === WallType.NONE && distToPlayer > 3) {
            const otherBot = s.bots.find(b => b.alive && b.r === r && b.c === c);
            if (!otherBot) {
                // Initial state for bot
                let dir: Direction = Direction.DOWN;
                let visualR = r;
                let visualC = c;

                if (edge === 0) { // Top
                    dir = Direction.DOWN;
                    visualR = -1;
                } else if (edge === 1) { // Right
                    dir = Direction.LEFT;
                    visualC = s.gridSize;
                } else if (edge === 2) { // Bottom
                    dir = Direction.UP;
                    visualR = s.gridSize;
                } else if (edge === 3) { // Left
                    dir = Direction.RIGHT;
                    visualC = -1;
                }

                s.bots.push({
                    r, c, dir, visualR, visualC,
                    lastAction: performance.now(), // Delay first action to let entry animation play
                    alive: true, type: 'bot',
                    powerType: 'none', powerTimer: 0
                });
                s.botsSpawnedCount++;
                return;
            }
        }
        attempts++;
    }
}

export function spawnHeart() {
    const s = gameContainer.state;
    if (!s) return;

    let attempts = 0;
    while (attempts < 50) {
        const r = Math.floor(Math.random() * s.gridSize);
        const c = Math.floor(Math.random() * s.gridSize);

        if (s.grid[r][c] === WallType.NONE) {
            const hasTank = s.bots.find(b => b.alive && b.r === r && b.c === c) || (s.player.r === r && s.player.c === c);
            const hasItem = s.items.find(i => i.alive && i.r === r && i.c === c);

            if (!hasTank && !hasItem) {
                s.items.push({
                    r, c, type: 'heart', alive: true, spawnTime: performance.now()
                });
                return;
            }
        }
        attempts++;
    }
}

export function spawnBomb() {
    const s = gameContainer.state;
    if (!s) return;

    let attempts = 0;
    while (attempts < 50) {
        const r = Math.floor(Math.random() * s.gridSize);
        const c = Math.floor(Math.random() * s.gridSize);

        if (s.grid[r][c] === WallType.NONE) {
            const hasTank = s.bots.find(b => b.alive && b.r === r && b.c === c) || (s.player.r === r && s.player.c === c);
            const hasItem = s.items.find(i => i.alive && i.r === r && i.c === c);

            if (!hasTank && !hasItem) {
                s.items.push({
                    r, c, type: 'bomb', alive: true, spawnTime: performance.now()
                });
                return;
            }
        }
        attempts++;
    }
}

export function spawnPowerup() {
    const s = gameContainer.state;
    if (!s) return;

    let attempts = 0;
    while (attempts < 50) {
        const r = Math.floor(Math.random() * s.gridSize);
        const c = Math.floor(Math.random() * s.gridSize);

        if (s.grid[r][c] === WallType.NONE) {
            const hasTank = s.bots.find(b => b.alive && b.r === r && b.c === c) || (s.player.alive && s.player.r === r && s.player.c === c);
            const hasItem = s.items.find(i => i.alive && i.r === r && i.c === c);

            if (!hasTank && !hasItem) {
                s.items.push({
                    r, c, type: 'powerup', alive: true, spawnTime: performance.now()
                });
                return;
            }
        }
        attempts++;
    }
}

export function explodeBomb(r: number, c: number) {
    const s = gameContainer.state;
    if (!s) return;

    soundManager.playLargeExplosion();
    s.shakeTimer = performance.now() + 1000;
    s.shakeIntensity = 15;

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;

            if (nr >= 0 && nr < s.gridSize && nc >= 0 && nc < s.gridSize) {
                // Destroy walls (even permanent)
                s.grid[nr][nc] = WallType.NONE;
                spawnExplosion(nr, nc, '#ef4444'); // Red explosion

                // Kill tanks
                if (s.player.alive && s.player.r === nr && s.player.c === nc) {
                    s.player.alive = false;
                    s.lives--;
                    soundManager.playKillPlayer();
                    if (s.lives <= 0) {
                        s.isDead = true;
                        soundManager.playLose();
                        showOverlay("MISSION FAILED", "You were caught in a bomb blast!", "RETRY");
                    } else {
                        setTimeout(() => {
                            s.player.alive = true;
                            s.player.r = s.gridSize - 2;
                            s.player.c = Math.floor(s.gridSize / 2);
                        }, 1000);
                    }
                }

                for (const bot of s.bots) {
                    if (bot.alive && bot.r === nr && bot.c === nc) {
                        bot.alive = false;
                        s.score += 200;
                        s.botsDestroyedCount++;
                        soundManager.playKillBot();
                        spawnBot();
                    }
                }
            }
        }
    }
    updateHUD();
}

function updateItems(ts: number) {
    const s = gameContainer.state;
    if (!s || s.won || s.isDead) return;

    // Periodic heart spawn (every 20-40s)
    if (ts - s.lastHeartSpawn > 20000 + Math.random() * 20000) {
        spawnHeart();
        s.lastHeartSpawn = ts;
    }

    // Periodic bomb spawn (every 30-50s)
    if (ts - s.lastBombSpawn > 30000 + Math.random() * 20000) {
        spawnBomb();
        s.lastBombSpawn = ts;
    }

    // Periodic powerup spawn (every 40-60s)
    if (ts - s.lastPowerupSpawn > 40000 + Math.random() * 20000) {
        spawnPowerup();
        s.lastPowerupSpawn = ts;
    }

    const DESPAWN_TIME = 20000; // Hearts
    const BOMB_DETONATE_TIME = 30000; // Bombs

    for (let i = s.items.length - 1; i >= 0; i--) {
        const item = s.items[i];
        if (!item.alive) continue;

        const age = ts - item.spawnTime;

        // Collection (Hearts only)
        if (item.type === 'heart') {
            if (s.player.alive && s.player.r === item.r && s.player.c === item.c) {
                item.alive = false;
                if (s.lives < 5) {
                    s.lives++;
                    soundManager.playCollect();
                } else {
                    s.score += 500;
                    soundManager.playCollect();
                }
                updateHUD();
                continue;
            }

            if (age > DESPAWN_TIME) {
                item.alive = false;
            }
        } else if (item.type === 'powerup') {
            // Collection by Player
            if (s.player.alive && s.player.r === item.r && s.player.c === item.c) {
                item.alive = false;
                s.player.powerType = 'penetrating';
                s.player.powerTimer = ts + 15000; // 15 seconds
                soundManager.playCollect();
                setMsg("PENETRATING BULLETS ACTIVE!");
                continue;
            }
            // Collection by Bots
            for (const bot of s.bots) {
                if (bot.alive && bot.r === item.r && bot.c === item.c) {
                    item.alive = false;
                    bot.powerType = 'penetrating';
                    bot.powerTimer = ts + 15000;
                    soundManager.playCollect();
                    break;
                }
            }
            if (age > DESPAWN_TIME) {
                item.alive = false;
            }
        } else if (item.type === 'bomb') {
            // Auto-detonate
            if (age > BOMB_DETONATE_TIME) {
                item.alive = false;
                explodeBomb(item.r, item.c);
            }
        }
    }

    s.items = s.items.filter(i => i.alive);
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

    if (nr >= 0 && nr < s.gridSize && nc >= 0 && nc < s.gridSize && s.grid[nr][nc] === WallType.NONE) {
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

    if (tank.type === 'player') {
        const activeCount = s.bullets.filter(b => b.active && b.owner === 'player').length;
        if (activeCount >= 3) return;

        const now = performance.now();
        if (now - tank.lastAction < 100) return;
        tank.lastAction = now;
    } else {
        const now = performance.now();
        if (now - tank.lastAction < 1000) return;
        tank.lastAction = now;
    }

    soundManager.playShoot();

    s.bullets.push({
        r: tank.r,
        c: tank.c,
        dir: tank.dir,
        owner: tank.type,
        active: true,
        visualX: tank.c,
        visualY: tank.r,
        penetrating: tank.powerType === 'penetrating'
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

        // Hit another bullet (cancel each other)
        for (let j = 0; j < s.bullets.length; j++) {
            const b2 = s.bullets[j];
            if (i !== j && b2.active && b.owner !== b2.owner) {
                const dist = Math.hypot(b.visualX - b2.visualX, b.visualY - b2.visualY);
                if (dist < 0.5) {
                    b.active = false;
                    b2.active = false;
                    spawnExplosion(b.visualY, b.visualX, '#ffffff');
                    break;
                }
            }
        }

        if (!b.active) continue;

        // Hit Item (Bomb)
        const item = s.items.find(it => it.alive && it.r === gr && it.c === gc);
        if (item && item.type === 'bomb') {
            item.alive = false;
            b.active = false;
            explodeBomb(item.r, item.c);
            continue;
        }

        // Out of bounds
        if (gr < 0 || gr >= s.gridSize || gc < 0 || gc >= s.gridSize) {
            b.active = false;
            continue;
        }

        // Hit Wall
        const wall = s.grid[gr][gc];
        if (wall !== WallType.NONE) {
            if (wall === WallType.DESTRUCTIBLE || (b.penetrating && wall === WallType.PERMANENT)) {
                s.grid[gr][gc] = WallType.NONE;
                spawnExplosion(gr, gc, b.penetrating ? '#38bdf8' : '#eab308');
            }
            b.active = false;
            continue;
        }

        // Hit Tank
        if (b.owner === 'bot' && s.player.alive && Math.hypot(b.visualX - s.player.c, b.visualY - s.player.r) < 0.4) {
            s.player.alive = false;
            b.active = false;
            s.lives--;
            soundManager.playKillPlayer();
            spawnExplosion(s.player.r, s.player.c, TANK_COLORS.PLAYER);
            if (s.lives <= 0) {
                s.isDead = true;
                soundManager.stopBGM();
                soundManager.playLose();
                showOverlay("MISSION FAILED", `You destroyed ${s.score / 100} bots, but your tank was lost. Restart the campaign?`, "RETRY");
            } else {
                setTimeout(() => {
                    s.player.alive = true;
                    s.player.r = s.gridSize - 2;
                    s.player.c = Math.floor(s.gridSize / 2);
                }, 1000);
            }
            updateHUD();
        } else if (b.owner === 'player') {
            for (const bot of s.bots) {
                if (bot.alive && Math.hypot(b.visualX - bot.c, b.visualY - bot.r) < 0.4) {
                    bot.alive = false;
                    b.active = false;
                    s.score += 100;
                    s.botsDestroyedCount++;
                    soundManager.playKillBot();
                    spawnExplosion(bot.r, bot.c, TANK_COLORS.BOT);
                    
                    spawnBot();
                    
                    updateHUD();
                    break;
                }
            }
        }
    }

    s.bullets = s.bullets.filter(b => b.active);
    s.bots = s.bots.filter(b => b.alive);

    if (s.botsDestroyedCount >= s.totalBotsToSpawn && !s.won) {
        s.won = true;
        soundManager.stopBGM();
        soundManager.playWin();
        showOverlay("MISSION ACCOMPLISHED", `Level ${s.level} complete. Total bots destroyed: ${s.botsDestroyedCount}. Proceed to the next zone?`, "NEXT LEVEL");
    }
}

function canSeePlayer(bot: Tank, player: Tank, grid: WallType[][]): boolean {
    if (!player.alive) return false;
    if (bot.r === player.r) {
        const start = Math.min(bot.c, player.c);
        const end = Math.max(bot.c, player.c);
        for (let c = start + 1; c < end; c++) {
            if (grid[bot.r][c] !== WallType.NONE) return false;
        }
        return true;
    }
    if (bot.c === player.c) {
        const start = Math.min(bot.r, player.r);
        const end = Math.max(bot.r, player.r);
        for (let r = start + 1; r < end; r++) {
            if (grid[r][bot.c] !== WallType.NONE) return false;
        }
        return true;
    }
    return false;
}

function updateBots(ts: number) {
    const s = gameContainer.state;
    if (!s || s.won || s.isDead) return;

    for (const bot of s.bots) {
        if (!bot.alive) continue;

        const dist = Math.hypot(bot.r - s.player.r, bot.c - s.player.c);
        const now = ts;

        if (now - bot.lastAction > 1000) {
            const hasLOS = canSeePlayer(bot, s.player, s.grid);

            if (hasLOS) {
                // ATTACK MODE: Seen in straight line
                if (bot.r === s.player.r) {
                    const dir = s.player.c > bot.c ? Direction.RIGHT : Direction.LEFT;
                    if (bot.dir !== dir) bot.dir = dir;
                    else shoot(bot);
                } else if (bot.c === s.player.c) {
                    const dir = s.player.r > bot.r ? Direction.DOWN : Direction.UP;
                    if (bot.dir !== dir) bot.dir = dir;
                    else shoot(bot);
                }
            } else if (dist <= 5) {
                // HUNT MODE: Near but not in LOS
                // Determine primary and secondary directions to move towards player
                const dr = s.player.r - bot.r;
                const dc = s.player.c - bot.c;

                const primaryDir = Math.abs(dr) > Math.abs(dc) 
                    ? (dr > 0 ? Direction.DOWN : Direction.UP)
                    : (dc > 0 ? Direction.RIGHT : Direction.LEFT);
                
                const secondaryDir = Math.abs(dr) > Math.abs(dc)
                    ? (dc !== 0 ? (dc > 0 ? Direction.RIGHT : Direction.LEFT) : null)
                    : (dr !== 0 ? (dr > 0 ? Direction.DOWN : Direction.UP) : null);

                const checkBlocked = (dir: Direction) => {
                    const vec = DIR_VECTORS[dir];
                    const nr = bot.r + vec.r;
                    const nc = bot.c + vec.c;
                    if (nr < 0 || nr >= s.gridSize || nc < 0 || nc >= s.gridSize) return WallType.PERMANENT;
                    
                    // Check other tanks as "permanent" obstacles for movement planning
                    const otherTank = s.bots.find(b => b.alive && b !== bot && b.r === nr && b.c === nc) || 
                                     (s.player.alive && s.player.r === nr && s.player.c === nc ? s.player : null);
                    if (otherTank) return WallType.PERMANENT;

                    return s.grid[nr][nc];
                };

                const blockPrimary = checkBlocked(primaryDir);
                if (blockPrimary === WallType.NONE) {
                    tryMove(bot, primaryDir);
                } else if (blockPrimary === WallType.DESTRUCTIBLE) {
                    if (bot.dir !== primaryDir) bot.dir = primaryDir;
                    else shoot(bot);
                } else if (secondaryDir !== null) {
                    const blockSecondary = checkBlocked(secondaryDir);
                    if (blockSecondary === WallType.NONE) {
                        tryMove(bot, secondaryDir);
                    } else if (blockSecondary === WallType.DESTRUCTIBLE) {
                        if (bot.dir !== secondaryDir) bot.dir = secondaryDir;
                        else shoot(bot);
                    } else {
                        // All tactical routes blocked, move randomly
                        tryMove(bot, Math.floor(Math.random() * 4));
                    }
                }
            } else {
                // PATROL MODE: Search blindly
                const rand = Math.random();
                if (rand < 0.1) {
                    // Turn to a random direction
                    bot.dir = Math.floor(Math.random() * 4);
                } else {
                    // Try to move in current direction or random direction
                    const moveDir = rand < 0.6 ? bot.dir : Math.floor(Math.random() * 4);
                    tryMove(bot, moveDir);
                }
            }
            bot.lastAction = now;
        }
    }
}

export function tick(ts: number) {
    const s = gameContainer.state;
    if (s) {
        // Update powerup timers
        if (s.player.powerTimer > 0 && ts > s.player.powerTimer) {
            s.player.powerTimer = 0;
            s.player.powerType = 'none';
            setMsg("POWERUP EXPIRED");
        }
        for (const bot of s.bots) {
            if (bot.powerTimer > 0 && ts > bot.powerTimer) {
                bot.powerTimer = 0;
                bot.powerType = 'none';
            }
        }
    }

    updateBullets(ts);
    updateBots(ts);
    updateItems(ts);
}
