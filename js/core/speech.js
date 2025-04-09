import { VOICE_ANALYSIS } from '../config/voice-config.js';
import { analyzeVoiceWithAI } from '../analysis/voice-analysis.js';
import { updateAIFeedback } from '../ui/feedback.js';
import { gameState } from './game.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
const isSpeechApiAvailable = !!SpeechRecognition;

export function checkSpeechRecognitionSupport() {
    if (!isSpeechApiAvailable) {
        console.error("Speech Recognition API is not supported in this browser");
        showWarning('speech-api-warning', "Voice input not supported by this browser. Please use Chrome, Edge, or Safari.", 'api-error');
        return false;
    }
    
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn("Speech Recognition requires HTTPS (except on localhost)");
        showWarning('https-warning', 'HTTPS is required for microphone access. Please use a secure connection.', 'https');
        return false;
    }
    
    return true;
}

export function initializeSpeechRecognition() {
    if (!checkSpeechRecognitionSupport()) {
        return null;
    }

    try {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        recognitionInstance.maxAlternatives = 1;
        
        return recognitionInstance;
    } catch (error) {
        console.error("Error initializing speech recognition:", error);
        showWarning('speech-api-error', 'Failed to initialize speech recognition. Please try reloading the page.', 'api-error');
        return null;
    }
}

export function startSpeechRecognition(investorData) {
    try {
        recognition = new SpeechRecognition();
        setupSpeechRecognitionHandlers(recognition, investorData);
        recognition.start();
        return true;
    } catch (error) {
        console.error("Error starting speech recognition:", error);
        showMessage("Failed to start microphone! Click the investor again to retry.", true);
        return false;
    }
}

export function stopSpeechRecognition() {
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            console.error("Error stopping recognition:", e);
        }
        recognition = null;
    }
    isListening = false;
    updateMicStatus('idle');
}

function setupSpeechRecognitionHandlers(recognition, investorData) {
    recognition.onstart = () => {
        console.log("Speech recognition started");
        isListening = true;
        updateMicStatus('listening');
        showMessage("Start your pitch now!", false);
    };
    
    recognition.onresult = async (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        
        updateTranscript(transcript);
        
        if (recognition.audioStream) {
            const aiAnalysis = await analyzeVoiceWithAI(recognition.audioStream, transcript);
            if (aiAnalysis) {
                updateBoredomFactor(investorData, aiAnalysis);
                updateAIFeedback(aiAnalysis);
            }
        }
        
        analyzePitchContent(transcript, investorData);
    };
    
    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        handleSpeechError(event, investorData);
    };
    
    recognition.onend = () => {
        console.log("Speech recognition ended");
        handleSpeechEnd(investorData);
    };
}

function updateBoredomFactor(investorData, aiAnalysis) {
    const aiConfidenceBonus = aiAnalysis.confidence * 0.3;
    investorData.boredomIncrementFactor *= (1 - aiConfidenceBonus);
}

function handleSpeechError(event, investorData) {
    updateMicStatus('error');
    showMessage("Microphone error! Click the investor again to retry.", true);
    endPitch(investorData, false, "Technical difficulties!");
}

function handleSpeechEnd(investorData) {
    if (isListening && gameState.currentPitch === investorData) {
        try {
            recognition.start();
        } catch (e) {
            console.error("Error restarting recognition:", e);
        }
    }
}

export const speechState = {
    isListening,
    recognition
}; 