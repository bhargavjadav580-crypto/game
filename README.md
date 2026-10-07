# Qlyvora — Think Fast. Play Together.

A real-time multiplayer quiz party game for 2–8 players in the browser. No installation required.

## Features

- **2–8 Players** — Play with friends on separate devices
- **Real-Time Multiplayer** — Synchronized questions, timers, and scores via WebSockets
- **No Installation** — Just open the URL and play
- **Server-Authoritative** — All scoring, timing, and game logic runs on the server
- **Mobile-First** — Designed for phones, tablets, laptops, and desktops

## Game Rules

1. A host creates a game and shares the room code
2. Players join with the code — no accounts needed
3. 10 questions per game, 4 options each, 8-second timer
4. Score: **100 base** for correct + speed bonus (up to **+50** for ≤1s)
5. Final ranking by: total score → correct answers → answer speed
6. **Play Again** draws new questions in the same room

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + Socket.IO |
| Styling | CSS Variables / CSS Modules |
| Monorepo | npm workspaces (`client/`, `server/`, `shared/`) |

## Architecture

- **Server is the single source of truth** — clients are untrusted renderers
- **State machine**: `WAITING → STARTING → QUESTION_ACTIVE → REVEAL → SCOREBOARD → FINISHED`
- **Versioned snapshots**: full state broadcast after every change; clients ignore stale versions
- **In-memory rooms** behind a `RoomStore` interface (swappable to Redis)

## Local Development

```bash
# Install dependencies
npm install

# Start both client and server
npm run dev:client   # Vite on http://localhost:5173
npm run dev:server   # Express+Socket.IO on http://localhost:3001

# Build for production
npm run build
```

## Project Structure

```
qlyvora/
├── shared/src/        # Shared types, protocol, constants
├── server/src/        # Express + Socket.IO server
│   ├── rooms/         # RoomStore abstraction
│   ├── game/          # State machine, scoring, ranking
│   ├── questions/     # QuestionProvider + question bank
│   └── security/      # Validation, rate limiting
├── client/src/        # React SPA
│   ├── pages/         # Route pages
│   ├── components/    # Reusable UI components
│   ├── styles/        # Theme tokens, button styles
│   └── services/      # Socket.IO client
├── e2e/               # Playwright E2E tests
├── scripts/           # Bot player integration tests
└── docs/              # Architecture, test reports, deployment
```

## Known Limitations

- **Single server instance** — no horizontal scaling without Redis adapter
- **In-memory state** — active games are lost if the server restarts
- **Free-tier hosting** — the server may sleep when idle (health check at `/healthz`)

## License

ISC
