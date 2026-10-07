import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../../shared/src/protocol.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
    },
  },
}));

// Health check
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Socket.IO setup
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: NODE_ENV === 'production' ? ORIGIN : '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e4, // 10KB max payload
  pingInterval: 10000,
  pingTimeout: 5000,
});

// In production, serve the built client
if (NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Socket connection handler (placeholder — rooms/game logic will be added in Milestone 1-2)
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Qlyvora] Server running on port ${PORT} (${NODE_ENV})`);
});

export { io, app, httpServer };
