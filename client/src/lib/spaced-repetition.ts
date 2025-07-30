// Spaced repetition algorithm based on SM-2
export interface SpacedRepetitionResult {
  interval: number;
  easeFactor: number;
  level: number;
}

export function calculateNextReview(
  currentInterval: number,
  currentEaseFactor: number,
  currentLevel: number,
  quality: number // 0-5 scale, where 3+ is correct
): SpacedRepetitionResult {
  let newEaseFactor = currentEaseFactor;
  let newInterval = currentInterval;
  let newLevel = currentLevel;

  if (quality >= 3) {
    // Correct answer
    if (currentLevel === 0) {
      newInterval = 1;
    } else if (currentLevel === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * (currentEaseFactor / 100));
    }
    newLevel = currentLevel + 1;
  } else {
    // Incorrect answer - reset to beginning
    newLevel = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ensure ease factor doesn't go below 130
  if (newEaseFactor < 130) {
    newEaseFactor = 130;
  }

  return {
    interval: Math.max(1, newInterval),
    easeFactor: Math.round(newEaseFactor),
    level: newLevel
  };
}

export function getNextReviewDate(intervalDays: number): Date {
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);
  nextReview.setHours(9, 0, 0, 0); // Set to 9 AM for consistent review times
  return nextReview;
}

export function getQualityFromAccuracy(isCorrect: boolean, responseTime?: number): number {
  if (!isCorrect) return 0;
  
  // Base quality for correct answer
  let quality = 4;
  
  // Adjust based on response time (if provided)
  if (responseTime) {
    if (responseTime < 3000) quality = 5; // Very fast response
    else if (responseTime < 5000) quality = 4; // Fast response
    else if (responseTime < 10000) quality = 3; // Normal response
    else quality = 3; // Slow but correct
  }
  
  return quality;
}

export function shouldShowWordForReview(lastReviewed: Date | null, nextReview: Date | null): boolean {
  if (!lastReviewed || !nextReview) return true;
  
  const now = new Date();
  return now >= nextReview;
}

export function getDifficultyMultiplier(difficulty: "easy" | "normal" | "hard"): number {
  switch (difficulty) {
    case "easy": return 1.5; // Longer intervals
    case "normal": return 1.0;
    case "hard": return 0.7; // Shorter intervals
    default: return 1.0;
  }
}
