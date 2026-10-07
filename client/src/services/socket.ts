import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/protocol';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Connect to the server — in dev, Vite proxy handles /socket.io
// In production, client and server are same origin
const socket: AppSocket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

export default socket;
