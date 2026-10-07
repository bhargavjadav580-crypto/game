import type { ServerQuestion, Difficulty } from '../../../shared/src/types.js';
import type { QuestionProvider } from './QuestionProvider.js';
import { GENERAL_KNOWLEDGE_QUESTIONS } from './general-knowledge.js';
import { GAME_CONSTANTS } from '../../../shared/src/config.js';

export class DefaultQuestionProvider implements QuestionProvider {
  private questions: ServerQuestion[];

  constructor(questions?: ServerQuestion[]) {
    this.questions = questions || GENERAL_KNOWLEDGE_QUESTIONS;
  }

  getAll(): ServerQuestion[] {
    return [...this.questions];
  }

  getByDifficulty(difficulty: Difficulty): ServerQuestion[] {
    return this.questions.filter(q => q.difficulty === difficulty);
  }

  /**
   * Select a balanced mix of questions for a game.
   * Default mix: 4 easy, 4 medium, 2 hard.
   * Excludes previously used question IDs.
   * Shuffles option order server-side (same shuffle for all players in a game).
   */
  getGameSet(count: number = GAME_CONSTANTS.QUESTIONS_PER_GAME, excludeIds?: Set<string>): ServerQuestion[] {
    const available = this.questions.filter(q => !excludeIds?.has(q.id));

    const easy = this.shuffleArray(available.filter(q => q.difficulty === 'easy'));
    const medium = this.shuffleArray(available.filter(q => q.difficulty === 'medium'));
    const hard = this.shuffleArray(available.filter(q => q.difficulty === 'hard'));

    // Target mix: 4 easy, 4 medium, 2 hard
    const selected: ServerQuestion[] = [
      ...easy.slice(0, 4),
      ...medium.slice(0, 4),
      ...hard.slice(0, 2),
    ];

    // If we don't have enough of a difficulty, fill from others
    if (selected.length < count) {
      const selectedIds = new Set(selected.map(q => q.id));
      const remaining = available.filter(q => !selectedIds.has(q.id));
      const shuffledRemaining = this.shuffleArray(remaining);
      selected.push(...shuffledRemaining.slice(0, count - selected.length));
    }

    // Shuffle the overall order and shuffle options within each question
    return this.shuffleArray(selected.slice(0, count)).map(q => this.shuffleOptions(q));
  }

  /** Fisher-Yates shuffle */
  private shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /** Shuffle option order and update correctIndex accordingly */
  private shuffleOptions(question: ServerQuestion): ServerQuestion {
    const correctOption = question.options[question.correctIndex];
    const shuffledOptions = this.shuffleArray([...question.options]);
    const newCorrectIndex = shuffledOptions.indexOf(correctOption);
    return {
      ...question,
      options: shuffledOptions,
      correctIndex: newCorrectIndex,
    };
  }
}
