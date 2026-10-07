import crypto from 'node:crypto';
import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../../../shared/src/protocol.js';
import type { RoomSnapshot, PublicPlayer, AckResponse, GamePhase } from '../../../shared/src/types.js';
import { GAME_CONSTANTS } from '../../../shared/src/config.js';
import type { Room, PlayerState, RoomStore } from './RoomStore.js';
import { generateRoomCode } from './roomCodes.js';
import { validateName, validateRoomCode } from '../security/validation.js';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export class RoomManager {
  constructor(
    private io: AppServer,
    private store: RoomStore
  ) {}

  /** Create a new room. Returns { ok, data: { roomCode, sessionToken, playerId } } */
  handleCreate(socket: AppSocket, data: { name: string }): AckResponse {
    // 1. Validate name
    const nameResult = validateName(data?.name);
    if (!nameResult.valid) return { ok: false, error: nameResult.error, code: 'INVALID_NAME' };

    // 2. Generate room code
    const code = generateRoomCode(this.store);

    // 3. Create room
    const room = this.store.createRoom(code);

    // 4. Create player (host)
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

    // 5. Associate socket with room
    socket.data.playerId = playerId;
    socket.data.roomCode = code;
    socket.data.sessionToken = sessionToken;
    socket.join(code);

    // 6. Broadcast state
    this.broadcastState(room);

    return { ok: true, data: { roomCode: code, sessionToken, playerId } };
  }

  /** Join an existing room */
  handleJoin(socket: AppSocket, data: { code: string; name: string }): AckResponse {
    // 1. Validate inputs
    const nameResult = validateName(data?.name);
    if (!nameResult.valid) return { ok: false, error: nameResult.error, code: 'INVALID_NAME' };

    const codeResult = validateRoomCode(data?.code);
    if (!codeResult.valid) return { ok: false, error: codeResult.error, code: 'INVALID_CODE' };

    // 2. Find room
    const room = this.store.getRoom(codeResult.sanitized);
    if (!room) return { ok: false, error: 'Room not found', code: 'ROOM_NOT_FOUND' };

    // 3. Check if game already started
    if (room.phase !== 'WAITING' && room.phase !== 'FINISHED') {
      return { ok: false, error: 'Game already in progress', code: 'GAME_IN_PROGRESS' };
    }

    // 4. Check room capacity
    if (room.players.size >= GAME_CONSTANTS.MAX_PLAYERS) {
      return { ok: false, error: 'Room is full (max 8 players)', code: 'ROOM_FULL' };
    }

    // 5. Check duplicate name (case-insensitive)
    const lowerName = nameResult.sanitized.toLowerCase();
    for (const p of room.players.values()) {
      if (p.name.toLowerCase() === lowerName) {
        return { ok: false, error: 'Name already taken in this room', code: 'DUPLICATE_NAME' };
      }
    }

    // 6. Create player
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

    // 7. Associate socket
    socket.data.playerId = playerId;
    socket.data.roomCode = codeResult.sanitized;
    socket.data.sessionToken = sessionToken;
    socket.join(codeResult.sanitized);

    // 8. Broadcast state
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

    // Find player by session token
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

    // Reconnect
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
    if (!room) return { ok: true }; // Room already gone

    this.removePlayer(room, playerId, socket);
    return { ok: true };
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
      // In lobby/finished: mark disconnected with grace period, then remove
      player.connected = false;
      player.disconnectedAt = Date.now();
      player.socketId = null;

      setTimeout(() => {
        // Check if still disconnected after grace period
        if (!player.connected && room.players.has(playerId)) {
          this.removePlayer(room, playerId, socket);
        }
      }, GAME_CONSTANTS.LOBBY_DISCONNECT_GRACE_MS);
    } else {
      // In-game: mark disconnected, retain score
      player.connected = false;
      player.disconnectedAt = Date.now();
      player.socketId = null;
    }

    // Handle host disconnect
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

    // Transfer host if needed
    if (wasHost && room.players.size > 0) {
      this.transferHost(room, playerId);
    }

    // Clean up empty room
    if (room.players.size === 0) {
      this.scheduleCleanup(room);
    } else {
      this.broadcastState(room);
    }
  }

  /** Transfer host to the earliest-joined connected player */
  private transferHost(room: Room, excludeId: string): void {
    // Find earliest-joined connected player
    let newHost: PlayerState | undefined;
    for (const p of room.players.values()) {
      if (p.id !== excludeId && p.connected) {
        if (!newHost || p.joinedAt < newHost.joinedAt) {
          newHost = p;
        }
      }
    }

    if (newHost) {
      // Remove host from previous player
      for (const p of room.players.values()) {
        p.isHost = false;
      }
      newHost.isHost = true;

      // Notify
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

      // Show current answer details only during REVEAL, SCOREBOARD, or FINISHED
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
        // During question, only show whether they've answered (not what)
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
      totalQuestions: GAME_CONSTANTS.QUESTIONS_PER_GAME,
      selfId,
    };

    // Add question (without correctIndex) during QUESTION_ACTIVE
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

    // Add correct index only during REVEAL, SCOREBOARD, or FINISHED
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
