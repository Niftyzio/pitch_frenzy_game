// Scoring weights for different aspects of the pitch
const SCORING_WEIGHTS = {
    CONTENT: 0.5,        // 50% - Increased weight for what you say
    DELIVERY: 0.2,       // 20% - Reduced weight for how you say it
    ENGAGEMENT: 0.2,     // 20% - How well you keep interest
    EFFICIENCY: 0.1      // 10% - Time management
};

// Combo system configuration
const COMBO_SYSTEM = {
    MIN_KEYWORDS_FOR_COMBO: 3,
    COMBO_WINDOW_MS: 5000,
    MAX_COMBO_MULTIPLIER: 2.0,
    COMBO_STEPS: [1.0, 1.2, 1.5, 1.8, 2.0]
};

// Achievement system
const ACHIEVEMENTS = {
    PERFECT_PITCH: {
        name: "🎯 Perfect Pitch",
        description: "Score 9.5 or higher on a pitch",
        reward: 100
    },
    COMBO_MASTER: {
        name: "🔥 Combo Master",
        description: "Achieve a 5x combo",
        reward: 150
    },
    QUICK_TALKER: {
        name: "⚡ Quick Talker",
        description: "Complete a pitch in under 20 seconds",
        reward: 75
    },
    KEYWORD_KING: {
        name: "👑 Keyword King",
        description: "Use 10+ business terms in one pitch",
        reward: 125
    }
};

// Minimum requirements for a decent pitch
const REQUIREMENTS = {
    MIN_WORDS: 25,               // Reduced minimum word count
    MIN_BUSINESS_TERMS: 2,       // Reduced minimum business terms
    MAX_FILLER_RATIO: 0.25,      // More forgiving filler ratio
    MIN_PITCH_DURATION: 12,      // Reduced minimum duration
    OPTIMAL_WORDS_PER_MINUTE: {
        MIN: 80,               // More forgiving minimum pace
        MAX: 160              // Same maximum pace
    }
};

// Content scoring categories
const CONTENT_CATEGORIES = {
    PROBLEM: ["problem", "pain", "challenge", "need", "issue", "gap", "inefficient"],
    SOLUTION: ["solution", "solve", "improve", "enhance", "optimize", "streamline"],
    MARKET: ["market", "customer", "user", "demographic", "audience", "segment"],
    BUSINESS: ["revenue", "profit", "monetize", "business model", "pricing"],
    TRACTION: ["growth", "adoption", "retention", "users", "customers"],
    UNIQUE: ["unique", "different", "innovative", "better", "advantage"]
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

    // Calculate base scores
    const contentScore = calculateContentScore(transcript);
    const deliveryScore = calculateDeliveryScore(aiAnalysis);
    const engagementScore = calculateEngagementScore(boredomLevel);
    const efficiencyScore = calculateEfficiencyScore(transcript, duration);

    // Calculate combo multiplier
    const comboMultiplier = calculateComboMultiplier(transcript);

    // Calculate final score with combo
    const finalScore = (
        (contentScore * SCORING_WEIGHTS.CONTENT) +
        (deliveryScore * SCORING_WEIGHTS.DELIVERY) +
        (engagementScore * SCORING_WEIGHTS.ENGAGEMENT) +
        (efficiencyScore * SCORING_WEIGHTS.EFFICIENCY)
    ) * comboMultiplier;

    // Check for achievements
    const achievements = checkAchievements({
        score: finalScore,
        duration,
        transcript,
        comboMultiplier
    });

    return {
        score: Math.min(10, Math.round(finalScore * 10) / 10),
        breakdown: {
            content: contentScore * 10,
            delivery: deliveryScore * 10,
            engagement: engagementScore * 10,
            efficiency: efficiencyScore * 10
        },
        combo: {
            multiplier: comboMultiplier,
            level: getComboLevel(comboMultiplier)
        },
        achievements
    };
}

function calculateContentScore(transcript) {
    const words = transcript.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    if (totalWords < REQUIREMENTS.MIN_WORDS) {
        return 0.3; // Slightly higher minimum score
    }

    // Calculate category coverage
    let coveredCategories = 0;
    let totalKeywords = 0;
    
    for (const [category, keywords] of Object.entries(CONTENT_CATEGORIES)) {
        const categoryHits = keywords.some(keyword => 
            transcript.toLowerCase().includes(keyword)
        );
        if (categoryHits) {
            coveredCategories++;
            totalKeywords += keywords.filter(keyword => 
                transcript.toLowerCase().includes(keyword)
            ).length;
        }
    }

    // Calculate scores
    const coverageScore = coveredCategories / Object.keys(CONTENT_CATEGORIES).length;
    const keywordDensity = totalKeywords / totalWords;
    const fillerWords = words.filter(word => NEGATIVE_KEYWORDS.includes(word)).length;
    const fillerRatio = fillerWords / totalWords;

    // Penalties and bonuses
    const fillerPenalty = fillerRatio > REQUIREMENTS.MAX_FILLER_RATIO ? 
        (fillerRatio - REQUIREMENTS.MAX_FILLER_RATIO) : 0;
    const densityBonus = Math.min(0.2, keywordDensity); // Up to 0.2 bonus for keyword density

    // Final content score calculation
    const baseScore = (coverageScore * 0.7) + (densityBonus * 0.3);
    return Math.max(0, Math.min(1, baseScore - fillerPenalty));
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
    // More forgiving conversion of boredom level to engagement score
    const normalizedBoredom = boredomLevel / 100;
    return Math.max(0, 1 - (normalizedBoredom * 0.8)); // 20% more forgiving
}

function calculateEfficiencyScore(transcript, duration) {
    const words = transcript.split(/\s+/).length;
    const wordsPerMinute = (words / duration) * 60;

    // More forgiving scoring for pace
    if (wordsPerMinute >= REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MIN &&
        wordsPerMinute <= REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MAX) {
        return 1;
    }

    // Reduced penalties for pace deviation
    const deviation = Math.min(
        Math.abs(wordsPerMinute - REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MIN),
        Math.abs(wordsPerMinute - REQUIREMENTS.OPTIMAL_WORDS_PER_MINUTE.MAX)
    );

    return Math.max(0, 1 - (deviation / 120)); // More forgiving deviation penalty
}

function calculateComboMultiplier(transcript) {
    const words = transcript.toLowerCase().split(/\s+/);
    let comboCount = 0;
    let lastKeywordTime = 0;
    let currentCombo = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (isBusinessKeyword(word)) {
            const currentTime = Date.now();
            if (currentTime - lastKeywordTime <= COMBO_SYSTEM.COMBO_WINDOW_MS) {
                currentCombo++;
            } else {
                currentCombo = 1;
            }
            lastKeywordTime = currentTime;
            comboCount = Math.max(comboCount, currentCombo);
        }
    }

    const comboLevel = Math.min(
        Math.floor(comboCount / COMBO_SYSTEM.MIN_KEYWORDS_FOR_COMBO),
        COMBO_SYSTEM.COMBO_STEPS.length - 1
    );

    return COMBO_SYSTEM.COMBO_STEPS[comboLevel];
}

function getComboLevel(multiplier) {
    const index = COMBO_SYSTEM.COMBO_STEPS.indexOf(multiplier);
    return index + 1;
}

function checkAchievements(pitchData) {
    const achievements = [];
    const { score, duration, transcript, comboMultiplier } = pitchData;

    // Check for perfect pitch
    if (score >= 9.5) {
        achievements.push(ACHIEVEMENTS.PERFECT_PITCH);
    }

    // Check for combo master
    if (comboMultiplier >= COMBO_SYSTEM.MAX_COMBO_MULTIPLIER) {
        achievements.push(ACHIEVEMENTS.COMBO_MASTER);
    }

    // Check for quick talker
    if (duration < 20) {
        achievements.push(ACHIEVEMENTS.QUICK_TALKER);
    }

    // Check for keyword king
    const businessTerms = transcript.toLowerCase().split(/\s+/).filter(isBusinessKeyword).length;
    if (businessTerms >= 10) {
        achievements.push(ACHIEVEMENTS.KEYWORD_KING);
    }

    return achievements;
}

function isBusinessKeyword(word) {
    return Object.values(CONTENT_CATEGORIES).some(category => 
        category.includes(word)
    );
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