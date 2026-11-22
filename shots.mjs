// Ember Court — screenshot + play-test driver (repo root, NOT under game/).
// Serves game/ with node serve.ts, then uses playwright-core with the cached
// Chromium to capture real renders of the game's own code and to play a real
// game by scripted clicks, checking state changes and console errors.
//   node shots.mjs            (screenshots only)
//   node shots.mjs --playtest (screenshots + scripted real game)
import { chromium } from '/tmp/pw/node_modules/playwright-core/index.mjs';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const doPlaytest = process.argv.includes('--playtest');

function startServer() {
  const proc = spawn('node', ['serve.ts', '--port', '8080'], { cwd: here, stdio: 'pipe' });
  return proc;
}

async function waitForServer(page, url, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await page.goto(url, { timeout: 2000, waitUntil: 'domcontentloaded' });
      if (res && res.ok()) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

const server = startServer();
let failures = 0;
try {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  const failedRequests = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('requestfailed', (req) => failedRequests.push(req.url()));
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('http://localhost:8080') && !url.startsWith('data:')) failedRequests.push(`external: ${url}`);
  });

  const up = await waitForServer(page, 'http://localhost:8080/?shot=title&seed=1');
  if (!up) { console.error('SERVER DID NOT START'); process.exitCode = 1; }
  else {
    mkdirSync(join(here, 'screenshots'), { recursive: true });
    for (const shot of shots) {
      await page.goto(`http://localhost:8080/${shot.query}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const path = join(here, 'screenshots', shot.name);
      await page.screenshot({ path, type: 'jpeg', quality: 82 });
      const size = statSync(path).size;
      console.log(`${shot.name}: ${size} bytes ${size <= 262144 ? 'OK' : 'TOO BIG'}`);
      if (size > 262144) failures += 1;
    }

    if (doPlaytest) {
      console.log('--- playtest: real game by scripted clicks ---');
      await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await page.click('#begin-btn');
      await page.waitForTimeout(400);
      const readState = () => page.evaluate(() => {
        const txt = document.body.innerText;
        const life = [...txt.matchAll(/(\d+) \/ 30/g)].map((m) => Number(m[1]));
        const hand = document.querySelectorAll('.hand .card').length;
        const log = document.querySelector('.log')?.innerText ?? '';
        return { life, hand, logTail: log.split('\n').slice(-2).join(' | ') };
      });
      const before = await readState();
      console.log('start:', JSON.stringify(before));
      // Play the first affordable card in hand.
      const played = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.hand .card')];
        const playable = cards.find((c) => !c.classList.contains('unplayable'));
        if (!playable) return null;
        playable.click();
        return playable.querySelector('.card-name')?.textContent;
      });
      console.log('selected card:', played);
      await page.waitForTimeout(200);
      await page.click('#play-btn');
      await page.waitForTimeout(400);
      const afterPlay = await readState();
      console.log('after play:', JSON.stringify(afterPlay));
      // Try a fuse: select two cards, press F.
      await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.hand .card')];
        if (cards[0]) cards[0].click();
        if (cards[1]) cards[1].click();
      });
      await page.waitForTimeout(200);
      await page.keyboard.press('f');
      await page.waitForTimeout(300);
      const afterFuse = await readState();
      console.log('after fuse attempt:', JSON.stringify(afterFuse));
      // End turn, let the AI play, confirm life totals move and turn advances.
      await page.click('#end-btn');
      await page.waitForTimeout(4500);
      const afterAi = await readState();
      console.log('after AI turn:', JSON.stringify(afterAi));
      const turnNow = await page.evaluate(() => document.querySelector('.turn-pill')?.textContent);
      console.log('turn pill now:', turnNow);
      const changed = JSON.stringify(before.life) !== JSON.stringify(afterAi.life) || before.hand !== afterAi.hand || turnNow !== 'Turn 1';
      console.log(changed ? 'PLAYTEST: state changed during real game ✓' : 'PLAYTEST: WARNING — no state change observed');
      if (!changed) failures += 1;
    }
    console.log('console errors:', errors.length ? errors : 'none');
    console.log('failed/external requests:', failedRequests.length ? failedRequests : 'none');
    if (errors.length || failedRequests.length) failures += 1;
    await browser.close();
  }
} finally {
  server.kill();
}
process.exitCode = failures ? 1 : 0;
