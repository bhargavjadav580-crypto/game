import crypto from 'node:crypto';
import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../../../shared/src/protocol.js';
import type { RoomSnapshot, PublicPlayer, AckResponse, Difficulty, QuizLanguage } from '../../../shared/src/types.js';
import { GAME_CONSTANTS, PHASE_DURATIONS_MS } from '../../../shared/src/config.js';
import type { Room, PlayerState, RoomStore, AnswerState } from './RoomStore.js';
import { generateRoomCode } from './roomCodes.js';
import { validateName, validateRoomCode, validateOptionIndex, validateQuestionId } from '../security/validation.js';
import { calculateScore } from '../game/scoring.js';
import type { QuestionProvider } from '../questions/QuestionProvider.js';
import { DefaultQuestionProvider } from '../questions/DefaultQuestionProvider.js';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export class RoomManager {
  private questionProvider: QuestionProvider;

  constructor(
    private io: AppServer,
    private store: RoomStore,
    questionProvider?: QuestionProvider
  ) {
    this.questionProvider = questionProvider || new DefaultQuestionProvider();
  }

  /** Create a new room. Returns { ok, data: { roomCode, sessionToken, playerId } } */
  handleCreate(socket: AppSocket, data: {
    name: string;
    category?: string;
    difficulty?: Difficulty;
    questionCount?: number;
    questionTimeSec?: number;
    language?: QuizLanguage;
  }): AckResponse {
    const nameResult = validateName(data?.name);
    if (!nameResult.valid) return { ok: false, error: nameResult.error, code: 'INVALID_NAME' };

    const code = generateRoomCode(this.store);
    const room = this.store.createRoom(code);

    if (data?.category) room.category = data.category;
    if (data?.difficulty) room.difficulty = data.difficulty;
    if (data?.questionCount) {
      room.questionCount = Math.max(5, Math.min(30, Number(data.questionCount) || 10));
    }
    if (data?.questionTimeSec) {
      room.questionTimeMs = Math.max(5000, Math.min(60000, Number(data.questionTimeSec) * 1000));
    }
    if (data?.language === 'hi' || data?.language === 'en') {
      room.language = data.language;
    }

    const playerId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(16).toString('hex');
    const player: PlayerState = {
      id: playerId,
      name: nameResult.sanitized,
      isHost: true,
      sessionToken,
      socketId: socket.id,
      connected: true,
      joinedAt: Date.now(),
      score: 0,
      totalCorrect: 0,
      totalAnswerTimeMs: 0,
      answers: new Map(),
    };
    room.players.set(playerId, player);

    socket.data.playerId = playerId;
    socket.data.roomCode = code;
    socket.data.sessionToken = sessionToken;
    socket.join(code);

    this.broadcastState(room);
    return { ok: true, data: { roomCode: code, sessionToken, playerId } };
  }

  /** Join an existing room */
  handleJoin(socket: AppSocket, data: { code: string; name: string }): AckResponse {
    const nameResult = validateName(data?.name);
    if (!nameResult.valid) return { ok: false, error: nameResult.error, code: 'INVALID_NAME' };

    const codeResult = validateRoomCode(data?.code);
    if (!codeResult.valid) return { ok: false, error: codeResult.error, code: 'INVALID_CODE' };

    const room = this.store.getRoom(codeResult.sanitized);
    if (!room) return { ok: false, error: 'Room not found', code: 'ROOM_NOT_FOUND' };

    if (room.phase !== 'WAITING' && room.phase !== 'FINISHED') {
      return { ok: false, error: 'Game already in progress', code: 'GAME_IN_PROGRESS' };
    }

    if (room.players.size >= GAME_CONSTANTS.MAX_PLAYERS) {
      return { ok: false, error: 'Room is full (max 8 players)', code: 'ROOM_FULL' };
    }

    const lowerName = nameResult.sanitized.toLowerCase();
    for (const p of room.players.values()) {
      if (p.name.toLowerCase() === lowerName) {
        return { ok: false, error: 'Name already taken in this room', code: 'DUPLICATE_NAME' };
      }
    }

    const playerId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(16).toString('hex');
    const player: PlayerState = {
      id: playerId,
      name: nameResult.sanitized,
      isHost: false,
      sessionToken,
      socketId: socket.id,
      connected: true,
      joinedAt: Date.now(),
      score: 0,
      totalCorrect: 0,
      totalAnswerTimeMs: 0,
      answers: new Map(),
    };
    room.players.set(playerId, player);
    room.lastActivityAt = Date.now();

    socket.data.playerId = playerId;
    socket.data.roomCode = codeResult.sanitized;
    socket.data.sessionToken = sessionToken;
    socket.join(codeResult.sanitized);

    this.broadcastState(room);
    return { ok: true, data: { roomCode: codeResult.sanitized, sessionToken, playerId } };
  }

  /** Rejoin a room with session token */
  handleRejoin(socket: AppSocket, data: { code: string; sessionToken: string }): AckResponse {
    const codeResult = validateRoomCode(data?.code);
    if (!codeResult.valid) return { ok: false, error: codeResult.error, code: 'INVALID_CODE' };

    if (typeof data?.sessionToken !== 'string' || !data.sessionToken) {
      return { ok: false, error: 'Invalid session token', code: 'INVALID_TOKEN' };
    }

    const room = this.store.getRoom(codeResult.sanitized);
    if (!room) return { ok: false, error: 'Room not found or has ended', code: 'ROOM_NOT_FOUND' };

    let player: PlayerState | undefined;
    for (const p of room.players.values()) {
      if (p.sessionToken === data.sessionToken) {
        player = p;
        break;
      }
    }

    if (!player) {
      return { ok: false, error: 'Session not found in this room', code: 'SESSION_NOT_FOUND' };
    }

    player.socketId = socket.id;
    player.connected = true;
    delete player.disconnectedAt;

    socket.data.playerId = player.id;
    socket.data.roomCode = codeResult.sanitized;
    socket.data.sessionToken = data.sessionToken;
    socket.join(codeResult.sanitized);

    room.lastActivityAt = Date.now();
    this.broadcastState(room);

    return { ok: true, data: { roomCode: codeResult.sanitized, sessionToken: data.sessionToken, playerId: player.id } };
  }

  /** Handle player leaving */
  handleLeave(socket: AppSocket): AckResponse {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) {
      return { ok: false, error: 'Not in a room', code: 'NOT_IN_ROOM' };
    }

    const room = this.store.getRoom(roomCode);
    if (!room) return { ok: true };

    this.removePlayer(room, playerId, socket);
    return { ok: true };
  }

  /** Handle starting the game */
  handleStartGame(socket: AppSocket): AckResponse {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) {
      return { ok: false, error: 'Not in a room', code: 'NOT_IN_ROOM' };
    }

    const room = this.store.getRoom(roomCode);
    if (!room) return { ok: false, error: 'Room not found', code: 'ROOM_NOT_FOUND' };

    const player = room.players.get(playerId);
    if (!player || !player.isHost) {
      return { ok: false, error: 'Only the host can start the game', code: 'NOT_HOST' };
    }

    if (room.phase !== 'WAITING' && room.phase !== 'FINISHED') {
      return { ok: false, error: 'Game cannot be started in current phase', code: 'INVALID_PHASE' };
    }

    const connectedCount = this.getConnectedCount(room);
    if (connectedCount < GAME_CONSTANTS.MIN_PLAYERS) {
      return { ok: false, error: `At least ${GAME_CONSTANTS.MIN_PLAYERS} players are required to start`, code: 'NOT_ENOUGH_PLAYERS' };
    }

    // Reset scores & stats for a fresh game
    for (const p of room.players.values()) {
      p.score = 0;
      p.totalCorrect = 0;
      p.totalAnswerTimeMs = 0;
      p.answers.clear();
    }

    // Draw questions according to room settings avoiding previously used IDs
    const questions = this.questionProvider.getGameSet({
      count: room.questionCount || GAME_CONSTANTS.QUESTIONS_PER_GAME,
      category: room.category,
      difficulty: room.difficulty,
      language: room.language,
      excludeIds: room.usedQuestionIds,
    });
    for (const q of questions) {
      room.usedQuestionIds.add(q.id);
    }
    room.questions = questions;
    room.questionIndex = 0;

    this.startCountdown(room);
    return { ok: true };
  }

  /** Rematch in the same room */
  handleRematch(socket: AppSocket): AckResponse {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) {
      return { ok: false, error: 'Not in a room', code: 'NOT_IN_ROOM' };
    }

    const room = this.store.getRoom(roomCode);
    if (!room) return { ok: false, error: 'Room not found', code: 'ROOM_NOT_FOUND' };

    const player = room.players.get(playerId);
    if (!player || !player.isHost) {
      return { ok: false, error: 'Only the host can initiate rematch', code: 'NOT_HOST' };
    }

    if (room.phase !== 'FINISHED') {
      return { ok: false, error: 'Game has not finished yet', code: 'INVALID_PHASE' };
    }

    return this.handleStartGame(socket);
  }

  /** Submit answer */
  handleSubmitAnswer(socket: AppSocket, data: { questionId: string; optionIndex: number }): AckResponse {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) {
      return { ok: false, error: 'Not in a room', code: 'NOT_IN_ROOM' };
    }

    const room = this.store.getRoom(roomCode);
    if (!room) return { ok: false, error: 'Room not found', code: 'ROOM_NOT_FOUND' };

    if (room.phase !== 'QUESTION_ACTIVE') {
      return { ok: false, error: 'Questions are not currently active', code: 'INVALID_PHASE' };
    }

    const player = room.players.get(playerId);
    if (!player) return { ok: false, error: 'Player not found', code: 'PLAYER_NOT_FOUND' };

    const qValidation = validateQuestionId(data?.questionId);
    if (!qValidation.valid) return { ok: false, error: qValidation.error, code: 'INVALID_QUESTION_ID' };

    const optValidation = validateOptionIndex(data?.optionIndex);
    if (!optValidation.valid) return { ok: false, error: optValidation.error, code: 'INVALID_OPTION' };

    const currentQ = room.questions[room.questionIndex];
    if (!currentQ || currentQ.id !== qValidation.value) {
      return { ok: false, error: 'Question does not match current question', code: 'QUESTION_MISMATCH' };
    }

    if (player.answers.has(currentQ.id)) {
      return { ok: false, error: 'You have already answered this question', code: 'ALREADY_ANSWERED' };
    }

    const now = Date.now();
    if (now > room.phaseEndsAt + GAME_CONSTANTS.ANSWER_GRACE_MS) {
      return { ok: false, error: 'Time limit expired', code: 'TIME_EXPIRED' };
    }

    const elapsedMs = Math.max(0, now - room.questionStartedAt);
    const isCorrect = optValidation.value === currentQ.correctIndex;
    const pointsGained = calculateScore(isCorrect, elapsedMs);

    const answerState: AnswerState = {
      questionId: currentQ.id,
      optionIndex: optValidation.value,
      receivedAt: now,
      elapsedMs,
      correct: isCorrect,
      score: pointsGained,
    };
    player.answers.set(currentQ.id, answerState);
    player.score += pointsGained;
    if (isCorrect) {
      player.totalCorrect += 1;
    }
    player.totalAnswerTimeMs += elapsedMs;

    this.broadcastState(room);

    // Early transition check: did every connected player answer?
    this.checkAllAnswered(room);

    return { ok: true };
  }

  private startCountdown(room: Room): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);

    room.phase = 'STARTING';
    room.phaseEndsAt = Date.now() + PHASE_DURATIONS_MS.STARTING;
    this.broadcastState(room);

    room.phaseTimer = setTimeout(() => {
      this.startQuestion(room);
    }, PHASE_DURATIONS_MS.STARTING);
  }

  private startQuestion(room: Room): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);

    const questionDuration = room.questionTimeMs || PHASE_DURATIONS_MS.QUESTION;
    room.phase = 'QUESTION_ACTIVE';
    room.questionStartedAt = Date.now();
    room.phaseEndsAt = Date.now() + questionDuration;
    this.broadcastState(room);

    room.phaseTimer = setTimeout(() => {
      this.transitionToReveal(room);
    }, questionDuration);
  }

  private checkAllAnswered(room: Room): void {
    if (room.phase !== 'QUESTION_ACTIVE') return;

    const currentQ = room.questions[room.questionIndex];
    if (!currentQ) return;

    let allAnswered = true;
    let connectedCount = 0;

    for (const player of room.players.values()) {
      if (player.connected) {
        connectedCount++;
        if (!player.answers.has(currentQ.id)) {
          allAnswered = false;
          break;
        }
      }
    }

    if (connectedCount > 0 && allAnswered) {
      if (room.phaseTimer) clearTimeout(room.phaseTimer);
      this.transitionToReveal(room);
    }
  }

  private transitionToReveal(room: Room): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);

    room.phase = 'REVEAL';
    room.phaseEndsAt = Date.now() + PHASE_DURATIONS_MS.REVEAL;
    this.broadcastState(room);

    room.phaseTimer = setTimeout(() => {
      this.transitionToScoreboard(room);
    }, PHASE_DURATIONS_MS.REVEAL);
  }

  private transitionToScoreboard(room: Room): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);

    room.phase = 'SCOREBOARD';
    room.phaseEndsAt = Date.now() + PHASE_DURATIONS_MS.SCOREBOARD;
    this.broadcastState(room);

    room.phaseTimer = setTimeout(() => {
      if (room.questionIndex + 1 < room.questions.length) {
        room.questionIndex++;
        this.startQuestion(room);
      } else {
        this.transitionToFinished(room);
      }
    }, PHASE_DURATIONS_MS.SCOREBOARD);
  }

  private transitionToFinished(room: Room): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);

    room.phase = 'FINISHED';
    room.phaseEndsAt = 0;
    this.broadcastState(room);

    setTimeout(() => {
      const current = this.store.getRoom(room.code);
      if (current && current.phase === 'FINISHED') {
        this.store.deleteRoom(room.code);
      }
    }, GAME_CONSTANTS.FINISHED_ROOM_CLEANUP_MS);
  }

  /** Handle socket disconnect */
  handleDisconnect(socket: AppSocket): void {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = this.store.getRoom(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    if (room.phase === 'WAITING' || room.phase === 'FINISHED') {
      player.connected = false;
      player.disconnectedAt = Date.now();
      player.socketId = null;

      setTimeout(() => {
        if (!player.connected && room.players.has(playerId)) {
          this.removePlayer(room, playerId, socket);
        }
      }, GAME_CONSTANTS.LOBBY_DISCONNECT_GRACE_MS);
    } else {
      player.connected = false;
      player.disconnectedAt = Date.now();
      player.socketId = null;
      // In-game: if remaining players have all answered, transition early
      this.checkAllAnswered(room);
    }

    if (player.isHost) {
      setTimeout(() => {
        if (!player.connected && room.players.has(playerId)) {
          this.transferHost(room, playerId);
        }
      }, GAME_CONSTANTS.HOST_DISCONNECT_GRACE_MS);
    }

    this.broadcastState(room);
  }

  /** Remove a player from a room */
  private removePlayer(room: Room, playerId: string, socket: AppSocket): void {
    const player = room.players.get(playerId);
    const wasHost = player?.isHost ?? false;

    room.players.delete(playerId);
    socket.leave(room.code);

    if (wasHost && room.players.size > 0) {
      this.transferHost(room, playerId);
    }

    if (room.players.size === 0) {
      this.scheduleCleanup(room);
    } else {
      this.broadcastState(room);
    }
  }

  /** Transfer host to the earliest-joined connected player */
  private transferHost(room: Room, excludeId: string): void {
    let newHost: PlayerState | undefined;
    for (const p of room.players.values()) {
      if (p.id !== excludeId && p.connected) {
        if (!newHost || p.joinedAt < newHost.joinedAt) {
          newHost = p;
        }
      }
    }

    if (newHost) {
      for (const p of room.players.values()) {
        p.isHost = false;
      }
      newHost.isHost = true;

      this.io.to(room.code).emit('toast', {
        code: 'HOST_CHANGED',
        message: `${newHost.name} is now the host`,
      });
    }

    this.broadcastState(room);
  }

  /** Schedule room cleanup */
  private scheduleCleanup(room: Room): void {
    setTimeout(() => {
      const current = this.store.getRoom(room.code);
      if (current && current.players.size === 0) {
        this.store.deleteRoom(room.code);
      }
    }, GAME_CONSTANTS.EMPTY_ROOM_CLEANUP_MS);
  }

  /** Create a per-player sanitized snapshot */
  createSnapshot(room: Room, selfId: string): RoomSnapshot {
    const players: PublicPlayer[] = [];

    for (const p of room.players.values()) {
      const pub: PublicPlayer = {
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        connected: p.connected,
        score: p.score,
        totalCorrect: p.totalCorrect,
        totalAnswerTimeMs: p.totalAnswerTimeMs,
        hasAnswered: false,
      };

      if (room.phase === 'REVEAL' || room.phase === 'SCOREBOARD' || room.phase === 'FINISHED') {
        const currentQ = room.questions[room.questionIndex];
        if (currentQ) {
          const answer = p.answers.get(currentQ.id);
          if (answer) {
            pub.currentAnswer = {
              optionIndex: answer.optionIndex,
              correct: answer.correct,
              scoreGained: answer.score,
            };
            pub.hasAnswered = true;
          }
        }
      } else if (room.phase === 'QUESTION_ACTIVE') {
        const currentQ = room.questions[room.questionIndex];
        if (currentQ) {
          pub.hasAnswered = p.answers.has(currentQ.id);
        }
      }

      players.push(pub);
    }

    const snapshot: RoomSnapshot = {
      roomCode: room.code,
      phase: room.phase,
      version: room.version,
      serverNow: Date.now(),
      players,
      questionIndex: room.questionIndex,
      totalQuestions: room.questions.length > 0 ? room.questions.length : (room.questionCount || GAME_CONSTANTS.QUESTIONS_PER_GAME),
      selfId,
      category: room.category,
      difficulty: room.difficulty,
      questionCount: room.questionCount,
      questionTimeMs: room.questionTimeMs,
      language: room.language,
    };

    if (room.phase === 'QUESTION_ACTIVE' || room.phase === 'REVEAL' || room.phase === 'SCOREBOARD') {
      const q = room.questions[room.questionIndex];
      if (q) {
        snapshot.currentQuestion = {
          id: q.id,
          category: q.category,
          text: q.text,
          options: q.options,
        };
        snapshot.endsAt = room.phaseEndsAt;
      }
    }

    if (room.phase === 'STARTING') {
      snapshot.endsAt = room.phaseEndsAt;
    }

    if (room.phase === 'REVEAL' || room.phase === 'SCOREBOARD' || room.phase === 'FINISHED') {
      const q = room.questions[room.questionIndex];
      if (q) {
        snapshot.correctIndex = q.correctIndex;
      }
    }

    return snapshot;
  }

  /** Broadcast per-player snapshots to all players in a room */
  broadcastState(room: Room): void {
    room.version++;
    room.lastActivityAt = Date.now();

    for (const player of room.players.values()) {
      if (player.socketId && player.connected) {
        const snapshot = this.createSnapshot(room, player.id);
        this.io.to(player.socketId).emit('room:state', snapshot);
      }
    }
  }

  /** Get the number of connected players in a room */
  getConnectedCount(room: Room): number {
    let count = 0;
    for (const p of room.players.values()) {
      if (p.connected) count++;
    }
    return count;
  }
}
