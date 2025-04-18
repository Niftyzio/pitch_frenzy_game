import soundManager from './sound-manager.js';
import { calculatePitchScore } from '../analysis/pitch-analysis.js';
import { initializeSpeechRecognition, startSpeechRecognition, stopSpeechRecognition } from './speech.js';

// Game Configuration Constants
const GAME_DURATION_SECONDS = 180;  // 3 minutes total game time
const PITCH_DURATION_SECONDS = 30;  // 30 seconds per pitch
const MAX_INVESTORS = 12;
const INVESTOR_SPAWN_INTERVAL_MS = 4000;
const VOICE_LISTEN_DURATION_MS = 10000;

// Power-up configuration
const POWER_UPS = {
    TIME_FREEZE: {
        name: "⏰ Time Freeze",
        duration: 5000,
        effect: "freezeBoredom",
        rarity: 0.2
    },
    DOUBLE_POINTS: {
        name: "✨ Double Points",
        duration: 8000,
        effect: "doubleScore",
        rarity: 0.15
    },
    BOREDOM_RESET: {
        name: "🔄 Reset Boredom",
        effect: "resetBoredom",
        rarity: 0.25
    }
};

// Special investor types
const INVESTOR_TYPES = {
    NORMAL: {
        face: "🧐",
        boredomRate: 1.0,
        scoreMultiplier: 1.0,
        rarity: 0.7
    },
    VENTURE_CAPITALIST: {
        face: "💼",
        boredomRate: 0.8,
        scoreMultiplier: 1.5,
        rarity: 0.15
    },
    ANGEL_INVESTOR: {
        face: "👼",
        boredomRate: 0.7,
        scoreMultiplier: 2.0,
        rarity: 0.1
    },
    SHARK: {
        face: "🦈",
        boredomRate: 1.3,
        scoreMultiplier: 1.8,
        rarity: 0.05
    }
};

// Boredom configuration
const BOREDOM_CONFIG = {
    BASE_INCREMENT: 0.02,          // Significantly reduced base increment
    SILENCE_PENALTY: 0.1,          // Reduced silence penalty
    FILLER_PENALTY: 0.08,         // Reduced filler word penalty
    GOOD_CONTENT_BONUS: 0.15,     // Significantly increased bonus for good content
    INITIAL_GRACE_PERIOD_MS: 4000, // 4 second grace period at start
    MAX_BOREDOM_RATE: 0.25,       // Much lower cap on maximum boredom rate
    RECOVERY_CHANCE: 0.3,         // 30% chance to recover attention
    RECOVERY_AMOUNT: 0.15,        // Increased recovery amount
    CONTENT_THRESHOLD: 2         // Number of business terms needed to trigger recovery
};

// Game state
let isGameRunning = false;
let gameTimeLeft = GAME_DURATION_SECONDS;
let score = 0;
let currentPitch = null;
let isPaused = false;
let investors = [];
let gameIntervalId = null;
let investorSpawnIntervalId = null;
let isListening = false;
let rulesShown = false;
let activePowerUps = new Set();
let recognition = null;

export function startGame() {
    if (isGameRunning) return;
    
    if (!rulesShown) {
        showRulesModal();
        rulesShown = true;
        return;
    }
    
    // Initialize speech recognition
    recognition = initializeSpeechRecognition();
    if (!recognition) {
        showMessage("Speech recognition not available. Please use a supported browser.", true);
        return;
    }
    
    // Reset game state
    resetGame();
    soundManager.play('GAME_START');
    
    // Start game systems
    startGameTimer();
    spawnInitialInvestors();
    startInvestorSpawning();
}

export function togglePause() {
    if (!isGameRunning) return;
    
    isPaused = !isPaused;
    console.log("Game paused:", isPaused);
    
    if (isPaused) {
        pauseGame();
    } else {
        resumeGame();
    }
}

export function endGame() {
    stopAllSystems();
    updateGameState(false);
    showGameSummary();
    soundManager.play('GAME_END');
}

function startGameTimer() {
    gameIntervalId = setInterval(() => {
        if (!isPaused) {
            gameTimeLeft--;
            updateGameTimerDisplay();
            if (gameTimeLeft <= 0) endGame();
        }
    }, 1000);
}

function pauseGame() {
    stopRecognition();
    clearIntervals();
    pauseInvestors();
    updatePauseUI(true);
}

function resumeGame() {
    if (gameTimeLeft > 0) {
        startGameTimer();
        startInvestorSpawning();
        resumeInvestors();
        updatePauseUI(false);
    } else {
        isPaused = true;
        showMessage('Cannot resume, time is up!', true);
    }
}

function stopAllSystems() {
    stopRecognition();
    clearIntervals();
    stopAllPitches();
    disableGameControls();
}

function clearIntervals() {
    clearInterval(gameIntervalId);
    clearInterval(investorSpawnIntervalId);
    gameIntervalId = null;
    investorSpawnIntervalId = null;
}

function createInvestor() {
    if (investors.length >= MAX_INVESTORS) return;

    // Determine investor type based on rarity
    const typeRoll = Math.random();
    let selectedType = INVESTOR_TYPES.NORMAL;
    let cumulativeRarity = 0;

    for (const [type, config] of Object.entries(INVESTOR_TYPES)) {
        cumulativeRarity += config.rarity;
        if (typeRoll <= cumulativeRarity) {
            selectedType = config;
            break;
        }
    }

    const investorData = {
        id: Date.now(),
        element: document.createElement('div'),
        isBeingPitched: false,
        hasBeenPitched: false,
        boredomLevel: 0,
        pitchTimerId: null,
        boredomTimerId: null,
        boredomIncrementFactor: BOREDOM_CONFIG.BASE_INCREMENT * selectedType.boredomRate,
        pitchTimeLeft: PITCH_DURATION_SECONDS,
        type: selectedType,
        scoreMultiplier: selectedType.scoreMultiplier
    };

    // Add power-up chance
    if (Math.random() < 0.3) { // 30% chance for power-up
        const powerUpRoll = Math.random();
        let cumulativePowerUpRarity = 0;
        
        for (const [powerUp, config] of Object.entries(POWER_UPS)) {
            cumulativePowerUpRarity += config.rarity;
            if (powerUpRoll <= cumulativePowerUpRarity) {
                investorData.powerUp = config;
                break;
            }
        }
    }

    // Setup investor element
    investorData.element.className = 'investor';
    if (selectedType !== INVESTOR_TYPES.NORMAL) {
        investorData.element.classList.add('special');
    }
    
    // Add padding for the timer and boredom bars
    const padding = 60;
    const gameArea = document.getElementById('game-area');
    investorData.element.style.left = `${Math.random() * (gameArea.clientWidth - padding)}px`;
    investorData.element.style.top = `${Math.random() * (gameArea.clientHeight - padding)}px`;
    
    // Add investor content
    investorData.element.innerHTML = `
        <div class="timer-bar-container">
            <div class="timer-bar" style="width: 100%"></div>
        </div>
        <div class="boredom-bar-container">
            <div class="boredom-bar" style="width: 0%"></div>
        </div>
        <span class="face">${selectedType.face}</span>
        ${investorData.powerUp ? `<div class="power-up-indicator">${investorData.powerUp.name.split(' ')[0]}</div>` : ''}
    `;
    
    // Add click event listener
    investorData.element.addEventListener('click', () => {
        if (!isGameRunning || isPaused || investorData.hasBeenPitched || currentPitch) return;
        soundManager.play('CLICK');
        startPitch(investorData);
    });
    
    // Add to game
    gameArea.appendChild(investorData.element);
    investors.push(investorData);
    
    return investorData;
}

function spawnInitialInvestors() {
    // Clear existing investors
    const gameArea = document.getElementById('game-area');
    gameArea.innerHTML = '';
    investors = [];
    
    // Create initial set of investors
    for (let i = 0; i < MAX_INVESTORS / 2; i++) {
        createInvestor();
    }
}

function startInvestorSpawning() {
    investorSpawnIntervalId = setInterval(() => {
        if (!isPaused && investors.length < MAX_INVESTORS) {
            createInvestor();
        }
    }, INVESTOR_SPAWN_INTERVAL_MS);
}

function activatePowerUp(powerUp, investor) {
    if (!powerUp) return;
    
    soundManager.play('POWER_UP');
    activePowerUps.add(powerUp.name);
    showMessage(`🎉 Power-up activated: ${powerUp.name}!`, false);
    
    applyPowerUpEffect(powerUp, investor);
}

function startPitch(investor) {
    if (!investor || investor.isBeingPitched) return;
    
    investor.isBeingPitched = true;
    currentPitch = investor;
    soundManager.play('PITCH_START');
    
    // Start pitch timer and boredom tracking
    startPitchTimer(investor);
    startBoredomTimer(investor);
}

function endPitch(investor, success, message) {
    if (!investor || !investor.isBeingPitched) return;
    
    soundManager.play(success ? 'PITCH_SUCCESS' : 'PITCH_FAIL');
    
    // Update game statistics
    updateGameStats(currentPitchAnalysis, success);
    
    // Handle investor animation and removal
    handlePitchEnd(investor, success, message);
}

function updateComboLevel(level) {
    if (level > 1) {
        soundManager.play('COMBO');
    }
    // ... rest of updateComboLevel function ...
}

function checkAchievements(pitchData) {
    const achievements = [];
    // ... existing achievement checks ...
    
    if (achievements.length > 0) {
        soundManager.play('ACHIEVEMENT');
    }
    
    return achievements;
}

function handleInvestorClick(investor) {
    soundManager.play('CLICK');
    // ... rest of handleInvestorClick function ...
}

function updateBoredomLevel(investor) {
    if (!investor.isBeingPitched || isPaused) return;
    
    // Calculate boredom increase
    let boredomIncrease = calculateBoredomIncrease(investor);
    
    // Update boredom level
    investor.boredomLevel = Math.min(100, investor.boredomLevel + boredomIncrease);
    
    // Update visual indicator
    updateBoredomBar(investor);
    
    // Check for high boredom warning
    if (investor.boredomLevel > 80 && !investor.hasWarnedBoredom) {
        soundManager.play('BOREDOM_WARNING');
        investor.hasWarnedBoredom = true;
    }
    
    // Check for pitch failure due to boredom
    if (investor.boredomLevel >= 100) {
        endPitch(investor, false, "Lost interest!");
    }
}

// Add sound control button to the UI
function initializeSoundControl() {
    const soundControl = document.createElement('div');
    soundControl.className = 'sound-control';
    soundControl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
    `;
    
    soundControl.addEventListener('click', () => {
        const isMuted = soundManager.toggleMute();
        soundControl.classList.toggle('muted', isMuted);
    });
    
    document.body.appendChild(soundControl);
}

// Initialize sound control when the game loads
document.addEventListener('DOMContentLoaded', () => {
    initializeSoundControl();
    // ... rest of DOMContentLoaded handler ...
});

// Export game state for other modules
export const gameState = {
    isGameRunning,
    isPaused,
    gameTimeLeft,
    score,
    currentPitch,
    investors
}; 