import { state as gameContainer, Tank, Item } from './state.js';
import { Direction, DIR_VECTORS, WallType } from './constants.js';
import { tryMove, shoot } from './game.js';

function canSeeTarget(bot: Tank, tr: number, tc: number, grid: WallType[][], ignoreDestructible: boolean = false): boolean {
    if (bot.r === tr) {
        const start = Math.min(bot.c, tc);
        const end = Math.max(bot.c, tc);
        for (let c = start + 1; c < end; c++) {
            const wall = grid[bot.r][c];
            if (wall === WallType.PERMANENT) return false;
            if (!ignoreDestructible && wall === WallType.DESTRUCTIBLE) return false;
        }
        return true;
    }
    if (bot.c === tc) {
        const start = Math.min(bot.r, tr);
        const end = Math.max(bot.r, tr);
        for (let r = start + 1; r < end; r++) {
            const wall = grid[r][bot.c];
            if (wall === WallType.PERMANENT) return false;
            if (!ignoreDestructible && wall === WallType.DESTRUCTIBLE) return false;
        }
        return true;
    }
    return false;
}

function getMoveDir(bot: Tank, tr: number, tc: number): { primary: Direction, secondary: Direction | null } {
    const dr = tr - bot.r;
    const dc = tc - bot.c;

    const primary = Math.abs(dr) > Math.abs(dc) 
        ? (dr > 0 ? Direction.DOWN : Direction.UP)
        : (dc > 0 ? Direction.RIGHT : Direction.LEFT);
    
    const secondary = Math.abs(dr) > Math.abs(dc)
        ? (dc !== 0 ? (dc > 0 ? Direction.RIGHT : Direction.LEFT) : null)
        : (dr !== 0 ? (dr > 0 ? Direction.DOWN : Direction.UP) : null);

    return { primary, secondary };
}

export function updateBots(ts: number) {
    const s = gameContainer.state;
    if (!s || s.won || s.isDead) return;

    for (const bot of s.bots) {
        if (!bot.alive) continue;

        const now = ts;
        
        // Class-specific action delays
        let actionDelay = 600; 
        if (bot.botClass === 'scout') actionDelay = 400;
        else if (bot.botClass === 'heavy') actionDelay = 800;
        
        if (bot.powerType !== 'none') actionDelay *= 0.7;

        if (now - bot.lastAction > actionDelay) {
            const distToPlayer = Math.hypot(bot.r - s.player.r, bot.c - s.player.c);
            
            // 1. Target Selection based on Class
            let targetR = s.player.r;
            let targetC = s.player.c;
            let isTargetingPlayer = true;

            // Heart Protection Logic: Bots block hearts if player is nearby
            const hearts = s.items.filter(i => i.alive && i.type === 'heart');
            const threatenedHeart = hearts.find(h => Math.hypot(h.r - s.player.r, h.c - s.player.c) < 5);

            if (threatenedHeart && (bot.botClass === 'tactician' || bot.botClass === 'heavy' || Math.random() < 0.4)) {
                // Move to the heart to block it
                targetR = threatenedHeart.r;
                targetC = threatenedHeart.c;
                isTargetingPlayer = false;
            } else if (bot.botClass !== 'heavy') {
                // Scouts and Tacticians look for powerups to collect
                const nearbyPowerup = s.items
                    .filter(i => i.alive && i.type === 'powerup')
                    .map(i => ({ item: i, dist: Math.hypot(bot.r - i.r, bot.c - i.c) }))
                    .filter(d => d.dist < (bot.botClass === 'scout' ? 12 : 8))
                    .sort((a, b) => a.dist - b.dist)[0]?.item;

                if (nearbyPowerup) {
                    targetR = nearbyPowerup.r;
                    targetC = nearbyPowerup.c;
                    isTargetingPlayer = false;
                }
            }

            // Tacticians prioritize bombs
            if (bot.botClass === 'tactician' || (bot.botClass === 'scout' && Math.random() < 0.3)) {
                const nearbyBomb = s.items
                    .find(i => i.alive && i.type === 'bomb' && 
                               Math.hypot(i.r - s.player.r, i.c - s.player.c) <= 1.8 && 
                               Math.hypot(i.r - bot.r, i.c - bot.c) > 2);

                if (nearbyBomb && canSeeTarget(bot, nearbyBomb.r, nearbyBomb.c, s.grid)) {
                    targetR = nearbyBomb.r;
                    targetC = nearbyBomb.c;
                    isTargetingPlayer = false;
                }
            }

            const hasLOS = canSeeTarget(bot, targetR, targetC, s.grid);
            const hasLOSThroughWalls = (bot.powerType === 'penetrating' || bot.botClass === 'heavy') && 
                                       canSeeTarget(bot, targetR, targetC, s.grid, true);

            if (hasLOS || (hasLOSThroughWalls && isTargetingPlayer)) {
                // ATTACK/TRIGGER MODE
                if (bot.r === targetR) {
                    const dir = targetC > bot.c ? Direction.RIGHT : Direction.LEFT;
                    if (bot.dir !== dir) bot.dir = dir;
                    else shoot(bot);
                } else if (bot.c === targetC) {
                    const dir = targetR > bot.r ? Direction.DOWN : Direction.UP;
                    if (bot.dir !== dir) bot.dir = dir;
                    else shoot(bot);
                }
            } else {
                // HUNT/MOVE MODE
                const { primary, secondary } = getMoveDir(bot, targetR, targetC);

                const checkBlocked = (dir: Direction) => {
                    const vec = DIR_VECTORS[dir];
                    const nr = bot.r + vec.r;
                    const nc = bot.c + vec.c;
                    if (nr < 0 || nr >= s.gridSize || nc < 0 || nc >= s.gridSize) return WallType.PERMANENT;
                    
                    const otherTank = s.bots.find(b => b.alive && b !== bot && b.r === nr && b.c === nc) || 
                                     (s.player.alive && s.player.r === nr && s.player.c === nc ? s.player : null);
                    if (otherTank) return WallType.PERMANENT;

                    return s.grid[nr][nc];
                };

                const tryTacticalMove = (dir: Direction) => {
                    const block = checkBlocked(dir);
                    if (block === WallType.NONE) {
                        tryMove(bot, dir);
                        return true;
                    } else if (block === WallType.DESTRUCTIBLE) {
                        // Heavies always blast through destructibles
                        if (bot.botClass === 'heavy' || Math.random() < 0.6) {
                            if (bot.dir !== dir) bot.dir = dir;
                            else shoot(bot);
                            return true;
                        }
                    }
                    return false;
                };

                // Movement Logic: Scouts prefer secondary paths if primary is blocked (avoiding direct fire)
                if (bot.botClass === 'scout' && secondary !== null && Math.random() < 0.4) {
                    if (!tryTacticalMove(secondary)) tryTacticalMove(primary);
                } else {
                    if (!tryTacticalMove(primary)) {
                        if (secondary === null || !tryTacticalMove(secondary)) {
                            // Stuck or no clear tactical move
                            if (bot.botClass === 'heavy' || Math.random() < 0.3) {
                                shoot(bot);
                            } else {
                                tryMove(bot, Math.floor(Math.random() * 4));
                            }
                        }
                    }
                }
            }
            bot.lastAction = now;
        }
    }
}

