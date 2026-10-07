import { chromium } from 'playwright';
import path from 'node:path';

async function capture() {
  const browser = await chromium.launch();

  // Desktop viewport (1440px)
  const pageDesk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pageDesk.goto('http://localhost:5173/');
  await pageDesk.waitForTimeout(1000);
  await pageDesk.screenshot({ path: path.resolve('docs/evidence/before_welcome_1440.png') });

  await pageDesk.goto('http://localhost:5173/create');
  await pageDesk.waitForTimeout(500);
  await pageDesk.screenshot({ path: path.resolve('docs/evidence/before_create_1440.png') });

  await pageDesk.goto('http://localhost:5173/join');
  await pageDesk.waitForTimeout(500);
  await pageDesk.screenshot({ path: path.resolve('docs/evidence/before_join_1440.png') });

  // Mobile viewport (390px)
  const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pageMobile.goto('http://localhost:5173/');
  await pageMobile.waitForTimeout(1000);
  await pageMobile.screenshot({ path: path.resolve('docs/evidence/before_welcome_390.png') });

  await pageMobile.goto('http://localhost:5173/create');
  await pageMobile.waitForTimeout(500);
  await pageMobile.screenshot({ path: path.resolve('docs/evidence/before_create_390.png') });

  await pageMobile.goto('http://localhost:5173/join');
  await pageMobile.waitForTimeout(500);
  await pageMobile.screenshot({ path: path.resolve('docs/evidence/before_join_390.png') });

  await browser.close();
  console.log('Before screenshots captured successfully!');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
