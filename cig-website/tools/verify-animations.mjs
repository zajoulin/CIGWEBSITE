/* Opens the built single-file app in a real browser, visits each disease that
   has an animation, plays it, and screenshots the player. Reports console
   errors. Usage: node tools/verify-animations.mjs [outDir] [id...] */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(join(root, 'static', 'cig.html')).href;
const out = process.argv[2] ?? join(root, 'build', 'anim-shots');
const only = process.argv.slice(3);
mkdirSync(out, { recursive: true });

const IDS = only.length ? only : JSON.parse(process.env.IDS ?? '[]');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)));

for (const id of IDS) {
  await page.goto(`${url}#/diseases/${id}`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const fig = page.locator('figure.anim-shell').first();
  if (!(await fig.count())) { errors.push(`${id}: no animation player`); continue; }
  // step to the middle and to the end, capturing each
  const next = page.getByRole('button', { name: 'Next step' });
  for (let i = 0; i < 3; i++) await next.click();
  await page.waitForTimeout(400);
  await fig.screenshot({ path: join(out, `${id}-mid.png`) });
  for (let i = 0; i < 6; i++) { if (await next.isEnabled()) await next.click(); }
  await page.waitForTimeout(400);
  await fig.screenshot({ path: join(out, `${id}-end.png`) });
}
console.log(errors.length ? 'CONSOLE ERRORS:\n' + [...new Set(errors)].join('\n') : 'no console errors');
await browser.close();
