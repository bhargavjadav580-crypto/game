import { describe, it, expect } from 'vitest';
import { calculateScore } from '../src/game/scoring.js';
import { rankPlayers } from '../src/game/ranking.js';
import { validateName, validateRoomCode, validateOptionIndex } from '../src/security/validation.js';
import { GENERAL_KNOWLEDGE_QUESTIONS } from '../src/questions/general-knowledge.js';
import { DefaultQuestionProvider } from '../src/questions/DefaultQuestionProvider.js';
import type { PlayerState } from '../src/rooms/RoomStore.js';

describe('Layer 1: Pure Functions & Core Logic', () => {
  describe('Scoring Logic', () => {
    it('awards 0 points for incorrect answers', () => {
      expect(calculateScore(false, 500)).toBe(0);
      expect(calculateScore(false, 2000)).toBe(0);
    });

    it('awards 150 points for ≤ 1.0s elapsed', () => {
      expect(calculateScore(true, 500)).toBe(150);
      expect(calculateScore(true, 1000)).toBe(150);
    });

    it('awards 140 points for 1.0s < elapsed ≤ 2.0s', () => {
      expect(calculateScore(true, 1001)).toBe(140);
      expect(calculateScore(true, 2000)).toBe(140);
    });

    it('awards 130 points for 2.0s < elapsed ≤ 3.0s', () => {
      expect(calculateScore(true, 2500)).toBe(130);
      expect(calculateScore(true, 3000)).toBe(130);
    });

    it('awards 120 points for 3.0s < elapsed ≤ 4.0s', () => {
      expect(calculateScore(true, 3500)).toBe(120);
      expect(calculateScore(true, 4000)).toBe(120);
    });

    it('awards 110 points for 4.0s < elapsed ≤ 5.0s', () => {
      expect(calculateScore(true, 4500)).toBe(110);
      expect(calculateScore(true, 5000)).toBe(110);
    });

    it('awards 100 points for elapsed > 5.0s', () => {
      expect(calculateScore(true, 5001)).toBe(100);
      expect(calculateScore(true, 7500)).toBe(100);
    });
  });

  describe('Ranking and Tie-Break', () => {
    it('ranks primarily by total score descending', () => {
      const players: PlayerState[] = [
        { id: '1', name: 'Alice', score: 250, totalCorrect: 2, totalAnswerTimeMs: 3000 } as any,
        { id: '2', name: 'Bob', score: 300, totalCorrect: 2, totalAnswerTimeMs: 4000 } as any,
      ];
      const ranked = rankPlayers(players);
      expect(ranked[0].name).toBe('Bob');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].name).toBe('Alice');
      expect(ranked[1].rank).toBe(2);
    });

    it('breaks ties using total correct answers then total answer speed', () => {
      const players: PlayerState[] = [
        { id: '1', name: 'Alice', score: 200, totalCorrect: 2, totalAnswerTimeMs: 3000 } as any,
        { id: '2', name: 'Bob', score: 200, totalCorrect: 1, totalAnswerTimeMs: 1000 } as any,
        { id: '3', name: 'Charlie', score: 200, totalCorrect: 2, totalAnswerTimeMs: 2500 } as any,
      ];
      const ranked = rankPlayers(players);
      expect(ranked[0].name).toBe('Charlie'); // same score, same correct, faster time
      expect(ranked[1].name).toBe('Alice');
      expect(ranked[2].name).toBe('Bob');
    });
  });

  describe('Validation & Sanitization', () => {
    it('validates player names', () => {
      expect(validateName('  Bob  ').sanitized).toBe('Bob');
      expect(validateName('A').valid).toBe(false);
      expect(validateName('A'.repeat(17)).valid).toBe(false);
      expect(validateName('Player_1').valid).toBe(true);
    });

    it('validates room codes', () => {
      expect(validateRoomCode('abc23').sanitized).toBe('ABC23');
      expect(validateRoomCode('ABCD').valid).toBe(false);
      expect(validateRoomCode('ABC10').valid).toBe(false); // contains '1' and '0'
    });

    it('validates option indices', () => {
      expect(validateOptionIndex(0).valid).toBe(true);
      expect(validateOptionIndex(3).valid).toBe(true);
      expect(validateOptionIndex(4).valid).toBe(false);
      expect(validateOptionIndex(-1).valid).toBe(false);
      expect(validateOptionIndex('0').valid).toBe(false);
    });
  });

  describe('Question Bank Integrity', () => {
    it('has at least 60 questions with unique IDs and texts', () => {
      expect(GENERAL_KNOWLEDGE_QUESTIONS.length).toBeGreaterThanOrEqual(60);

      const ids = new Set<string>();
      const texts = new Set<string>();

      for (const q of GENERAL_KNOWLEDGE_QUESTIONS) {
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);

        expect(texts.has(q.text)).toBe(false);
        texts.add(q.text);

        expect(q.options.length).toBe(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(3);
      }
    });

    it('provider produces 10 questions with shuffled options without losing correct answer', () => {
      const provider = new DefaultQuestionProvider();
      const gameSet = provider.getGameSet(10);
      expect(gameSet.length).toBe(10);

      for (const q of gameSet) {
        expect(q.options.length).toBe(4);
        const original = GENERAL_KNOWLEDGE_QUESTIONS.find((item) => item.id === q.id)!;
        const expectedCorrectText = original.options[original.correctIndex];
        expect(q.options[q.correctIndex]).toBe(expectedCorrectText);
      }
    });
  });
});
