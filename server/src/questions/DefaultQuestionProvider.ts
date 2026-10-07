import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerQuestion, Difficulty, QuizLanguage } from '../../../shared/src/types.js';
import type { QuestionProvider, GameSetOptions } from './QuestionProvider.js';
import { GENERAL_KNOWLEDGE_QUESTIONS } from './general-knowledge.js';
import { GAME_CONSTANTS } from '../../../shared/src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HINDI_REGEX = /[\u0900-\u097F]/;

export class DefaultQuestionProvider implements QuestionProvider {
  private questions: ServerQuestion[] = [];
  private categories: string[] = [];

  constructor(customQuestions?: ServerQuestion[]) {
    if (customQuestions && customQuestions.length > 0) {
      this.questions = customQuestions.map(q => this.tagQuestionLanguage(q));
      return;
    }

    // Load initial General Knowledge questions
    this.questions.push(...GENERAL_KNOWLEDGE_QUESTIONS.map(q => this.tagQuestionLanguage(q)));

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
          this.questions.push(...parsed.map(q => this.tagQuestionLanguage(q)));
        }
      }
    } catch (err) {
      console.warn('[QuestionProvider] Warning: Failed to load external category banks, using built-in questions:', err);
    }

    this.categories = Array.from(new Set(this.questions.map(q => q.category)));
  }

  private tagQuestionLanguage(q: ServerQuestion): ServerQuestion {
    const isHindi = q.language === 'hi' ||
      q.category.toLowerCase() === 'hindi' ||
      HINDI_REGEX.test(q.text) ||
      (q.options && q.options.some(opt => HINDI_REGEX.test(opt)));
    return {
      ...q,
      language: isHindi ? 'hi' : (q.language || 'en'),
    };
  }

  getAll(): ServerQuestion[] {
    return [...this.questions];
  }

  getCategories(): string[] {
    return this.categories;
  }

  getByDifficulty(difficulty: Difficulty): ServerQuestion[] {
    if (difficulty === 'all') return [...this.questions];
    return this.questions.filter(q => q.difficulty === difficulty);
  }

  getByCategory(category: string): ServerQuestion[] {
    return this.questions.filter(q => q.category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Select questions for a match based on count, category, difficulty, and language.
   */
  getGameSet(optionsOrCount?: number | GameSetOptions, excludeIdsParam?: Set<string>): ServerQuestion[] {
    let count: number = GAME_CONSTANTS.QUESTIONS_PER_GAME;
    let category: string | undefined;
    let difficulty: Difficulty | undefined;
    let language: QuizLanguage | undefined;
    let excludeIds = excludeIdsParam;

    if (typeof optionsOrCount === 'number') {
      count = optionsOrCount;
    } else if (typeof optionsOrCount === 'object' && optionsOrCount !== null) {
      if (optionsOrCount.count) count = optionsOrCount.count;
      category = optionsOrCount.category;
      difficulty = optionsOrCount.difficulty;
      language = optionsOrCount.language;
      if (optionsOrCount.excludeIds) excludeIds = optionsOrCount.excludeIds;
    }

    // Step 1: Filter out excluded IDs
    let pool = this.questions.filter(q => !excludeIds?.has(q.id));

    // Step 2: Language filter (Crucial: "fully quiz comes in hindi fully that type add feature")
    if (language === 'hi') {
      const hindiPool = pool.filter(q => q.language === 'hi');
      if (hindiPool.length > 0) {
        pool = hindiPool;
      }
    } else if (language === 'en') {
      const enPool = pool.filter(q => q.language !== 'hi');
      if (enPool.length > 0) {
        pool = enPool;
      }
    }

    // Step 3: Category filter (sport, nature, animal, science, history, geography, logic, mix)
    if (category && category.toLowerCase() !== 'mix' && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase();
      const matchedCat = pool.filter(q => {
        const qCat = q.category.toLowerCase();
        return qCat === catLower ||
               (catLower.includes('sport') && qCat.includes('sport')) ||
               (catLower.includes('nature') && qCat.includes('nature')) ||
               (catLower.includes('animal') && qCat.includes('animal')) ||
               (catLower.includes('science') && qCat.includes('science')) ||
               (catLower.includes('histor') && qCat.includes('histor')) ||
               (catLower.includes('geo') && qCat.includes('geo')) ||
               (catLower.includes('logic') && (qCat.includes('logic') || qCat.includes('math')));
      });

      if (matchedCat.length >= count) {
        pool = matchedCat;
      } else if (matchedCat.length > 0) {
        // Use all matching category questions, then fill remaining from the rest of the language pool
        const otherPool = pool.filter(q => !matchedCat.some(m => m.id === q.id));
        pool = [...matchedCat, ...otherPool];
      }
    }

    // Step 4: Difficulty filter
    let selected: ServerQuestion[] = [];
    if (difficulty && difficulty !== 'all') {
      const diffMatched = pool.filter(q => q.difficulty === difficulty);
      const shuffledDiff = this.shuffleArray(diffMatched);
      selected.push(...shuffledDiff.slice(0, count));
    }

    // If still need more questions, fill with balanced mix from pool
    if (selected.length < count) {
      const selectedIds = new Set(selected.map(q => q.id));
      const remaining = pool.filter(q => !selectedIds.has(q.id));
      const shuffledRemaining = this.shuffleArray(remaining);
      selected.push(...shuffledRemaining.slice(0, count - selected.length));
    }

    // If still less than requested count (edge case), draw from all questions
    if (selected.length < count) {
      const selectedIds = new Set(selected.map(q => q.id));
      const fallback = this.shuffleArray(this.questions.filter(q => !selectedIds.has(q.id)));
      selected.push(...fallback.slice(0, count - selected.length));
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
