# Audio Management Patterns

Two audio approaches are used in this project. Dark Maze uses a lightweight functional approach; Tank Shot uses a full `SoundManager` class. New games should follow the **class-based approach** for consistency.

---

## 1. The Web Audio API Basics

All procedural sounds use the Web Audio API. The core pattern is:

```
AudioContext → OscillatorNode → GainNode → MasterGainNode → destination
```

```typescript
private ctx: AudioContext | null = null;
private masterGain: GainNode | null = null;

private init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
}
```

> **Safari compatibility**: Always use `(window as any).webkitAudioContext` as a fallback.

---

## 2. The SoundManager Class (Recommended Pattern)

From `tank-shot/sound.ts` — a self-contained class that handles BGM, SFX, and mute states:

```typescript
export class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isMusicMuted: boolean = false;
    private isSFXMuted: boolean = false;
    private bgm: HTMLAudioElement | null = null;

    constructor() {
        this.bgm = new Audio("path/to/bgm.mp3");
        this.bgm.loop = true;
        this.bgm.volume = 0.4;
    }

    // Lazy-init the AudioContext (must happen after user interaction)
    private init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.updateVolume();
    }

    private updateVolume() {
        if (this.masterGain) this.masterGain.gain.value = this.isSFXMuted ? 0 : 0.6;
        if (this.bgm) this.bgm.muted = this.isMusicMuted;
    }

    toggleMusicMute(): boolean { this.isMusicMuted = !this.isMusicMuted; this.updateVolume(); return this.isMusicMuted; }
    toggleSFXMute(): boolean { this.isSFXMuted = !this.isSFXMuted; this.updateVolume(); return this.isSFXMuted; }

    playBGM() { this.bgm?.play().catch(() => {}); }
    stopBGM() { if (this.bgm) { this.bgm.pause(); this.bgm.currentTime = 0; } }

    // SFX methods below...
}

// Singleton export
export const soundManager = new SoundManager();
```

---

## 3. Synthesized SFX Recipes

All SFX are generated procedurally — no audio file downloads required. Here is the complete recipe book:

### Shoot (Triangle wave, pitch drop)
```typescript
playShoot() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isSFXMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.15);
}
```

### Explosion (White noise + low-pass filter)
```typescript
playExplosion() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isSFXMuted) return;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    noise.start();
}
```

### Large Explosion (Multi-layered noise)
Stacks 3 noise layers with staggered timing for a "rumbling boom":
```typescript
playLargeExplosion() {
    for (let j = 0; j < 3; j++) {
        // Each layer: longer duration, lower filter cutoff, slight delay
        const bufferSize = this.ctx.sampleRate * (0.6 + j * 0.2);
        // ... same noise pattern but with:
        filter.frequency.setValueAtTime(1500 - j * 400, now);
        noise.start(now + j * 0.05);  // Staggered start
    }
}
```

### Kill Bot (Sine pitch-drop + explosion)
```typescript
playKillBot() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
    // ... then immediately call this.playExplosion()
}
```

### Kill Player (Sawtooth low rumble + double explosion)
```typescript
playKillPlayer() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.8);
    // ... then:
    this.playExplosion();
    setTimeout(() => this.playExplosion(), 100);  // Double-hit effect
}
```

### Collect Item (Sine pitch-rise arpeggio)
```typescript
playCollect() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
    // Short, cheerful ascending tone
}
```

### Win Fanfare (Ascending note sequence: C5-E5-G5-C6-E6)
```typescript
playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        osc.frequency.value = freq;
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
    });
}
```

### Lose Jingle (Descending sawtooth: A4-F4-D4-C4)
```typescript
playLose() {
    const notes = [440, 349.23, 293.66, 261.63];
    notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.5);
    });
}
```

### Movement (Dark Maze — subtle triangle blip)
```typescript
playSound("move") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    gain.gain.setValueAtTime(0.05, now);  // Very quiet
}
```

### Damage (Sawtooth descending buzz)
```typescript
playSound("damage") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
}
```

---

## 4. SFX Design Cheat Sheet

| Sound Effect       | Wave Type  | Frequency Range | Duration | Character               |
|---------------------|-----------|-----------------|----------|--------------------------|
| Shoot               | triangle  | 600 → 100 Hz    | 0.15s    | Quick pew                |
| Explosion           | noise     | 1000 → 100 Hz   | 0.4s     | Low rumble               |
| Large Explosion     | noise ×3  | 1500 → 50 Hz    | 1.0s     | Deep layered boom        |
| Kill Bot            | sine      | 1200 → 400 Hz   | 0.2s     | Satisfying zap           |
| Kill Player         | sawtooth  | 200 → 40 Hz     | 0.8s     | Ominous death            |
| Collect Item        | sine      | 400 → 1200 Hz   | 0.2s     | Cheerful pickup          |
| Win Fanfare         | sine ×5   | C5–E6 arpeggio   | 0.9s     | Triumphant melody        |
| Lose Jingle         | sawtooth ×4| A4–C4 descent   | 1.2s     | Somber descending        |
| Movement            | triangle  | 150 → 40 Hz     | 0.1s     | Subtle footstep          |
| Damage              | sawtooth  | 200 → 50 Hz     | 0.3s     | Warning buzz             |

---

## 5. Interaction-Locked Audio

Browsers block audio until the first user gesture. Always trigger audio inside a click handler:

```typescript
document.getElementById('ov-btn').addEventListener('click', () => {
    soundManager.playBGM();  // First user gesture unlocks audio
    startGame();
});
```

The `SoundManager.init()` is called lazily inside each `play*()` method, so it auto-initializes on first use.

---

## 6. Mute Controls

Every game **must** provide separate controls for Music and SFX muting to give players full control over the audio experience.

```typescript
// Wiring in main.ts
document.getElementById("btn-mute-music")?.addEventListener("click", (e) => {
    const muted = soundManager.toggleMusicMute();
    (e.currentTarget as HTMLButtonElement).classList.toggle("muted", muted);
});

document.getElementById("btn-mute-sfx")?.addEventListener("click", (e) => {
    const muted = soundManager.toggleSFXMute();
    (e.currentTarget as HTMLButtonElement).classList.toggle("muted", muted);
});
```

---

## 7. BGM Best Practices

- **Volume**: Set to `0.3–0.4` to not overpower SFX.
- **Loop**: Always `bgm.loop = true`.
- **Stop on game over**: Call `bgm.pause(); bgm.currentTime = 0;` to reset.
- **Resume on replay**: Call `bgm.play()` when the game restarts.
- **Error handling**: Always `.catch(() => {})` on `.play()` to silence autoplay rejection errors.
