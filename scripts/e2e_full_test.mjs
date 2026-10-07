import { chromium } from 'playwright';
import path from 'node:path';

async function runFullE2ETest() {
  console.log('🚀 Starting Full Feature 2-Player E2E Test...');
  const browser = await chromium.launch();

  // Create two isolated browser contexts (representing Player A and Player B)
  const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const contextB = await browser.newContext({ viewport: { width: 390, height: 844 } }); // mobile view for player B

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // 1. Player A opens welcome and creates room
  console.log('👉 Step 1: Player A creating room...');
  await pageA.goto('http://localhost:5173/');
  await pageA.click('button:has-text("Create Game")');
  await pageA.fill('input#name', 'CaptainFast');
  await pageA.click('button[type="submit"]');

  // Wait for lobby to render with room code
  await pageA.waitForSelector('.lobby-code');
  const roomCode = (await pageA.textContent('.lobby-code'))?.trim();
  console.log(`✅ Room Created with Code: ${roomCode}`);
  await pageA.screenshot({ path: path.resolve('docs/evidence/e2e_01_playerA_lobby.png') });

  // 2. Player B joins using the room code
  console.log('👉 Step 2: Player B joining room...');
  await pageB.goto('http://localhost:5173/join');
  await pageB.fill('input#code', roomCode);
  await pageB.fill('input#join-name', 'QuickSilver');
  await pageB.click('button[type="submit"]');

  // Verify Player B enters lobby and both see each other
  await pageB.waitForSelector('.lobby-code');
  await pageA.waitForSelector('li.player-item:has-text("QuickSilver")');
  await pageB.waitForSelector('li.player-item:has-text("CaptainFast")');
  console.log('✅ Both players synchronized in lobby!');
  await pageA.screenshot({ path: path.resolve('docs/evidence/e2e_02_both_in_lobby.png') });

  // 3. Player A starts the game
  console.log('👉 Step 3: Starting game...');
  const startBtn = await pageA.waitForSelector('button:has-text("Start Game")');
  await startBtn.click();

  // 4. Verify Countdown
  console.log('👉 Step 4: Verifying 3-2-1 countdown on both devices...');
  await pageA.waitForSelector('.countdown-number');
  await pageB.waitForSelector('.countdown-number');
  console.log('✅ Countdown verified!');
  await pageA.screenshot({ path: path.resolve('docs/evidence/e2e_03_countdown.png') });

  // 5. Question 1 Active Phase
  console.log('👉 Step 5: Question active phase...');
  await pageA.waitForSelector('.question-box');
  await pageB.waitForSelector('.question-box');

  const qTextA = await pageA.textContent('.question-title');
  const qTextB = await pageB.textContent('.question-title');
  if (qTextA !== qTextB) {
    throw new Error(`Question mismatch! A: "${qTextA}" vs B: "${qTextB}"`);
  }
  console.log(`✅ Question matched: "${qTextA?.slice(0, 30)}..."`);

  // Player A selects option A immediately (speed bonus test)
  await pageA.click('.option-btn:nth-child(1)');
  await pageA.waitForSelector('.status-locked');
  console.log('✅ Player A locked answer.');

  // Player B selects option B slightly later
  await pageB.waitForTimeout(1000);
  await pageB.click('.option-btn:nth-child(2)');
  console.log('✅ Player B clicked option B.');

  // 6. Early-Close & Reveal Phase
  console.log('👉 Step 6: Verifying early-close and Reveal phase...');
  await pageA.waitForSelector('.reveal-feedback', { timeout: 6000 });
  await pageB.waitForSelector('.reveal-feedback', { timeout: 6000 });
  console.log('✅ Reveal phase reached immediately after all players answered!');
  await pageA.screenshot({ path: path.resolve('docs/evidence/e2e_04_reveal_phase.png') });

  // 7. Scoreboard Phase
  console.log('👉 Step 7: Verifying Scoreboard phase...');
  await pageA.waitForSelector('.scoreboard-title', { timeout: 6000 });
  await pageB.waitForSelector('.scoreboard-title', { timeout: 6000 });
  const scoreRowsA = await pageA.$$('.leaderboard-item');
  console.log(`✅ Scoreboard verified with ${scoreRowsA.length} players!`);
  await pageA.screenshot({ path: path.resolve('docs/evidence/e2e_05_scoreboard.png') });

  // 8. Test In-Game Reconnect / Refresh Resilience
  console.log('👉 Step 8: Testing mid-game refresh resilience on Player B...');
  await pageB.reload();
  await pageB.waitForSelector('.game-wrapper', { timeout: 6000 });
  console.log('✅ Player B refreshed and reconnected seamlessly into the active game session!');
  await pageB.screenshot({ path: path.resolve('docs/evidence/e2e_06_playerB_reconnected.png') });

  await browser.close();
  console.log('🎉 Full Feature E2E Testing Passed Completely!');
}

runFullE2ETest().catch((err) => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
