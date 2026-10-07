# Qlyvora — Test Report

## Unit Tests (Layer 1 — Vitest)

| # | Action | Expected | Actual | Pass/Fail | Evidence |
|---|--------|----------|--------|-----------|----------|
| 1 | Wrong answer scoring | 0 points regardless of elapsed time | 0 points | **PASS** | `server/test/core.test.ts` (14/14 passed) |
| 2 | Tier 1 bonus (≤ 1.0s) | 100 base + 50 bonus = 150 points | 150 points | **PASS** | `server/test/core.test.ts` |
| 3 | Tier 2 bonus (≤ 2.0s) | 100 base + 40 bonus = 140 points | 140 points | **PASS** | `server/test/core.test.ts` |
| 4 | Tier 3 bonus (≤ 3.0s) | 100 base + 30 bonus = 130 points | 130 points | **PASS** | `server/test/core.test.ts` |
| 5 | Tier 4 bonus (≤ 4.0s) | 100 base + 20 bonus = 120 points | 120 points | **PASS** | `server/test/core.test.ts` |
| 6 | Tier 5 bonus (≤ 5.0s) | 100 base + 10 bonus = 110 points | 110 points | **PASS** | `server/test/core.test.ts` |
| 7 | Base score (> 5.0s) | 100 points, 0 bonus | 100 points | **PASS** | `server/test/core.test.ts` |
| 8 | Ranking order | Score descending, then totalCorrect, then speed | Ordered correctly with ties handled | **PASS** | `server/test/core.test.ts` |
| 9 | Validation & sanitization | Invalid codes/names/options rejected | Rejected with human error code | **PASS** | `server/test/core.test.ts` |
| 10 | Question bank checks | ≥60 unique questions, 4 unique options each | 60 verified curated questions | **PASS** | `server/test/core.test.ts` |

## Integration Tests (Layer 2 — Realtime Sockets)

| # | Action | Expected | Actual | Pass/Fail | Evidence |
|---|--------|----------|--------|-----------|----------|
| 1 | Two-player lifecycle | Host creates room, Player 2 joins | Room created and joined with ACK | **PASS** | `server/test/integration.test.ts` |
| 2 | Host starts game | Transition to STARTING then QUESTION_ACTIVE | Synchronized transitions across both clients | **PASS** | `server/test/integration.test.ts` |
| 3 | Privacy validation | `correctIndex` NOT sent during active question | `correctIndex === undefined` | **PASS** | `server/test/integration.test.ts` |
| 4 | Answers & early-close | Both answer early, skip remaining timer to REVEAL | Moved to REVEAL in < 350ms with correctIndex included | **PASS** | `server/test/integration.test.ts` |

## Browser End-to-End Tests (Layer 3 — Multi-Browser Playwright)

| # | Scenario | Expected | Actual | Pass/Fail | Evidence |
|---|----------|----------|--------|-----------|----------|
| 1 | Room Creation & Code Generation | Host creates room, receives 5-char code | Code displayed in Lobby | **PASS** | `docs/evidence/e2e_01_playerA_lobby.png` |
| 2 | Multiplayer Join & Sync | Player B enters room code from separate mobile context | Both players visible in lobby in real-time | **PASS** | `docs/evidence/e2e_02_both_in_lobby.png` |
| 3 | Synchronized 3-2-1 Countdown | Host starts game; both screens show animated countdown | Countdown in sync on desktop and mobile | **PASS** | `docs/evidence/e2e_03_countdown.png` |
| 4 | Question Synchrony & Answer Locking | Both players receive identical question & options | Options locked on click with tactile 3D feedback | **PASS** | Console assertion + test logs |
| 5 | Early-Close & Reveal Transition | Timer immediately ends when both players answer | Skips remaining 8s timer straight to Reveal with correct answer badge | **PASS** | `docs/evidence/e2e_04_reveal_phase.png` |
| 6 | Live Scoreboard & Rank Computation | Scoreboard reflects speed bonus and accuracy | Player rankings and score points displayed | **PASS** | `docs/evidence/e2e_05_scoreboard.png` |
| 7 | Mid-game Reconnection & Refresh | Player B reloads browser tab during active game | Reconnected back into active room state using session token | **PASS** | `docs/evidence/e2e_06_playerB_reconnected.png` |
