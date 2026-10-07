import { SCORING } from '../../../shared/src/config.js';

/**
 * Calculate score for an answer.
 * Pure function — no side effects.
 * @param correct Whether the answer was correct
 * @param elapsedMs Time taken in milliseconds (server-measured)
 * @returns Score earned (0 for wrong, 100 + speed bonus for correct)
 */
export function calculateScore(correct: boolean, elapsedMs: number): number {
  if (!correct) return SCORING.WRONG_SCORE;

  let bonus = 0;
  const elapsedSec = elapsedMs / 1000;

  for (const tier of SCORING.SPEED_TIERS) {
    if (elapsedSec <= tier.maxElapsedSec) {
      bonus = tier.bonus;
      break;
    }
  }

  return SCORING.BASE_CORRECT + bonus;
}
