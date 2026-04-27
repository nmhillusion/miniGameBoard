# UI & Styling Patterns

Design system and UI patterns for consistent, premium-feeling game interfaces. Extracted from the landing page (`index.scss`) and both game UIs.

---

## 1. Design System: Color Palette

All games use a **dark mode** palette anchored by Tailwind CSS color values:

```scss
// Core palette (used across all games)
$bg-primary:      #020617;    // slate-950 — deepest background
$bg-secondary:    #0a0a0f;    // Near-black — canvas background
$bg-card:         rgba(30, 41, 59, 0.7);  // slate-800 at 70% — glassmorphism cards
$border-subtle:   rgba(51, 65, 85, 0.5);  // slate-700 at 50% — soft borders
$accent:          #38bdf8;    // sky-400 — primary accent
$accent-glow:     rgba(56, 189, 248, 0.3);
$text-primary:    #f8fafc;    // slate-50
$text-secondary:  #94a3b8;    // slate-400

// Game-specific accents
$color-player:    #38bdf8;    // Sky blue
$color-bot:       #ff6060;    // Red
$color-scout:     #4ade80;    // Green
$color-heavy:     #a855f7;    // Purple
$color-tactician: #fb923c;    // Orange
```

---

## 2. Typography

```scss
// Landing page: Modern sans-serif
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
body { font-family: 'Outfit', system-ui, -apple-system, sans-serif; }

// Dark Maze: Monospace for retro feel
#game-root { font-family: var(--font-mono, monospace); }

// Tank Shot: Clean sans-serif
body { font-family: 'Outfit', 'Segoe UI', Tahoma, sans-serif; }
```

---

## 3. The HUD (Head-Up Display)

Both games use a flexbox HUD bar with label/value pairs:

### HTML Structure (Pug)
```pug
#hud
  .hud-item
    span.hud-label Level
    span.hud-val#h-level 1
  .hud-item
    span.hud-label Lives
    span.hud-val#h-lives ❤️❤️❤️🖤🖤
  .hud-item
    span.hud-label Score
    span.hud-val#h-score 0
```

### CSS
```scss
#hud {
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(10px);
  width: 100%;
  justify-content: center;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
  z-index: 10;

  .hud-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .hud-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }

    .hud-val {
      font-size: 1.25rem;
      font-weight: bold;
      color: #38bdf8;
    }
  }
}
```

### JavaScript Update Pattern
```typescript
export function updateHUD() {
    const el = (id: string) => document.getElementById(id);
    el("h-level")!.textContent = String(state.level);
    el("h-lives")!.textContent = "❤️".repeat(state.lives) + "🖤".repeat(5 - state.lives);
    el("h-score")!.textContent = String(state.score);
}
```

---

## 4. The Overlay System

### HTML Structure
```pug
#overlay
  h2#ov-title 🚀 TANK SHOT
  p#ov-desc Press direction keys to move. [Space] to shoot.
  button.ov-btn#ov-btn START MISSION
```

### CSS (Tank Shot — Premium Style)
```scss
#overlay {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.95);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  text-align: center;
  z-index: 50;
  backdrop-filter: blur(5px);

  h2 {
    color: #38bdf8;
    font-size: clamp(2rem, 8vw, 4rem);     // Responsive text
    text-shadow: 0 0 20px rgba(56, 189, 248, 0.5);
    font-weight: 800;
  }

  p {
    max-width: 500px;
    line-height: 1.6;
    color: #94a3b8;
    font-size: clamp(0.875rem, 3vw, 1.125rem);
  }

  .ov-btn {
    background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
    color: #020617;
    padding: 0.875rem 2.5rem;
    font-size: 1.25rem;
    font-weight: bold;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);

    &:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(56, 189, 248, 0.4); }
    &:active { transform: scale(0.95); }
  }
}
```

---

## 5. Top Bar (Navigation Buttons)

Every game **must** include a top bar with exactly 3 buttons for a consistent user experience:

```pug
#top-bar
  button#btn-home(title="Home") 🏠
  button#btn-mute-music(title="Mute Music") 🎵
  button#btn-mute-sfx(title="Mute SFX") 🔫
```

```scss
#top-bar {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  gap: 0.5rem;
  z-index: 100;

  button {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #334155;
    color: white;
    padding: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 1.2rem;
    transition: background 0.2s, opacity 0.2s;
    -webkit-tap-highlight-color: transparent;

    &:hover { background: #334155; }
    &:active { transform: scale(0.9); }
    &.muted { opacity: 0.5; }
  }
}
```

---

## 6. Message Bar

Transient messages displayed at the bottom of the screen:

### Dark Maze Style (Always visible, plain text)
```scss
#msg-bar {
  position: absolute;
  bottom: 8px;
  left: 0; right: 0;
  text-align: center;
  font-size: 12px;
  color: #888;
  pointer-events: none;
}
.alert { color: #ff8060; }
```

### Tank Shot Style (Pill-shaped, fade in/out)
```scss
#msg-bar {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 41, 59, 0.9);
  padding: 0.75rem 1.5rem;
  border-radius: 2rem;
  border: 1px solid #38bdf8;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;

  &.visible { opacity: 1; }
}
```

---

## 7. Landing Page: Game Cards

The game selection page uses **glassmorphism** cards:

```scss
.game-card {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  padding: 2rem;
  border-radius: 1.5rem;
  border: 1px solid rgba(51, 65, 85, 0.5);
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  cursor: pointer;
  overflow: hidden;

  // Subtle top gradient overlay
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%);
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: #38bdf8;
    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5), 0 0 20px 0 rgba(56,189,248,0.3);
  }
}
```

---

## 8. Gradient Text

The landing page title uses a gradient text effect:

```scss
h1 {
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 4px 12px rgba(56, 189, 248, 0.2));
}
```

---

## 9. Mobile Responsiveness

### Breakpoints Used
```scss
@media (max-width: 480px)  { /* Very small phones */ }
@media (max-width: 600px)  { /* Phones */ }
@media (max-width: 768px)  { /* Tablets */ }
@media (min-width: 1024px) { /* Desktop */ }
```

### Key Responsive Patterns
- **Grid density**: `gridSize = w > 1024 ? 21 : (w > 600 ? 15 : 10)`
- **Font clamping**: `font-size: clamp(0.875rem, 3vw, 1.125rem)`
- **Min sizing**: `width: min(120px, 30vw)` for joystick
- **Safe areas**: `padding-bottom: max(2.5rem, env(safe-area-inset-bottom))` for phones with notches
- **Dynamic viewport height**: `height: 100dvh` (falls back to `100vh`)

---

## 10. Essential Resets

Every game page includes:

```scss
* { box-sizing: border-box; margin: 0; padding: 0; }
body { margin: 0; overflow: hidden; touch-action: none; }
canvas { display: block; touch-action: none; cursor: pointer; }
```

---

## 11. Favicon Pattern

Each game uses an emoji favicon via inline SVG:

```pug
link(rel="icon", href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎮</text></svg>")
```

Just change the emoji per game: `🌑` for Dark Maze, `🚀` for Tank Shot, etc.

---

## 12. Pug Template Skeleton

Standard template for a new game page:

```pug
doctype html
html(lang="en")
  head
    meta(charset="UTF-8")
    meta(name="viewport", content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no")
    meta(name="description", content="Game description for SEO")
    title Game Name | Mini Game Board
    link(rel="icon", href="data:image/svg+xml,<svg ...>🎯</svg>")
    link(rel="stylesheet", href="/<game-name>/style.css")
  body
    #game-root
      #top-bar
        button#btn-home(title="Home") 🏠
        button#btn-mute-music(title="Mute Music") 🎵
        button#btn-mute-sfx(title="Mute SFX") 🔫
      #hud
        .hud-item
          span.hud-label Level
          span.hud-val#h-level 1
        //- ... more HUD items
      #canvas-wrap
        canvas#gc
        #overlay
          h2#ov-title 🎯 GAME NAME
          p#ov-desc Game instructions here.
          button.ov-btn#ov-btn START
      #msg-bar
    script(type="module", src="/<game-name>/main.js")
```
