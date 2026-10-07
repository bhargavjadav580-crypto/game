import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client, Socket } from 'socket.io-client';
import { httpServer, io } from '../src/index.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/src/protocol.js';
import type { RoomSnapshot } from '../../shared/src/types.js';

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

describe('Layer 2: Realtime Protocol Integration (Multiplayer)', () => {
  let port: number;
  let serverUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      // If already listening, reuse or fetch address
      const addr = httpServer.address();
      if (addr && typeof addr === 'object') {
        port = addr.port;
        serverUrl = `http://localhost:${port}`;
        resolve();
      } else {
        httpServer.listen(0, () => {
          const a = httpServer.address() as any;
          port = a.port;
          serverUrl = `http://localhost:${port}`;
          resolve();
        });
      }
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  it('runs two-player lifecycle: create, join, start, submit answers, and reveal state', async () => {
    const client1: TestSocket = Client(serverUrl, { autoConnect: true });
    const client2: TestSocket = Client(serverUrl, { autoConnect: true });

    await Promise.all([
      new Promise<void>((res) => client1.on('connect', res)),
      new Promise<void>((res) => client2.on('connect', res)),
    ]);

    // 1. Host creates room
    const createRes = await new Promise<any>((resolve) => {
      client1.emit('room:create', { name: 'PlayerOne' }, resolve);
    });
    expect(createRes.ok).toBe(true);
    const roomCode = createRes.data.roomCode;

    // 2. Player 2 joins room
    const joinRes = await new Promise<any>((resolve) => {
      client2.emit('room:join', { code: roomCode, name: 'PlayerTwo' }, resolve);
    });
    expect(joinRes.ok).toBe(true);

    // 3. Start game
    let p1State: RoomSnapshot | null = null;
    let p2State: RoomSnapshot | null = null;

    client1.on('room:state', (s) => {
      p1State = s;
    });
    client2.on('room:state', (s) => {
      p2State = s;
    });

    const startRes = await new Promise<any>((resolve) => {
      client1.emit('game:start', resolve);
    });
    expect(startRes.ok).toBe(true);

    // Wait for transition to STARTING or QUESTION_ACTIVE
    await new Promise((resolve) => setTimeout(resolve, 3200));

    expect(p1State).not.toBeNull();
    expect(p1State!.phase).toBe('QUESTION_ACTIVE');
    expect(p1State!.currentQuestion).toBeDefined();

    // Verify privacy: client snapshot does not have correctIndex during QUESTION_ACTIVE
    expect(p1State!.correctIndex).toBeUndefined();
    expect(p2State!.correctIndex).toBeUndefined();

    // 4. Submit answers from both
    const qId = p1State!.currentQuestion!.id;
    const ans1 = await new Promise<any>((resolve) => {
      client1.emit('answer:submit', { questionId: qId, optionIndex: 0 }, resolve);
    });
    expect(ans1.ok).toBe(true);

    const ans2 = await new Promise<any>((resolve) => {
      client2.emit('answer:submit', { questionId: qId, optionIndex: 1 }, resolve);
    });
    expect(ans2.ok).toBe(true);

    // Early transition trigger: both players answered, so server moves immediately to REVEAL
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(p1State!.phase).toBe('REVEAL');
    expect(p1State!.correctIndex).toBeDefined();

    client1.disconnect();
    client2.disconnect();
  });
});
