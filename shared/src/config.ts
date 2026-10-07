// Phase durations in milliseconds (server-authoritative)
export const PHASE_DURATIONS_MS = {
  STARTING: 3000,
  QUESTION: 13000,
  REVEAL: 3000,
  SCOREBOARD: 3000,
} as const;

// Game constants
export const GAME_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  QUESTIONS_PER_GAME: 10,
  OPTIONS_PER_QUESTION: 4,
  ROOM_CODE_LENGTH: 5,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 16,
  ANSWER_GRACE_MS: 300,
  LOBBY_DISCONNECT_GRACE_MS: 15000,
  HOST_DISCONNECT_GRACE_MS: 10000,
  EMPTY_ROOM_CLEANUP_MS: 120000,
  IDLE_LOBBY_CLEANUP_MS: 1800000,
  FINISHED_ROOM_CLEANUP_MS: 900000,
} as const;

// Scoring constants
export const SCORING = {
  BASE_CORRECT: 100,
  SPEED_TIERS: [
    { maxElapsedSec: 1, bonus: 50 },
    { maxElapsedSec: 2, bonus: 40 },
    { maxElapsedSec: 3, bonus: 30 },
    { maxElapsedSec: 4, bonus: 20 },
    { maxElapsedSec: 5, bonus: 10 },
  ],
  WRONG_SCORE: 0,
  MAX_PER_QUESTION: 150,
} as const;

// Room code character set (no ambiguous chars: I, L, O, 0, 1)
export const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
