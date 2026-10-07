import { chromium } from 'playwright';
import path from 'node:path';

async function captureAfter() {
  const browser = await chromium.launch();

  const viewports = [
    { name: '1440', width: 1440, height: 900 },
    { name: '768', width: 768, height: 1024 },
    { name: '390', width: 390, height: 844 },
    { name: '320', width: 320, height: 568 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    // 1. Welcome Screen
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.resolve(`docs/evidence/after_welcome_${vp.name}.png`) });

    // 2. Create Game Screen
    await page.goto('http://localhost:5173/create');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.resolve(`docs/evidence/after_create_${vp.name}.png`) });

    // 3. Join Game Screen
    await page.goto('http://localhost:5173/join');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.resolve(`docs/evidence/after_join_${vp.name}.png`) });

    await page.close();
  }

  await browser.close();
  console.log('After screenshots across 320, 390, 768, and 1440px captured successfully!');
}

captureAfter().catch((err) => {
  console.error(err);
  process.exit(1);
});
