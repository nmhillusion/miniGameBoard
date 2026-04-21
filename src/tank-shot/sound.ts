export class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isMusicMuted: boolean = false;
    private isSFXMuted: boolean = false;
    private bgm: HTMLAudioElement | null = null;

    constructor() {
        this.bgm = new Audio("https://upload.wikimedia.org/wikipedia/commons/5/51/8bit_Dungeon_Boss_%28ISRC_USUAN1200067%29.mp3");
        this.bgm.loop = true;
        this.bgm.volume = 0.4;
    }

    private init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.updateVolume();
    }

    private updateVolume() {
        if (this.masterGain) {
            this.masterGain.gain.value = this.isSFXMuted ? 0 : 0.6;
        }
        if (this.bgm) {
            this.bgm.muted = this.isMusicMuted;
        }
    }

    toggleMusicMute(): boolean {
        this.isMusicMuted = !this.isMusicMuted;
        this.updateVolume();
        return this.isMusicMuted;
    }

    toggleSFXMute(): boolean {
        this.isSFXMuted = !this.isSFXMuted;
        this.updateVolume();
        return this.isSFXMuted;
    }

    playBGM() {
        if (this.bgm) {
            this.bgm.play().catch(e => console.log("BGM play failed, waiting for interaction"));
        }
    }

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }
    }

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

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playExplosion() {
        this.init();
        if (!this.ctx || !this.masterGain || this.isSFXMuted) return;

        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
    }

    playLargeExplosion() {
        this.init();
        if (!this.ctx || !this.masterGain || this.isSFXMuted) return;

        // Multiple noise layers for a bigger boom
        for (let j = 0; j < 3; j++) {
            const bufferSize = this.ctx.sampleRate * (0.6 + j * 0.2);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1500 - j * 400, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5 + j * 0.2);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6 + j * 0.2);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            noise.start(this.ctx.currentTime + j * 0.05);
        }
    }

    playKillBot() {
        this.init();
        if (!this.ctx || !this.masterGain || this.isSFXMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(now + 0.2);

        this.playExplosion();
    }

    playKillPlayer() {
        this.init();
        if (!this.ctx || !this.masterGain || this.isSFXMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.8);

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(now + 0.8);

        this.playExplosion();
        setTimeout(() => this.playExplosion(), 100);
    }

    playCollect() {
        this.init();
        if (!this.ctx || !this.masterGain || this.isSFXMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(now + 0.2);
    }

    playWin() {
        this.init();
        if (!this.ctx || !this.masterGain || this.isSFXMuted) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.4);
        });
    }

    playLose() {
        this.init();
        if (!this.ctx || !this.masterGain || this.isSFXMuted) return;

        const now = this.ctx.currentTime;
        const notes = [440, 349.23, 293.66, 261.63];
        notes.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, now + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.5);
            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.5);
        });
    }

}

export const soundManager = new SoundManager();
