import type { AckResponse, RoomSnapshot, ToastMessage, Difficulty, QuizLanguage } from './types.js';

export interface CreateRoomData {
  name: string;
  category?: string;
  difficulty?: Difficulty;
  questionCount?: number;
  questionTimeSec?: number;
  language?: QuizLanguage;
}

// Client -> Server events
export interface ClientToServerEvents {
  'room:create': (data: CreateRoomData, ack: (res: AckResponse) => void) => void;
  'room:join': (data: { code: string; name: string }, ack: (res: AckResponse) => void) => void;
  'room:rejoin': (data: { code: string; sessionToken: string }, ack: (res: AckResponse) => void) => void;
  'room:leave': (ack: (res: AckResponse) => void) => void;
  'game:start': (ack: (res: AckResponse) => void) => void;
  'answer:submit': (data: { questionId: string; optionIndex: number }, ack: (res: AckResponse) => void) => void;
  'game:rematch': (ack: (res: AckResponse) => void) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  'room:state': (snapshot: RoomSnapshot) => void;
  'toast': (message: ToastMessage) => void;
}

// Inter-server events (unused for now)
export interface InterServerEvents {}

// Socket data
export interface SocketData {
  playerId: string;
  roomCode: string;
  sessionToken: string;
}
