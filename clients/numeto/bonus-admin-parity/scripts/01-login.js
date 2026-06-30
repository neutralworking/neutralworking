import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { mkdir } from 'node:fs/promises';
import { systems } from '../config.js';

await mkdir('out/auth', { recursive: true });

const prompt = (msg) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(msg, (ans) => { rl.close(); resolve(ans); });
  });

for (const [key, sys] of Object.entries(systems)) {
  console.log(`\n[${key.toUpperCase()}] Opening ${sys.baseURL}`);
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(sys.baseURL);
  await prompt(`  Log in to ${key} (${sys.baseURL}), then press Enter here...`);
  await ctx.storageState({ path: sys.storageState });
  await browser.close();
  console.log(`  Saved -> ${sys.storageState}`);
}

console.log('\nDone. Run: npm run extract');
