// Game phase enum
export type GamePhase =
  | 'WAITING'
  | 'STARTING'
  | 'QUESTION_ACTIVE'
  | 'REVEAL'
  | 'SCOREBOARD'
  | 'FINISHED';

// Difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard';

// Player answer record
export interface AnswerRecord {
  questionId: string;
  optionIndex: number;
  elapsedMs: number;
  correct: boolean;
  score: number;
}

// Public player info (what the client receives)
export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  score: number;
  totalCorrect: number;
  totalAnswerTimeMs: number;
  // Current round answer (only visible during REVEAL/SCOREBOARD/FINISHED)
  currentAnswer?: {
    optionIndex: number;
    correct: boolean;
    scoreGained: number;
  };
  hasAnswered: boolean; // true if they submitted for the current question
}

// Question as sent to clients (never includes correctIndex)
export interface ClientQuestion {
  id: string;
  category: string;
  text: string;
  options: string[];
}

// Full question (server only)
export interface ServerQuestion {
  id: string;
  category: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: Difficulty;
}

// Room state snapshot sent to each client
export interface RoomSnapshot {
  roomCode: string;
  phase: GamePhase;
  version: number;
  serverNow: number;
  players: PublicPlayer[];
  // Game-specific fields
  questionIndex: number;       // 0-based, which question we're on
  totalQuestions: number;
  currentQuestion?: ClientQuestion;
  endsAt?: number;             // epoch ms when current phase ends
  // Reveal data
  correctIndex?: number;       // only sent during REVEAL/SCOREBOARD/FINISHED
  // Self identification
  selfId: string;
}

// Toast message from server
export interface ToastMessage {
  code: string;
  message: string;
}

// Ack response for all client events
export interface AckResponse {
  ok: boolean;
  error?: string;
  code?: string; // error code for i18n
  data?: Record<string, unknown>;
}
