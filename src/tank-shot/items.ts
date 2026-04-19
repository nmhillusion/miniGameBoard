import { state as gameContainer } from './state.js';
import { WallType, TANK_COLORS } from './constants.js';
import { soundManager } from './sound.js';
import { setMsg, updateHUD, spawnExplosion, spawnBot } from './game.js';
import { showOverlay } from './renderer.js';

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

export function updateItems(ts: number) {
    const s = gameContainer.state;
    if (!s || s.won || s.isDead) return;

    const hasHeart = s.items.some(i => i.alive && i.type === 'heart');
    if (hasHeart) {
        s.lastHeartSpawn = ts;
    } else if (ts - s.lastHeartSpawn > 20000 + Math.random() * 20000) {
        spawnHeart();
        s.lastHeartSpawn = ts;
    }

    const hasBomb = s.items.some(i => i.alive && i.type === 'bomb');
    if (hasBomb) {
        s.lastBombSpawn = ts;
    } else if (ts - s.lastBombSpawn > 30000 + Math.random() * 20000) {
        spawnBomb();
        s.lastBombSpawn = ts;
    }

    const hasPowerup = s.items.some(i => i.alive && i.type === 'powerup');
    if (hasPowerup) {
        s.lastPowerupSpawn = ts;
    } else if (ts - s.lastPowerupSpawn > 40000 + Math.random() * 20000) {
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
