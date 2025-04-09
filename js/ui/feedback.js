import { calculatePitchScore } from '../analysis/pitch-analysis.js';

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