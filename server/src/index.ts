import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../../shared/src/protocol.js';
import fs from 'node:fs';
import { InMemoryRoomStore } from './rooms/InMemoryRoomStore.js';
import { RoomManager } from './rooms/roomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

// Security
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    },
  } : false,
}));

// Socket.IO setup
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e4,
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Room management
const store = new InMemoryRoomStore();
const roomManager = new RoomManager(io, store);

// Health check
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), rooms: store.roomCount() });
});

// Serve the built client if available
const candidates = [
  path.join(process.cwd(), 'client/dist'),
  path.join(__dirname, '../../client/dist'),
  path.join(__dirname, '../client/dist'),
  path.resolve('client/dist'),
];
const clientDist = candidates.find(dir => fs.existsSync(path.join(dir, 'index.html'))) || candidates[0];

if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  console.log(`[Qlyvora] Serving static client from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.warn('[Qlyvora] Warning: No built client index.html found in candidates:', candidates);
  app.get('/', (_req, res) => {
    res.status(200).send('<h1>Qlyvora server is running</h1><p>Client build is loading...</p>');
  });
}

// Socket connection handler
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('room:create', (data, ack) => {
    try {
      const result = roomManager.handleCreate(socket, data);
      ack(result);
    } catch (err) {
      console.error('[room:create] Error:', err);
      ack({ ok: false, error: 'Server error', code: 'SERVER_ERROR' });
    }
  });

  socket.on('room:join', (data, ack) => {
    try {
      const result = roomManager.handleJoin(socket, data);
      ack(result);
    } catch (err) {
      console.error('[room:join] Error:', err);
      ack({ ok: false, error: 'Server error', code: 'SERVER_ERROR' });
    }
  });

  socket.on('room:rejoin', (data, ack) => {
    try {
      const result = roomManager.handleRejoin(socket, data);
      ack(result);
    } catch (err) {
      console.error('[room:rejoin] Error:', err);
      ack({ ok: false, error: 'Server error', code: 'SERVER_ERROR' });
    }
  });

  socket.on('room:leave', (ack) => {
    try {
      const result = roomManager.handleLeave(socket);
      ack(result);
    } catch (err) {
      console.error('[room:leave] Error:', err);
      ack({ ok: false, error: 'Server error', code: 'SERVER_ERROR' });
    }
  });

  socket.on('game:start', (ack) => {
    try {
      const result = roomManager.handleStartGame(socket);
      ack(result);
    } catch (err) {
      console.error('[game:start] Error:', err);
      ack({ ok: false, error: 'Server error', code: 'SERVER_ERROR' });
    }
  });

  socket.on('answer:submit', (data, ack) => {
    try {
      const result = roomManager.handleSubmitAnswer(socket, data);
      ack(result);
    } catch (err) {
      console.error('[answer:submit] Error:', err);
      ack({ ok: false, error: 'Server error', code: 'SERVER_ERROR' });
    }
  });

  socket.on('game:rematch', (ack) => {
    try {
      const result = roomManager.handleRematch(socket);
      ack(result);
    } catch (err) {
      console.error('[game:rematch] Error:', err);
      ack({ ok: false, error: 'Server error', code: 'SERVER_ERROR' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    roomManager.handleDisconnect(socket);
  });
});

if (NODE_ENV !== 'test') {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Qlyvora] Server running on port ${PORT} (${NODE_ENV})`);
  });
}

export { io, app, httpServer, roomManager, store };
