// Game Configuration Constants
const GAME_DURATION_SECONDS = 180;  // 3 minutes total game time
const PITCH_DURATION_SECONDS = 30;  // Back to 30 seconds
const MAX_INVESTORS = 12;
const INVESTOR_SPAWN_INTERVAL_MS = 4000;  // Slightly slower investor spawning
const VOICE_LISTEN_DURATION_MS = 10000;

// Boredom configuration
const BOREDOM_CONFIG = {
    BASE_INCREMENT: 0.05,          // Reduced base increment for more forgiveness
    SILENCE_PENALTY: 0.2,          // Reduced silence penalty
    FILLER_PENALTY: 0.15,         // Reduced filler word penalty
    GOOD_CONTENT_BONUS: 0.08,     // Increased bonus for good content
    INITIAL_GRACE_PERIOD_MS: 3000, // 3 second grace period at start
    MAX_BOREDOM_RATE: 0.4         // Lower cap on maximum boredom rate
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

export function startGame() {
    console.log("Debug: startGame called.");
    if (isGameRunning) return;
    
    if (!rulesShown) {
        showRulesModal();
        rulesShown = true;
        return;
    }
    
    // Reset game state
    score = 0;
    gameTimeLeft = GAME_DURATION_SECONDS;
    isGameRunning = true;
    isPaused = false;
    currentPitch = null;
    
    // Update UI
    updateScoreDisplay();
    updateGameTimerDisplay();
    updateGameControls(true);
    
    // Clear messages and update status
    clearMessage();
    updateMicStatus('idle');
    clearWarnings();
    
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

// Export game state for other modules
export const gameState = {
    isGameRunning,
    isPaused,
    gameTimeLeft,
    score,
    currentPitch,
    investors
}; 