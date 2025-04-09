// Scoring weights for different aspects of the pitch
const SCORING_WEIGHTS = {
    CONTENT: 0.4,        // 40% - What you say
    DELIVERY: 0.3,       // 30% - How you say it
    ENGAGEMENT: 0.2,     // 20% - How well you keep interest
    EFFICIENCY: 0.1      // 10% - Time management
};

// Minimum requirements for a decent pitch
const REQUIREMENTS = {
    MIN_WORDS: 30,               // Back to original minimum
    MIN_BUSINESS_TERMS: 3,       // Back to original minimum
    MAX_FILLER_RATIO: 0.2,      // Keeping more forgiving filler ratio
    MIN_PITCH_DURATION: 15,     // Half of total pitch duration
    OPTIMAL_WORDS_PER_MINUTE: {
        MIN: 100,              // Keeping lower minimum pace
        MAX: 160              // Keeping same maximum pace
    }
};

/**
 * Calculates a detailed pitch score out of 10
 */
export function calculatePitchScore(pitchData) {
    const {
        transcript,
        duration,
        boredomLevel,
        aiAnalysis
    } = pitchData;

    // 1. Content Score (4 points max)
    const contentScore = calculateContentScore(transcript);

    // 2. Delivery Score (3 points max)
    const deliveryScore = calculateDeliveryScore(aiAnalysis);

    // 3. Engagement Score (2 points max)
    const engagementScore = calculateEngagementScore(boredomLevel);

    // 4. Efficiency Score (1 point max)
    const efficiencyScore = calculateEfficiencyScore(transcript, duration);

    // Calculate final score out of 10
    const finalScore = (
        (contentScore * SCORING_WEIGHTS.CONTENT) +
        (deliveryScore * SCORING_WEIGHTS.DELIVERY) +
        (engagementScore * SCORING_WEIGHTS.ENGAGEMENT) +
        (efficiencyScore * SCORING_WEIGHTS.EFFICIENCY)
    ) * 10;

    // Generate feedback
    const feedback = generatePitchFeedback({
        contentScore,
        deliveryScore,
        engagementScore,
        efficiencyScore,
        transcript,
        duration
    });

    return {
        score: Math.round(finalScore * 10) / 10, // Round to 1 decimal place
        breakdown: {
            content: contentScore * 10,
            delivery: deliveryScore * 10,
            engagement: engagementScore * 10,
            efficiency: efficiencyScore * 10
        },
        feedback
    };
}

function calculateContentScore(transcript) {
    const words = transcript.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    if (totalWords < REQUIREMENTS.MIN_WORDS) {
        return 0.2; // Minimum score for very short pitches
    }

    // Check for business terms and key phrases
    const businessTerms = words.filter(word => POSITIVE_KEYWORDS.includes(word)).length;
    const fillerWords = words.filter(word => NEGATIVE_KEYWORDS.includes(word)).length;
    const fillerRatio = fillerWords / totalWords;

    // Score components
    const keywordScore = Math.min(1, businessTerms / REQUIREMENTS.MIN_BUSINESS_TERMS);
    const fillerPenalty = fillerRatio > REQUIREMENTS.MAX_FILLER_RATIO ? 
        (fillerRatio - REQUIREMENTS.MAX_FILLER_RATIO) * 2 : 0;
    
    return Math.max(0, Math.min(1, keywordScore - fillerPenalty));
}

function calculateDeliveryScore(aiAnalysis) {
    if (!aiAnalysis) return 0.5; // Default score if no AI analysis

    const {
        clarity,
        pace,
        confidence,
        tonalVariation
    } = aiAnalysis;

    return (
        (clarity * 0.3) +         // 30% for clarity
        (pace * 0.3) +           // 30% for appropriate pacing
        (confidence * 0.2) +     // 20% for confidence
        (tonalVariation * 0.2)   // 20% for vocal variety
    );
}

function calculateEngagementScore(boredomLevel) {
    // Convert boredom level (0-100) to engagement score (0-1)
    return Math.max(0, 1 - (boredomLevel / 100));
}

function calculateEfficiencyScore(transcript, duration) {
    const words = transcript.split(/\s+/).length;
    const wordsPerMinute = (words / duration) * 60;

    // Perfect score for hitting the optimal range
    if (wordsPerMinute >= REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MIN &&
        wordsPerMinute <= REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MAX) {
        return 1;
    }

    // Penalty for being too slow or too fast
    const deviation = Math.min(
        Math.abs(wordsPerMinute - REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MIN),
        Math.abs(wordsPerMinute - REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MAX)
    );

    return Math.max(0, 1 - (deviation / 100));
}

function generatePitchFeedback(data) {
    const feedback = [];
    
    // Content feedback
    if (data.contentScore < 0.6) {
        feedback.push("Include more business terms and key concepts");
    }
    if (data.transcript.split(/\s+/).length < REQUIREMENTS.MIN_WORDS) {
        feedback.push("Make your pitch more comprehensive");
    }

    // Delivery feedback
    if (data.deliveryScore < 0.6) {
        feedback.push("Work on clarity and pacing");
    }

    // Engagement feedback
    if (data.engagementScore < 0.6) {
        feedback.push("Keep the investor more engaged");
    }

    // Efficiency feedback
    if (data.efficiencyScore < 0.6) {
        const wordsPerMinute = (data.transcript.split(/\s+/).length / data.duration) * 60;
        if (wordsPerMinute < REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MIN) {
            feedback.push("Try speaking a bit faster");
        } else if (wordsPerMinute > REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MAX) {
            feedback.push("Slow down slightly for better clarity");
        }
    }

    return feedback;
} 