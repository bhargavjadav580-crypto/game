import type { GamePhase, ServerQuestion, Difficulty, QuizLanguage } from '../../../shared/src/types.js';

export interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  sessionToken: string;
  socketId: string | null;
  connected: boolean;
  joinedAt: number;
  score: number;
  totalCorrect: number;
  totalAnswerTimeMs: number;
  answers: Map<string, AnswerState>;
  disconnectedAt?: number;
}

export interface AnswerState {
  questionId: string;
  optionIndex: number;
  receivedAt: number; // server timestamp
  elapsedMs: number;  // server-measured
  correct: boolean;
  score: number;
}

export interface Room {
  code: string;
  phase: GamePhase;
  version: number;
  createdAt: number;
  lastActivityAt: number;
  players: Map<string, PlayerState>;
  // Game settings
  category: string;
  difficulty: Difficulty;
  questionCount: number;
  questionTimeMs: number;
  language: QuizLanguage;
  // Game state
  questions: ServerQuestion[];
  questionIndex: number;
  questionStartedAt: number;
  phaseEndsAt: number;
  usedQuestionIds: Set<string>;
  phaseTimer: ReturnType<typeof setTimeout> | null;
}

export interface RoomStore {
  createRoom(code: string): Room;
  getRoom(code: string): Room | undefined;
  deleteRoom(code: string): void;
  listRooms(): Map<string, Room>;
  roomCount(): number;
}
