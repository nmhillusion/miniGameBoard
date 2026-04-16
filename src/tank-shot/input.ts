import { state as gameContainer } from './state.js';
import { Direction } from './constants.js';
import { tryMove, shoot } from './game.js';

export function initInputs() {
    window.addEventListener("keydown", (e) => {
        const s = gameContainer.state;
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

    // Simple touch handlers could go here similar to dark-maze, 
    // but we'll stick to keyboard for the initial implementation.
}
