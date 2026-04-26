# Tank Shot

A dark, intense tactical tank combat game built for the Mini Game Board.

## Overview
Command your tank through increasingly difficult levels. Destroy enemy bots while managing your health and utilizing tactical power-ups.

## Key Features
- **Tactical Bot AI**: Enemy tanks have unique classes:
  - **Scouts**: Fast movement, prefers flanking detours.
  - **Heavies**: Slow but relentless, blasts through any wall.
  - **Tacticians**: High intelligence, triggers bombs near the player and denies power-ups.
- **Power-ups & Items**:
  - ⚡ **Penetrating Bullets**: Allows destroying even permanent steel walls for 15 seconds.
  - ❤️ **Hearts**: Increase your lives up to a maximum of 5.
  - 💣 **Bombs**: Explode in a 3x3 radius, clearing everything in their path.
- **Advanced Visuals**:
  - Procedural "Force Shield" with hexagonal grid and energy shimmer.
  - Dynamic camera shake and particle explosions.
  - Dark industrial aesthetic with a moody color palette.
- **Intense Audio**: Featuring "Mechanolith" by Kevin MacLeod for a high-energy action atmosphere.

## Controls
### 💻 Desktop
- **Arrow Keys / WASD**:
  - Press once to rotate the tank.
  - Press again in the same direction to move.
- **Space**: Fire cannon.

### 📱 Mobile
- **Virtual Joystick**: Drag to rotate and move.
- **Fire Button**: Tap to fire.

## Game Mechanics
- **Spawn Protection**: You are invulnerable for the first 5 seconds of every level or after being reborn. An energy shield will indicate your guarding state.
- **Wall Types**: 
  - 🧱 **Destructible**: Can be destroyed by any bullet.
  - 🟩 **Permanent**: Can ONLY be destroyed by penetrating bullets or bomb blasts.
- **Bot Strategy**: Bots will try to block hearts from you and will tactically use bombs if you are within range.

## Development
This module is located in `src/tank-shot/` and is compiled using the main project's build system (`npm run build`).
