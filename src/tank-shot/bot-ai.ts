import { state as gameContainer, Tank } from './state.js';
import { Direction, DIR_VECTORS, WallType } from './constants.js';
import { tryMove, shoot } from './game.js';

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

export function updateBots(ts: number) {
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
