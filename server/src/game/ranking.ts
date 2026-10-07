import type { PlayerState } from '../rooms/RoomStore.js';

export interface RankedPlayer {
  id: string;
  name: string;
  score: number;
  totalCorrect: number;
  totalAnswerTimeMs: number;
  rank: number;
}

/**
 * Rank players by: total score (desc) → more correct answers (desc) → lower total answer time (asc).
 * Tied players share the same rank.
 */
export function rankPlayers(players: PlayerState[]): RankedPlayer[] {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
    return a.totalAnswerTimeMs - b.totalAnswerTimeMs;
  });

  const ranked: RankedPlayer[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const player = sorted[i];
    if (i > 0) {
      const prev = sorted[i - 1];
      if (
        player.score !== prev.score ||
        player.totalCorrect !== prev.totalCorrect ||
        player.totalAnswerTimeMs !== prev.totalAnswerTimeMs
      ) {
        currentRank = i + 1;
      }
    }
    ranked.push({
      id: player.id,
      name: player.name,
      score: player.score,
      totalCorrect: player.totalCorrect,
      totalAnswerTimeMs: player.totalAnswerTimeMs,
      rank: currentRank,
    });
  }

  return ranked;
}
