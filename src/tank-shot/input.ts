import { state as gameContainer } from './state.js';
import { Direction } from './constants.js';
import { tryMove, shoot } from './game.js';

export function initInputs(onOverlayAction: () => void) {
    // Keyboard
    window.addEventListener("keydown", (e) => {
        const s = gameContainer.state;

        if (e.key === "Enter") {
            if (!s || s.won || s.isDead) {
                onOverlayAction();
                return;
            }
        }

        if (!s || s.isDead || s.won || !s.player.alive) return;

        switch (e.key) {
            case "ArrowUp":
            case "w":
            case "W":
                tryMove(s.player, Direction.UP);
                break;
            case "ArrowDown":
            case "s":
            case "S":
                tryMove(s.player, Direction.DOWN);
                break;
            case "ArrowLeft":
            case "a":
            case "A":
                tryMove(s.player, Direction.LEFT);
                break;
            case "ArrowRight":
            case "d":
            case "D":
                tryMove(s.player, Direction.RIGHT);
                break;
            case " ":
                shoot(s.player);
                break;
        }
    });

    // Virtual Joystick
    initJoystick();

    // Fire Button
    const btnFire = document.getElementById("btn-fire");
    if (btnFire) {
        btnFire.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const s = gameContainer.state;
            if (s && s.player.alive && !s.won && !s.isDead) {
                shoot(s.player);
            }
        });
        btnFire.addEventListener("mousedown", (e) => {
            const s = gameContainer.state;
            if (s && s.player.alive && !s.won && !s.isDead) {
                shoot(s.player);
            }
        });
    }
}

function initJoystick() {
    const base = document.getElementById("joystick-base");
    const thumb = document.getElementById("joystick-thumb");
    if (!base || !thumb) return;

    let active = false;
    let startX = 0;
    let startY = 0;
    let moveInterval: number | null = null;
    let currentDir: Direction | null = null;

    const handleStart = (x: number, y: number) => {
        const s = gameContainer.state;
        if (!s || s.won || s.isDead || !s.player.alive) return;
        
        active = true;
        startX = x;
        startY = y;
        thumb.style.transition = "none";
    };

    const handleMove = (x: number, y: number) => {
        if (!active) return;
        const s = gameContainer.state;
        if (!s) return;

        const dx = x - startX;
        const dy = y - startY;
        const dist = Math.hypot(dx, dy);
        const maxDist = 40;
        const ratio = Math.min(1, dist / maxDist);
        const angle = Math.atan2(dy, dx);

        const tx = Math.cos(angle) * ratio * maxDist;
        const ty = Math.sin(angle) * ratio * maxDist;

        thumb.style.transform = `translate(${tx}px, ${ty}px)`;

        if (dist > 20) {
            let dir = Direction.UP;
            const deg = angle * 180 / Math.PI;
            if (deg > -45 && deg <= 45) dir = Direction.RIGHT;
            else if (deg > 45 && deg <= 135) dir = Direction.DOWN;
            else if (deg > 135 || deg <= -135) dir = Direction.LEFT;
            else dir = Direction.UP;

            if (currentDir !== dir) {
                currentDir = dir;
                tryMove(s.player, dir); // First rotation
                
                if (moveInterval) clearInterval(moveInterval);
                moveInterval = window.setInterval(() => {
                    if (active && currentDir !== null) {
                        tryMove(s.player, currentDir);
                    }
                }, 200);
            }
        } else {
            currentDir = null;
            if (moveInterval) {
                clearInterval(moveInterval);
                moveInterval = null;
            }
        }
    };

    const handleEnd = () => {
        active = false;
        thumb.style.transition = "transform 0.2s";
        thumb.style.transform = `translate(0, 0)`;
        currentDir = null;
        if (moveInterval) {
            clearInterval(moveInterval);
            moveInterval = null;
        }
    };

    base.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const t = e.touches[0];
        handleStart(t.clientX, t.clientY);
    });
    window.addEventListener("touchmove", (e) => {
        if (!active) return;
        const t = e.touches[0];
        handleMove(t.clientX, t.clientY);
    });
    window.addEventListener("touchend", handleEnd);

    base.addEventListener("mousedown", (e) => {
        handleStart(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", (e) => {
        handleMove(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", handleEnd);
}
