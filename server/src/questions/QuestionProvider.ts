import type { ServerQuestion, Difficulty, QuizLanguage } from '../../../shared/src/types.js';

export interface GameSetOptions {
  count?: number;
  category?: string;
  difficulty?: Difficulty;
  language?: QuizLanguage;
  excludeIds?: Set<string>;
}

/**
 * Interface for question providers.
 * Allows swapping in different sources (file, API, AI) without changing game logic.
 */
export interface QuestionProvider {
  /** Get all available questions */
  getAll(): ServerQuestion[];
  /** Get questions filtered by difficulty */
  getByDifficulty(difficulty: Difficulty): ServerQuestion[];
  /** Get questions for a game based on count or rich filters */
  getGameSet(optionsOrCount?: number | GameSetOptions, excludeIds?: Set<string>): ServerQuestion[];
}
