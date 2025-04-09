// Sound effects configuration
const SOUND_EFFECTS = {
    GAME_START: {
        url: 'sounds/game-start.mp3',
        volume: 0.7
    },
    GAME_END: {
        url: 'sounds/game-end.mp3',
        volume: 0.7
    },
    PITCH_START: {
        url: 'sounds/pitch-start.mp3',
        volume: 0.5
    },
    PITCH_SUCCESS: {
        url: 'sounds/success.mp3',
        volume: 0.6
    },
    PITCH_FAIL: {
        url: 'sounds/fail.mp3',
        volume: 0.6
    },
    POWER_UP: {
        url: 'sounds/power-up.mp3',
        volume: 0.5
    },
    COMBO: {
        url: 'sounds/combo.mp3',
        volume: 0.4
    },
    ACHIEVEMENT: {
        url: 'sounds/achievement.mp3',
        volume: 0.6
    },
    CLICK: {
        url: 'sounds/click.mp3',
        volume: 0.3
    },
    BOREDOM_WARNING: {
        url: 'sounds/warning.mp3',
        volume: 0.4
    }
};

class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.isMuted = false;
        this.loadSounds();
    }

    loadSounds() {
        Object.entries(SOUND_EFFECTS).forEach(([key, config]) => {
            const audio = new Audio(config.url);
            audio.volume = config.volume;
            this.sounds.set(key, audio);
        });
    }

    play(soundKey) {
        if (this.isMuted) return;
        
        const sound = this.sounds.get(soundKey);
        if (sound) {
            // Clone the audio to allow overlapping sounds
            const soundClone = sound.cloneNode();
            soundClone.volume = sound.volume;
            soundClone.play().catch(error => {
                console.warn(`Failed to play sound ${soundKey}:`, error);
            });
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    setVolume(volume) {
        this.sounds.forEach(sound => {
            sound.volume = Math.max(0, Math.min(1, volume));
        });
    }
}

// Create and export a singleton instance
const soundManager = new SoundManager();
export default soundManager; 