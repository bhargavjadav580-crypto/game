# Qlyvora — Architecture

## Overview

Qlyvora is a real-time multiplayer quiz game for 2–8 players. The architecture follows a **server-authoritative** model where all game logic, scoring, timing, and state transitions are controlled by the server. The client is an untrusted renderer.

## State Machine

```
WAITING → STARTING → QUESTION_ACTIVE → REVEAL → SCOREBOARD → QUESTION_ACTIVE (repeat ×10) → FINISHED
                                                                                  ↓
                                                                            STARTING (rematch)
```

### Phase Durations (server-controlled)
| Phase | Duration |
|-------|----------|
| STARTING (countdown) | 3 seconds |
| QUESTION_ACTIVE | 8 seconds (or until all connected players answer) |
| REVEAL | 3 seconds |
| SCOREBOARD | 3 seconds |

## Sync Strategy

- After every state change, the server emits a **full sanitized snapshot** with an incrementing `version` number.
- Clients ignore snapshots with versions ≤ their current version.
- Each snapshot includes `serverNow` for clock-offset calculation.
- Countdown timers are rendered from `endsAt` using the computed offset — clients never trust their own clock for logic.

## Scoring

- Correct answer: **100 base** + speed bonus
- Speed bonus: ≤1s → +50, ≤2s → +40, ≤3s → +30, ≤4s → +20, ≤5s → +10
- Max per question: **150 points**
- Ranking: total score → more correct answers → lower total answer time
- Tied players share the same rank

## Security

- All inputs validated server-side (names, codes, option indices)
- Rate limiting per socket and per IP
- Helmet with CSP headers
- Client never sets score, phase, correct answer, or host status
- No player receives another player's pending answer before REVEAL

## Key Interfaces

- `RoomStore` — abstraction over room storage (MVP: in-memory, future: Redis)
- `QuestionProvider` — abstraction over question source (MVP: static JSON, future: API/AI)
