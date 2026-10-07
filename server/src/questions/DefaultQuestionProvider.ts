import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerQuestion, Difficulty } from '../../../shared/src/types.js';
import type { QuestionProvider } from './QuestionProvider.js';
import { GENERAL_KNOWLEDGE_QUESTIONS } from './general-knowledge.js';
import { GAME_CONSTANTS } from '../../../shared/src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DefaultQuestionProvider implements QuestionProvider {
  private questions: ServerQuestion[] = [];
  private categories: string[] = [];

  constructor(customQuestions?: ServerQuestion[]) {
    if (customQuestions && customQuestions.length > 0) {
      this.questions = customQuestions;
      return;
    }

    // Load initial General Knowledge questions
    this.questions.push(...GENERAL_KNOWLEDGE_QUESTIONS);

    // Dynamically load all JSON category banks from data directory
    try {
      const candidates = [
        path.join(__dirname, 'data'),
        path.join(__dirname, '../src/questions/data'),
        path.join(process.cwd(), 'server/src/questions/data'),
        path.join(process.cwd(), 'src/questions/data'),
      ];
      const dataDir = candidates.find(dir => fs.existsSync(dir));
      if (dataDir) {
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
          const parsed: ServerQuestion[] = JSON.parse(content);
          this.questions.push(...parsed);
        }
      }
    } catch (err) {
      console.warn('[QuestionProvider] Warning: Failed to load external category banks, using built-in questions:', err);
    }

    this.categories = Array.from(new Set(this.questions.map(q => q.category)));
  }

  getAll(): ServerQuestion[] {
    return [...this.questions];
  }

  getCategories(): string[] {
    return this.categories;
  }

  getByDifficulty(difficulty: Difficulty): ServerQuestion[] {
    return this.questions.filter(q => q.difficulty === difficulty);
  }

  getByCategory(category: string): ServerQuestion[] {
    return this.questions.filter(q => q.category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Optionally fetch questions dynamically from OpenTDB
   */
  async fetchLiveOpenTdb(amount = 10): Promise<ServerQuestion[] | null> {
    try {
      const res = await fetch(`https://opentdb.com/api.php?amount=${amount}&type=multiple`);
      if (!res.ok) return null;
      const data: any = await res.json();
      if (!data.results || data.results.length === 0) return null;

      const converted: ServerQuestion[] = data.results.map((item: any, idx: number) => {
        const unescape = (str: string) =>
          str.replace(/&quot;/g, '"')
             .replace(/&#039;/g, "'")
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>');

        const correct = unescape(item.correct_answer);
        const incorrect = item.incorrect_answers.map((a: string) => unescape(a));
        const allOptions = [correct, ...incorrect];

        return {
          id: `live-${Date.now()}-${idx}`,
          category: unescape(item.category),
          text: unescape(item.question),
          options: allOptions,
          correctIndex: 0,
          difficulty: item.difficulty as Difficulty,
        };
      });

      return converted.map(q => this.shuffleOptions(q));
    } catch {
      return null;
    }
  }

  /**
   * Select a balanced, diverse mix of questions for a game.
   * Pulls across multiple categories (Sports, Space, History, Nature, Animals, Logic, etc.)
   * Excludes previously used question IDs.
   * Shuffles option order server-side.
   */
  getGameSet(count: number = GAME_CONSTANTS.QUESTIONS_PER_GAME, excludeIds?: Set<string>): ServerQuestion[] {
    const available = this.questions.filter(q => !excludeIds?.has(q.id));

    const easy = this.shuffleArray(available.filter(q => q.difficulty === 'easy'));
    const medium = this.shuffleArray(available.filter(q => q.difficulty === 'medium'));
    const hard = this.shuffleArray(available.filter(q => q.difficulty === 'hard'));

    // Target balance: ~4 easy, ~4 medium, ~2 hard
    const selected: ServerQuestion[] = [
      ...easy.slice(0, 4),
      ...medium.slice(0, 4),
      ...hard.slice(0, 2),
    ];

    if (selected.length < count) {
      const selectedIds = new Set(selected.map(q => q.id));
      const remaining = available.filter(q => !selectedIds.has(q.id));
      const shuffledRemaining = this.shuffleArray(remaining);
      selected.push(...shuffledRemaining.slice(0, count - selected.length));
    }

    return this.shuffleArray(selected.slice(0, count)).map(q => this.shuffleOptions(q));
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

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
