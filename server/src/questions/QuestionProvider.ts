import type { ServerQuestion, Difficulty } from '../../../shared/src/types.js';

/**
 * Interface for question providers.
 * Allows swapping in different sources (file, API, AI) without changing game logic.
 */
export interface QuestionProvider {
  /** Get all available questions */
  getAll(): ServerQuestion[];
  /** Get questions filtered by difficulty */
  getByDifficulty(difficulty: Difficulty): ServerQuestion[];
  /** Get a mix of questions for a game (4 easy, 4 medium, 2 hard by default) */
  getGameSet(count: number, excludeIds?: Set<string>): ServerQuestion[];
}
