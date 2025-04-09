import { calculatePitchScore } from '../analysis/pitch-analysis.js';

// UI Elements
const DOM = {
    micStatus: document.getElementById('mic-status'),
    transcriptArea: document.getElementById('transcript-area'),
    messageArea: document.getElementById('message-area'),
    warningArea: document.getElementById('warning-area'),
    aiFeedback: document.getElementById('ai-feedback')
};

export function updateMicStatus(status) {
    if (!DOM.micStatus) return;
    
    DOM.micStatus.className = `mic-status ${status}`;
    const icon = DOM.micStatus.querySelector('svg');
    if (icon) {
        switch (status) {
            case 'listening':
                icon.style.stroke = '#22C55E';
                break;
            case 'error':
                icon.style.stroke = '#EF4444';
                break;
            default:
                icon.style.stroke = 'currentColor';
        }
    }
}

export function updateTranscript(text) {
    if (DOM.transcriptArea) {
        DOM.transcriptArea.textContent = text;
    }
}

export function showMessage(message, isError = false) {
    if (DOM.messageArea) {
        DOM.messageArea.textContent = message;
        DOM.messageArea.className = `mt-4 text-center text-lg font-medium ${isError ? 'text-red-500' : 'text-gray-700'}`;
    }
}

export function showWarning(id, message, type = 'warning') {
    if (!DOM.warningArea) return;
    
    const existingWarning = document.getElementById(id);
    if (existingWarning) {
        existingWarning.remove();
    }
    
    const warning = document.createElement('div');
    warning.id = id;
    warning.className = `warning ${type}`;
    warning.textContent = message;
    
    DOM.warningArea.appendChild(warning);
}

export function updateAIFeedback(analysis) {
    if (!DOM.aiFeedback) return;
    
    // Clear previous feedback
    DOM.aiFeedback.innerHTML = '';
    
    // Add new feedback items
    analysis.feedback.forEach(item => {
        const li = document.createElement('li');
        li.className = 'feedback-item';
        li.textContent = item;
        DOM.aiFeedback.appendChild(li);
    });
}

export function showPitchResult(pitchData) {
    const result = calculatePitchScore(pitchData);
    const scoreColor = getScoreColor(result.score);
    
    // Update investor face with score
    const faceSpan = pitchData.element.querySelector('.face');
    if (faceSpan) {
        faceSpan.textContent = `${result.score}/10`;
        faceSpan.style.color = scoreColor;
        faceSpan.style.fontSize = '1.2em';
        faceSpan.style.fontWeight = 'bold';
    }
    
    // Update investor background based on score
    pitchData.element.style.backgroundColor = `${scoreColor}40`; // 40 is hex for 25% opacity
    
    // Show detailed feedback
    showDetailedFeedback(result);
    
    return result.score >= 7; // Consider it successful if score is 7 or higher
}

function getScoreColor(score) {
    if (score >= 8.5) return '#22C55E'; // Green for excellent
    if (score >= 7) return '#3B82F6';   // Blue for good
    if (score >= 5) return '#F59E0B';   // Yellow for average
    return '#EF4444';                   // Red for poor
}

function showDetailedFeedback(result) {
    const feedbackArea = document.getElementById('pitch-feedback');
    if (!feedbackArea) return;
    
    // Create feedback content
    const content = `
        <div class="feedback-header">
            <h3>Pitch Score: <span style="color: ${getScoreColor(result.score)}">${result.score}/10</span></h3>
        </div>
        <div class="score-breakdown">
            <div class="score-item">
                <label>Content:</label>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${result.breakdown.content}%"></div>
                </div>
                <span>${result.breakdown.content.toFixed(1)}</span>
            </div>
            <div class="score-item">
                <label>Delivery:</label>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${result.breakdown.delivery}%"></div>
                </div>
                <span>${result.breakdown.delivery.toFixed(1)}</span>
            </div>
            <div class="score-item">
                <label>Engagement:</label>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${result.breakdown.engagement}%"></div>
                </div>
                <span>${result.breakdown.engagement.toFixed(1)}</span>
            </div>
            <div class="score-item">
                <label>Efficiency:</label>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${result.breakdown.efficiency}%"></div>
                </div>
                <span>${result.breakdown.efficiency.toFixed(1)}</span>
            </div>
        </div>
        ${result.feedback.length > 0 ? `
            <div class="feedback-tips">
                <h4>Improvement Tips:</h4>
                <ul>
                    ${result.feedback.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    
    feedbackArea.innerHTML = content;
    feedbackArea.style.display = 'block';
} 