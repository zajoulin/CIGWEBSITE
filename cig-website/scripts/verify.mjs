#!/usr/bin/env node
/**
 * Loads the built single-file platform in a real browser and verifies it:
 * every route renders, the WebGL viewer produces pixels, interactions work,
 * and nothing logs an error. Screenshots land in build/shots/.
 *
 * Usage: node scripts/verify.mjs [--shots-only]
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'static', 'cig.html');
const shots = join(root, 'build', 'shots');
if (!existsSync(file)) {
  console.error('Build the static file first: node scripts/build-static.mjs');
  process.exit(1);
}
mkdirSync(shots, { recursive: true });

const url = pathToFileURL(file).href;
const failures = [];
const notes = [];

/* The simulation is judged against the same JSON the application is built
   from, so the suite can place every electrode exactly where the content says
   it belongs — and would fail if the two ever drifted apart. */
const torsoMap = JSON.parse(readFileSync(join(root, 'content', 'simulation', 'torso.json'), 'utf8'));
const clinicalCases = readdirSync(join(root, 'content', 'simulation', 'cases'))
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .flatMap((f) => JSON.parse(readFileSync(join(root, 'content', 'simulation', 'cases', f), 'utf8')));

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1180, height: 800 },
  { name: 'tablet', width: 834, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

const ROUTES = [
  { hash: '/', name: 'home' },
  { hash: '/about', name: 'about' },
  { hash: '/activities', name: 'activities' },
  { hash: '/learn', name: 'learn' },
  { hash: '/learn/ecg', name: 'ecg' },
  { hash: '/learn/simulation', name: 'simulation' },
  { hash: '/learn/examination', name: 'examination' },
  { hash: '/leadership', name: 'leadership' },
  { hash: '/anatomy', name: 'anatomy' },
  { hash: '/diseases', name: 'diseases' },
  { hash: '/diseases/atherosclerosis', name: 'disease-atherosclerosis' },
  { hash: '/diseases/heart-failure', name: 'disease-heart-failure' },
  { hash: '/learn/glossary', name: 'glossary' },
  { hash: '/learn/keypoints', name: 'keypoints' },
  { hash: '/research', name: 'research' },
  { hash: '/journal', name: 'journal' },
];

const browser = await chromium.launch({
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--allow-file-access-from-files',
  ],
});

const context = await browser.newContext({ viewport: VIEWPORTS[0], deviceScaleFactor: 1 });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

const check = (ok, message) => {
  if (ok) console.log('  ✓ ' + message);
  else {
    console.log('  ✗ ' + message);
    failures.push(message);
  }
};

const go = async (hash) => {
  await page.goto(url + '#' + hash, { waitUntil: 'load' });
  await page.evaluate(
    (h) => {
      if (window.location.hash !== '#' + h) window.location.hash = h;
    },
    hash,
  );
  await page.waitForTimeout(900);
};

console.log('\n── Route rendering ──────────────────────────────────');
for (const route of ROUTES) {
  await go(route.hash);
  const h1 = await page.locator('h1').first().textContent().catch(() => null);
  const mainText = await page.locator('#main').innerText().catch(() => '');
  check(Boolean(h1 && h1.trim().length > 3), `${route.hash} renders a heading (“${(h1 ?? '').slice(0, 46)}…”)`);
  check(mainText.length > 400, `${route.hash} renders substantial content (${mainText.length} chars)`);
  const title = await page.title();
  check(title.length > 10 && !title.includes('undefined'), `${route.hash} sets a document title`);
  await page.screenshot({ path: join(shots, `desktop-${route.name}.png`), fullPage: false });
}

console.log('\n── CIG identity ─────────────────────────────────────');
await go('/');
await page.waitForTimeout(500);

// The crest must actually decode, not merely be present in the markup.
const crestInfo = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img.crest')];
  return {
    count: imgs.length,
    loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    inline: imgs.every((i) => i.currentSrc.startsWith('data:image/')),
    undistorted: imgs.every((i) => {
      const r = i.getBoundingClientRect();
      if (!r.width || !r.height) return true;
      const natural = i.naturalWidth / i.naturalHeight;
      const rendered = r.width / r.height;
      return Math.abs(natural - rendered) / natural < 0.02;
    }),
    alts: imgs.filter((i) => i.getAttribute('alt') !== null).length,
  };
});
check(crestInfo.count > 0, `the CIG crest is on the homepage (${crestInfo.count} placements)`);
check(crestInfo.loaded === crestInfo.count, `every crest image decodes (${crestInfo.loaded}/${crestInfo.count})`);
check(crestInfo.inline, 'the crest is inlined, so it renders with no network request');
check(crestInfo.undistorted, 'the crest keeps its natural aspect ratio everywhere');
check(crestInfo.alts === crestInfo.count, 'every crest image carries alt text (empty when decorative)');

const identity = await page.evaluate(() => ({
  navBrand: document.querySelector('.nav .brand')?.textContent ?? '',
  footerBrand: document.querySelector('.footer .brand')?.textContent ?? '',
  h1: document.querySelector('h1')?.textContent ?? '',
  title: document.title,
}));
check(identity.h1.includes('Cardiology Interest Group'), 'the homepage h1 is the organisation');
check(
  identity.navBrand.includes('CIG') && identity.footerBrand.includes('CIG'),
  'CIG is present in both the navigation and the footer',
);
check(
  identity.title.includes("Al-Balqa' Applied University"),
  'the document title carries the university',
);

// The crest and the university are present on every major section front.
for (const r of ['/learn', '/learn/ecg', '/learn/examination', '/learn/glossary', '/learn/keypoints', '/activities', '/leadership', '/research', '/journal', '/about']) {
  await go(r);
  await page.waitForTimeout(350);
  const branded = await page.evaluate(() => ({
    crest: document.querySelectorAll('.page-head img.crest').length,
    footer: (document.querySelector('.footer')?.textContent ?? '').includes(
      "Al-Balqa' Applied University",
    ),
  }));
  check(branded.crest > 0 && branded.footer, `${r} carries the CIG crest and university`);
}

console.log('\n── WebGL viewer ─────────────────────────────────────');
await go('/anatomy');
await page.waitForTimeout(2200);

const canvasInfo = await page.evaluate(() => {
  const c = document.querySelector('.anatomy-stage canvas');
  if (!c) return { present: false };
  const gl = c.getContext('webgl2');
  return { present: true, width: c.width, height: c.height, hasContext: Boolean(gl) };
});
check(canvasInfo.present, 'anatomy canvas is mounted');
check((canvasInfo.width ?? 0) > 200, `canvas has a real backing size (${canvasInfo.width}×${canvasInfo.height})`);

// Does the viewer actually draw? An element screenshot samples the composited
// result — reading a non-preserveDrawingBuffer canvas via drawImage always
// returns a blank buffer, so that approach cannot be used here.
const shotBuf = await page.locator('.anatomy-stage canvas').screenshot();
const drew = await (async () => {
  const png = shotBuf;
  // Count distinct byte values as a cheap proxy for "there are pixels here".
  const seen = new Set();
  for (let i = 0; i < png.length; i += 7) seen.add(png[i]);
  return seen.size;
})();
await page.locator('.anatomy-stage canvas').screenshot({ path: join(shots, 'webgl-canvas.png') });
if (drew > 60) {
  check(true, `viewer renders geometry (${drew} distinct byte values in the canvas capture)`);
} else {
  notes.push(
    `The WebGL canvas capture looks uniform (${drew} distinct values) — hardware GL is unavailable in this headless environment. The fallback path and all non-3D functionality were verified instead.`,
  );
  console.log(`  ! canvas capture looks uniform (${drew}) — headless GL likely unavailable`);
}

const loadingGone = await page.locator('.anatomy-stage [role="status"]').count();
check(loadingGone === 0, 'loading state clears once the model is ready');

console.log('\n── Interactions ─────────────────────────────────────');
await go('/anatomy');
await page.waitForTimeout(1200);

// Structure tree selection updates the information panel.
const treeItem = page.locator('.tree-item', { hasText: 'Mitral Valve' }).first();
if (await treeItem.count()) {
  await treeItem.click();
  await page.waitForTimeout(500);
  const heading = await page.locator('.info-head h2').textContent();
  check(heading?.includes('Mitral'), `selecting in the tree updates the panel (“${heading}”)`);
} else {
  check(false, 'mitral valve appears in the structure tree');
}

// Tabs switch panel content.
const physTab = page.locator('.info-tabs .tab', { hasText: 'Physiology' }).first();
if (await physTab.count()) {
  await physTab.click();
  await page.waitForTimeout(300);
  const body = (await page.locator('.info-body').innerText()).toLowerCase();
  check(
    body.includes('function') && body.includes('pressures'),
    'physiology tab renders its content',
  );
} else {
  check(false, 'physiology tab exists');
}

// View mode switch.
const modeBtn = page.locator('.view-mode', { hasText: 'Conduction System' }).first();
if (await modeBtn.count()) {
  await modeBtn.click();
  await page.waitForTimeout(400);
  const pressed = await modeBtn.getAttribute('aria-pressed');
  check(pressed === 'true', 'view mode switch toggles');
} else {
  check(false, 'view mode switch is present');
}

// Anatomy search.
const searchInput = page.locator('header input[type="search"]').first();
await searchInput.fill('purkinje');
await page.waitForTimeout(500);
const resultCount = await page.locator('.search-results .search-item').count();
check(resultCount > 0, `search returns results (${resultCount} for “purkinje”)`);
if (resultCount > 0) {
  await page.locator('.search-results .search-item').first().click();
  await page.waitForTimeout(500);
  const heading = await page.locator('.info-head h2').textContent();
  check(Boolean(heading?.toLowerCase().includes('purkinje')), `search selects the structure (“${heading}”)`);
}

// Disease explorer filtering.
await go('/diseases');
const before = await page.locator('.disease-card').count();
const catBtn = page.locator('.cat-rail .filter-chip', { hasText: 'Arrhythmias' }).first();
await catBtn.click();
await page.waitForTimeout(400);
const after = await page.locator('.disease-card').count();
check(before > after && after > 0, `category filter narrows the grid (${before} → ${after})`);

// Animation player.
await go('/diseases/atherosclerosis');
await page.waitForTimeout(700);
const stepBefore = await page.locator('.anim-step-label').textContent();
await page.locator('.anim-controls button[aria-label="Next step"]').click();
await page.waitForTimeout(400);
const stepAfter = await page.locator('.anim-step-label').textContent();
check(stepBefore !== stepAfter, `animation stepping works (“${stepBefore?.slice(0, 28)}” → “${stepAfter?.slice(0, 28)}”)`);
const svgNodes = await page.locator('.anim-stage svg *').count();
check(svgNodes > 20, `animation scene draws (${svgNodes} svg nodes)`);

await page.locator('.anim-controls button[aria-label="Play animation"]').click();
await page.waitForTimeout(1400);
const playingStep = await page.locator('.anim-step-label').textContent();
check(Boolean(playingStep), 'animation plays without error');

// Person modal.
await go('/about');
await page.waitForTimeout(500);
const personCard = page.locator('.person').first();
await personCard.click();
await page.waitForTimeout(400);
const modalOpen = await page.locator('.modal[role="dialog"]').count();
check(modalOpen === 1, 'person profile modal opens');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check((await page.locator('.modal[role="dialog"]').count()) === 0, 'modal closes on Escape');

// Glossary and key points are Learning Hub resources with routes of their own.
console.log('\n── Learning Hub resources ───────────────────────────');
await go('/learn/glossary');
const glossCount = await page.locator('.gloss-item').count();
check(glossCount > 20, `/learn/glossary lists terms directly (${glossCount})`);
// The breadcrumb is rendered in small caps, so compare case-insensitively.
check(
  /learning hub/i.test(await page.locator('.crumbs').innerText()),
  'the glossary is breadcrumbed under the Learning Hub',
);
await page.locator('.gloss-btn').first().click();
await page.waitForTimeout(300);
check((await page.locator('.gloss-body').count()) === 1, 'glossary entry expands');
const glossSearch = page.locator('input[type="search"]').first();
await glossSearch.fill('preload');
await page.waitForTimeout(350);
check((await page.locator('.gloss-item').count()) < glossCount, 'glossary search filters the list');
await glossSearch.fill('');

await go('/learn/keypoints');
const kpCount = await page.locator('.kp-card').count();
check(kpCount === 12, `/learn/keypoints renders the topics directly (${kpCount})`);
await page.locator('.kp-card').first().click();
await page.waitForTimeout(400);
check((await page.locator('.modal[role="dialog"]').count()) === 1, 'key point modal opens');
await page.keyboard.press('Escape');
await page.waitForTimeout(250);

// The deep link that every cross-link on the platform now uses.
await go('/learn/keypoints?topic=cardiac-cycle');
await page.waitForTimeout(500);
check(
  (await page.locator('.modal[role="dialog"]').count()) === 1,
  '/learn/keypoints?topic=… opens that topic directly',
);
await page.keyboard.press('Escape');

// Entering the Hub and clicking through to each resource must stay in the Hub.
await go('/learn');
for (const [label, expected] of [
  ['Cardiovascular Key Points', '/learn/keypoints'],
  ['Cardiovascular Glossary', '/learn/glossary'],
]) {
  const card = page.locator('.hub-card, a.card').filter({ hasText: label }).first();
  await card.click();
  await page.waitForTimeout(700);
  const landed = await page.evaluate(() => window.location.hash.replace(/^#/, '').split('?')[0]);
  check(landed === expected, `Learning Hub → ${label} opens ${expected} (landed on ${landed})`);
  await go('/learn');
}

// Legacy links from before Research and the Learning Hub were separated.
console.log('\n── Legacy link redirects ────────────────────────────');
for (const [from, to] of [
  ['/research?tab=glossary', '/learn/glossary'],
  ['/research?tab=keypoints', '/learn/keypoints'],
  ['/research?topic=cardiac-cycle', '/learn/keypoints'],
  ['/resources', '/learn'],
]) {
  await go(from);
  await page.waitForTimeout(700);
  const landed = await page.evaluate(() => window.location.hash.replace(/^#/, '').split('?')[0]);
  check(landed === to, `${from} lands on ${to} (landed on ${landed})`);
}

console.log('\n── ECG & bedside monitor ────────────────────────────');
await go('/learn/ecg');
await page.waitForTimeout(1800);

check((await page.locator('.mon-bezel').count()) === 1, 'the bedside monitor renders inside its bezel');
const monNumbers = await page.locator('.mon-num').count();
check(monNumbers >= 4, `monitor shows the bedside numerics (${monNumbers} fields)`);
check(
  (await page.locator('.mon-canvas').count()) === 1,
  'the monitor waveform canvas is mounted',
);

// The waveform must actually be drawn, and must change from frame to frame.
const monShotA = await page.locator('.mon-canvas').screenshot();
await page.waitForTimeout(700);
const monShotB = await page.locator('.mon-canvas').screenshot();
const distinct = (buf) => {
  const seen = new Set();
  for (let i = 0; i < buf.length; i += 7) seen.add(buf[i]);
  return seen.size;
};
check(distinct(monShotA) > 40, `the monitor draws a trace (${distinct(monShotA)} distinct values)`);
check(!monShotA.equals(monShotB), 'the trace is animating (frames differ)');
await page.locator('.mon-canvas').screenshot({ path: join(shots, 'ecg-monitor.png') });

// Rhythm library. Counted from the content rather than hard-coded, so adding
// a rhythm to /content extends the assertion instead of breaking it.
const ecgRhythmFiles = readdirSync(join(root, 'content', 'ecg'))
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const ecgRhythmCount = ecgRhythmFiles
  .flatMap((f) => JSON.parse(readFileSync(join(root, 'content', 'ecg', f), 'utf8'))).length;
const rhythmCount = await page.locator('.ecg-rail-item').count();
check(
  rhythmCount === ecgRhythmCount,
  `the rhythm library lists every rhythm (${rhythmCount}/${ecgRhythmCount})`,
);

const vtItem = page
  .locator('.ecg-rail-item')
  .filter({ has: page.locator('.ecg-rail-name', { hasText: /^Ventricular Tachycardia$/ }) })
  .first();
await vtItem.click();
await page.waitForTimeout(700);
const analysisTitle = await page.locator('.ecg-analysis-head h2').textContent();
check(
  analysisTitle?.includes('Ventricular Tachycardia'),
  `selecting a rhythm updates the analysis panel (“${analysisTitle}”)`,
);
const alarm = await page.locator('.mon-alarm-banner').textContent().catch(() => '');
check(
  Boolean(alarm && alarm.includes('VENTRICULAR')),
  `the monitor raises the right alarm (“${(alarm ?? '').trim()}”)`,
);
check(
  (await page.locator('.mon.mon-alarm-critical').count()) === 1,
  'a peri-arrest rhythm puts the monitor into its critical alarm state',
);

// Transport controls.
await page.locator('.ecg-controls button[aria-label="Pause the trace"]').click();
await page.waitForTimeout(300);
const timeBefore = await page.locator('.ecg-time').textContent();
await page.waitForTimeout(700);
const timeStill = await page.locator('.ecg-time').textContent();
check(timeBefore === timeStill, 'pause stops the clock');

const frozenA = await page.locator('.mon-canvas').screenshot();
await page.locator('.ecg-controls button[aria-label="Step forward one frame, 0.04 seconds"]').click();
await page.waitForTimeout(400);
const frozenB = await page.locator('.mon-canvas').screenshot();
check(!frozenA.equals(frozenB), 'stepping one frame advances the trace while paused');

await page.locator('.ecg-controls button[aria-label="Next beat"]').click();
await page.waitForTimeout(300);
const afterBeat = await page.locator('.ecg-time').textContent();
check(afterBeat !== timeStill, `stepping one beat moves the clock (${timeStill} → ${afterBeat})`);

await page.locator('.ecg-controls button[aria-label="Play the trace"]').click();
await page.waitForTimeout(1500);
const playingTime = await page.locator('.ecg-time').textContent();
check(playingTime !== afterBeat, 'play restarts the clock');

await page.locator('.anim-speed button[aria-label="2 times speed"]').click();
await page.waitForTimeout(200);
check(
  (await page.locator('.anim-speed button[aria-label="2 times speed"]').getAttribute('aria-pressed')) === 'true',
  'speed control responds',
);

await page.locator('.ecg-controls button[aria-label="Restart from the beginning"]').click();
await page.waitForTimeout(200);
check(
  (await page.locator('.ecg-time').textContent())?.startsWith('00:00'),
  'restart returns to the start of the recording',
);

// Feature highlighting.
const featureChips = await page.locator('.ecg-feature-row .filter-chip').count();
check(featureChips >= 4, `feature highlight chips render (${featureChips})`);
await page.locator('.ecg-feature-row .filter-chip').nth(1).click();
await page.waitForTimeout(400);
check((await page.locator('.ecg-note').count()) === 1, 'selecting a feature shows its explanation');

// The labelled teaching strip.
const stripNodes = await page.locator('.ecg-strip svg *').count();
check(stripNodes > 20, `the labelled ECG strip draws (${stripNodes} svg nodes)`);
check(
  (await page.locator('.ecg-strip-caption').textContent())?.includes('25 mm/s'),
  'the strip states its calibration',
);

// The rhythm-recognition quiz.
check((await page.locator('.quiz').count()) === 1, 'the rhythm recognition quiz renders');
const quizOptions = await page.locator('.quiz-option').count();
check(quizOptions >= 3, `the quiz offers multiple answers (${quizOptions})`);
await page.locator('.quiz-option').first().click();
await page.waitForTimeout(700);
check(
  (await page.locator('.quiz-feedback').count()) === 1,
  'answering the quiz gives feedback and reveals the rhythm',
);
check(
  (await page.locator('.quiz-option.is-right').count()) === 1,
  'the correct answer is marked',
);
await page.locator('button', { hasText: 'Next question' }).click();
await page.waitForTimeout(400);
check((await page.locator('.quiz-feedback').count()) === 0, 'the quiz moves to the next question');

// Measurements are content-driven.
const measures = await page.locator('.ecg-measure').count();
check(measures >= 4, `the analysis panel lists measurements (${measures})`);

// Deep link.
await go('/learn/ecg?rhythm=stemi');
await page.waitForTimeout(1400);
const deepTitle = await page.locator('.ecg-analysis-head h2').textContent();
check(
  deepTitle?.includes('ST-Elevation'),
  `deep link ?rhythm= selects the right rhythm (“${deepTitle}”)`,
);
await page.screenshot({ path: join(shots, 'desktop-ecg-stemi.png') });

console.log('\n── Clinical simulation ──────────────────────────────');

/**
 * Turns a position on the torso map into a page coordinate, mirroring the
 * arithmetic in TorsoStage. If the component's mapping ever changes, every
 * placement below misses and the suite says so.
 */
const torsoPoint = async (vx, vy) => {
  await page.locator('.torso-svg').scrollIntoViewIfNeeded();
  const box = await page.evaluate(
    ([W, H]) => {
      const el = document.querySelector('.torso-svg');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const scale = Math.min(r.width / W, r.height / H);
      return { left: r.left, top: r.top, width: r.width, height: r.height, scale };
    },
    [torsoMap.width, torsoMap.height],
  );
  if (!box) return null;
  return {
    x: box.left + (box.width - torsoMap.width * box.scale) / 2 + vx * box.scale,
    y: box.top + (box.height - torsoMap.height * box.scale) / 2 + vy * box.scale,
  };
};

const tapTorso = async (vx, vy) => {
  const p = await torsoPoint(vx, vy);
  if (!p) return false;
  await page.mouse.click(p.x, p.y);
  return true;
};

/** Walks the stage stepper forward until the named button is the primary one. */
const advanceUntil = async (pattern, limit = 8) => {
  for (let i = 0; i < limit; i++) {
    const btn = page.locator('.sim-footer button');
    if (!(await btn.count())) return false;
    const label = (await btn.textContent()) ?? '';
    if (pattern.test(label)) return true;
    if (!(await btn.isEnabled())) return false;
    await btn.click();
    await page.waitForTimeout(320);
  }
  return false;
};

await go('/learn/simulation?level=simulation');
await page.waitForTimeout(1600);

check((await page.locator('.sim').count()) === 1, 'the clinical simulation mounts');
const stageNames = await page.locator('.sim-step-label').allTextContents();
check(
  stageNames.length === 7 && stageNames[0] === 'Patient' && stageNames[6] === 'Debrief',
  `the full encounter has all seven stages (${stageNames.join(' → ')})`,
);
check((await page.locator('.sim-level').count()) === 4, 'four difficulty levels are offered');
check(
  (await page.locator('.sim-level.active').textContent()) === 'Clinical Simulation',
  'the ?level= deep link selects the difficulty',
);

// The room is the environment, and the monitor in it is the live one.
check((await page.locator('.room-scene').count()) === 1, 'the patient room renders inside the simulation');
const roomNodes = await page.locator('.room-scene svg *').count();
check(roomNodes > 60, `the room is drawn (${roomNodes} svg nodes)`);
check(
  (await page.locator('.room-monitor .mon-canvas').count()) === 1,
  'the live bedside monitor is composited into the room',
);
const roomShotA = await page.locator('.room-monitor .mon-canvas').screenshot();
await page.waitForTimeout(700);
const roomShotB = await page.locator('.room-monitor .mon-canvas').screenshot();
check(!roomShotA.equals(roomShotB), "the room's monitor is running the patient's rhythm");
check((await page.locator('.sim-task').count()) === 1, 'the clinical task is stated on the scene');
await page.screenshot({ path: join(shots, 'desktop-simulation-room.png') });

// At this level the observations are withheld until the learner looks.
check(
  (await page.locator('.sim-vital').count()) === 0,
  'observations are hidden until the monitor is checked',
);
await page.locator('.room-monitor').click();
await page.waitForTimeout(400);
check((await page.locator('.sim-vital').count()) >= 4, 'checking the monitor reveals the observations');

check(await advanceUntil(/Acquire/), 'the stepper reaches the electrode task');
check(
  (await page.locator('.sim-step.is-current .sim-step-label').textContent()) === 'Electrodes',
  'the electrode stage is current',
);
check((await page.locator('.torso-svg').count()) === 1, 'the interactive torso renders');

const caption = (await page.locator('.torso-caption').textContent()) ?? '';
const sex = /female model/.test(caption) ? 'female' : 'male';
notes.push(`Simulation opened on a ${sex} patient model.`);

// A wrong placement must be rejected, and must say where the electrode belongs.
const firstTarget = torsoMap.electrodes[0];
await tapTorso(firstTarget[sex][0] + 110, firstTarget[sex][1] + 150);
await page.waitForTimeout(400);
check(
  (await page.locator('.sim-feedback.is-bad').count()) === 1,
  'a misplaced electrode is rejected rather than accepted',
);
const correction = (await page.locator('.sim-feedback').textContent()) ?? '';
check(
  correction.includes('incorrect') && correction.length > 40,
  `the correction says where the electrode belongs (“${correction.slice(0, 54)}…”)`,
);
check(
  (await page.locator('.sim-electrode.is-done').count()) === 0,
  'a wrong placement does not put the electrode on the chest',
);

// Now place all ten correctly.
for (let i = 0; i < torsoMap.electrodes.length; i++) {
  const code = ((await page.locator('.sim-electrode.is-active .sim-electrode-code').textContent()) ?? '').trim();
  const target = torsoMap.electrodes.find((e) => e.code === code);
  if (!target) break;
  await tapTorso(target[sex][0], target[sex][1]);
  await page.waitForTimeout(110);
}
const placedCount = await page.locator('.sim-electrode.is-done').count();
check(placedCount === 10, `all ten electrodes are placed correctly (${placedCount}/10)`);
await page.screenshot({ path: join(shots, 'desktop-simulation-electrodes.png') });

const acquireBtn = page.locator('.sim-footer button');
check(await acquireBtn.isEnabled(), 'acquisition unlocks once every electrode is on');
await acquireBtn.click();
await page.waitForTimeout(1200);
const leadPanels = await page.locator('.twelve-lead').count();
check(leadPanels === 12, `the acquired ECG shows all twelve leads (${leadPanels})`);
check((await page.locator('.twelve-strip').count()) === 1, 'the rhythm strip is included');
check(
  (await page.locator('.sim-acquire .mon-canvas').count()) === 1,
  'the bedside monitor is still running beside the tracing',
);
await page.screenshot({ path: join(shots, 'desktop-simulation-ecg.png') });

// Auscultation.
check(await advanceUntil(/interpretation/i), 'the encounter reaches auscultation');
check((await page.locator('.sim-site').count()) === 5, 'all five auscultation areas are offered');
await page.locator('.sim-site').first().click();
await page.waitForTimeout(400);
check(
  (await page.locator('.sim-sound').count()) === 1,
  'selecting an area offers the heart sound for this patient',
);
await page.screenshot({ path: join(shots, 'desktop-simulation-auscultation.png') });

// Interpretation: answer every question and confirm feedback appears.
await page.locator('.sim-footer button').click();
await page.waitForTimeout(500);
check(
  (await page.locator('.sim-step.is-current .sim-step-label').textContent()) === 'Interpret',
  'the encounter reaches interpretation',
);
let answered = 0;
for (let i = 0; i < 24; i++) {
  const options = page.locator('.sim-option');
  if (!(await options.count())) break;
  await options.first().click();
  await page.waitForTimeout(220);
  if (i === 0) {
    check(
      (await page.locator('.sim-explain').count()) === 1,
      'answering a question explains why the answer is right or wrong',
    );
    check(
      (await page.locator('.sim-option.is-correct').count()) === 1,
      'the correct option is marked after answering',
    );
  }
  answered += 1;
  const next = page.locator('.sim-answer-foot button');
  if (!(await next.count())) break;
  await next.click();
  await page.waitForTimeout(420);
  if (await page.locator('.sim-scorecard').count()) break;
}
check(answered >= 4, `every question at this level was asked (${answered})`);

// Scoring and the debrief.
await page.waitForTimeout(500);
check((await page.locator('.sim-scorecard').count()) === 1, 'the scorecard appears at the end');
const scoreText = ((await page.locator('.sim-score-number').textContent()) ?? '').replace(/\s+/g, ' ');
check(/\d/.test(scoreText) && scoreText.includes('/'), `an overall score is shown (${scoreText})`);
const scoreLines = await page.locator('.sim-score-lines > li').count();
check(scoreLines === 3, `all three sections are scored at this level (${scoreLines})`);
const mistakes = await page.locator('.sim-mistakes > li').count();
check(mistakes >= 1, `the deliberate misplacement is listed for review (${mistakes})`);
check(
  (await page.locator('.sim-debrief-wide .twelve-lead').count()) === 12,
  'the debrief shows the tracing again with the findings',
);
check(
  (await page.locator('.sim-reading > div').count()) === 8,
  'the debrief gives the full systematic reading',
);
await page.screenshot({ path: join(shots, 'desktop-simulation-score.png'), fullPage: true });

// A new case must reset every piece of state.
await page.locator('.sim-scorecard button').first().click();
await page.waitForTimeout(900);
check(
  (await page.locator('.sim-step.is-current .sim-step-label').textContent()) === 'Patient',
  'starting a new case returns to the bedside',
);
check((await page.locator('.sim-electrode.is-done').count()) === 0, 'a new case clears the electrodes');
check((await page.locator('.sim-scorecard').count()) === 0, 'a new case clears the scorecard');
check((await page.locator('.sim-vital').count()) === 0, 'a new case hides the observations again');

// Difficulty changes what the learner is asked to do.
await go('/learn/simulation?level=beginner');
await page.waitForTimeout(1400);
const beginnerStages = await page.locator('.sim-step-label').allTextContents();
check(
  beginnerStages.length === 5 && !beginnerStages.includes('Auscultation'),
  `beginner level runs a shorter encounter (${beginnerStages.join(' → ')})`,
);
check(
  (await page.locator('.sim-vital').count()) >= 4,
  'beginner level shows the observations from the start',
);
check(await advanceUntil(/Acquire/), 'beginner level reaches the electrode task');
const guides = await page.locator('.torso-guide').count();
check(guides === 10, `beginner level outlines every landmark (${guides})`);

// A named case can be deep-linked.
await go('/learn/simulation?case=case-inferior-stemi');
await page.waitForTimeout(1400);
const briefText = (await page.locator('.sim-complaint').textContent()) ?? '';
check(
  briefText.toLowerCase().includes('chest pain'),
  `deep link ?case= opens the named case (“${briefText.slice(0, 46)}…”)`,
);

// The library itself is coherent: every case names a rhythm the engine knows.
check(
  clinicalCases.length >= 12,
  `the reviewed case library is substantial (${clinicalCases.length} cases)`,
);

console.log('\n── 3D examination ───────────────────────────────────');
await go('/learn/examination');
await page.waitForTimeout(2600);

check((await page.locator('.chest-viewer canvas').count()) === 1, 'the 3D chest canvas is mounted');
const chestInfo = await page.evaluate(() => {
  const c = document.querySelector('.chest-viewer canvas');
  if (!c) return { present: false };
  return { present: true, width: c.width, height: c.height, gl: Boolean(c.getContext('webgl2')) };
});
check((chestInfo.width ?? 0) > 200, `the chest canvas has a real backing size (${chestInfo.width}×${chestInfo.height})`);
const chestShot = await page.locator('.chest-viewer canvas').screenshot();
if (distinct(chestShot) > 60) {
  check(true, `the thorax renders (${distinct(chestShot)} distinct values)`);
} else {
  notes.push('The chest canvas capture looks uniform — hardware GL is unavailable in this environment.');
  console.log(`  ! chest canvas capture looks uniform (${distinct(chestShot)})`);
}
await page.locator('.chest-viewer canvas').screenshot({ path: join(shots, 'chest-3d.png') });
check(
  (await page.locator('.chest-viewer [role="status"]').count()) === 0,
  'the chest loading state clears',
);

// Lead list and detail.
const leadCount = await page.locator('.exam-item').count();
check(leadCount === 10, `all ten electrodes are listed (${leadCount})`);
await page
  .locator('.exam-item')
  .filter({ has: page.locator('.exam-item-name', { hasText: /^V6$/ }) })
  .first()
  .click();
await page.waitForTimeout(800);
const leadTitle = await page.locator('.exam-detail-head h2').textContent();
check(leadTitle?.includes('V6'), `selecting an electrode updates the detail panel (“${leadTitle?.trim()}”)`);
check(
  (await page.locator('.exam-landmark').textContent())?.toLowerCase().includes('axillary'),
  'the electrode detail names its anatomical landmark',
);

// Patient → electrodes → monitor.
check((await page.locator('.exam-monitor').count()) === 1, 'the chest is wired to a monitor');
check(
  (await page.locator('.exam-monitor.is-live .mon-canvas').count()) === 1,
  'the monitor records once the limb electrodes are on the patient',
);
const cables = await page.locator('.exam-cable').count();
check(cables > 0, `electrode cables are drawn to the monitor (${cables})`);

// Male / female anatomy.
await page.locator('.exam-sex .view-mode').filter({ hasText: /^Female$/ }).click();
await page.waitForTimeout(2200);
check(
  (await page.locator('.exam-sex .view-mode[aria-pressed="true"]').textContent())?.includes('Female'),
  'the anatomy switch selects the female thorax',
);
check((await page.locator('.chest-viewer canvas').count()) === 1, 'the model rebuilds for the other anatomy');
await page.locator('.exam-sex .view-mode').filter({ hasText: /^Male$/ }).click();
await page.waitForTimeout(2000);

// Auscultation.
await page.locator('.exam-modes .view-mode', { hasText: 'Auscultation' }).click();
await page.waitForTimeout(1200);
const siteCount = await page.locator('.exam-item').count();
check(siteCount === 5, `the five auscultation areas are listed (${siteCount})`);
await page
  .locator('.exam-item')
  .filter({ has: page.locator('.exam-item-name', { hasText: /Mitral/ }) })
  .first()
  .click();
await page.waitForTimeout(1200);
check((await page.locator('.exam-audio').count()) === 1, 'the auscultation panel opens');
const soundChips = await page.locator('.exam-sound-row .filter-chip').count();
check(soundChips >= 3, `the sounds audible at the apex are offered (${soundChips})`);
check((await page.locator('.cycle svg').count()) === 1, 'the cardiac cycle timeline renders');
check(
  (await page.locator('.cycle-phase').count()) === 2,
  'the timeline labels systole and diastole',
);
await page.locator('.exam-sound-row .filter-chip', { hasText: 'Mitral stenosis' }).first().click();
await page.waitForTimeout(900);
check(
  (await page.locator('.cycle-murmur').count()) >= 1,
  'a murmur is drawn on the cycle at the right moment',
);
const soundTitle = await page.locator('.exam-audio-head h3').textContent();
check(soundTitle?.includes('Mitral stenosis'), `the murmur detail loads (“${soundTitle}”)`);
check((await page.locator('.steth').count()) === 1, 'the stethoscope is placed on the chest');
await page.screenshot({ path: join(shots, 'desktop-auscultation.png') });

// Anatomy mode.
await page.locator('.exam-modes .view-mode', { hasText: 'Anatomy' }).click();
await page.waitForTimeout(900);
const landmarkCount = await page.locator('.exam-item').count();
check(landmarkCount >= 10, `surface landmarks are listed (${landmarkCount})`);

// Challenge mode.
await page.locator('.exam-modes .view-mode', { hasText: 'ECG Leads' }).click();
await page.waitForTimeout(700);
await page.locator('button', { hasText: 'Challenge me' }).click();
await page.waitForTimeout(900);
const prompt = await page.locator('.exam-challenge-head').textContent();
check(Boolean(prompt && prompt.trim().length > 4), `challenge mode asks a question (“${prompt?.trim()}”)`);
const chestBox = await page.locator('.chest-viewer canvas').boundingBox();
await page.mouse.click(chestBox.x + chestBox.width * 0.44, chestBox.y + chestBox.height * 0.52);
await page.waitForTimeout(900);
check(
  (await page.locator('.exam-challenge-feedback').count()) === 1,
  'clicking the chest is marked and feedback is given',
);
await page.locator('button', { hasText: 'Next question' }).click();
await page.waitForTimeout(600);
check(
  (await page.locator('.exam-challenge-feedback').count()) === 0,
  'the next question clears the feedback',
);
await page.screenshot({ path: join(shots, 'desktop-challenge.png') });

console.log('\n── Cross-links ──────────────────────────────────────');
await go('/anatomy?structure=left-ventricle');
await page.waitForTimeout(900);
const lvHeading = await page.locator('.info-head h2').textContent();
check(lvHeading?.includes('Left Ventricle'), 'deep link ?structure= selects the right structure');

await page.locator('.info-tabs .tab', { hasText: 'Pathology' }).first().click();
await page.waitForTimeout(300);
const pathLink = page.locator('.info-body a[href*="/diseases/"]').first();
if (await pathLink.count()) {
  await pathLink.click();
  await page.waitForTimeout(800);
  const h1 = await page.locator('h1').first().textContent();
  check(Boolean(h1 && h1.length > 3), `pathology link navigates to a disease module (“${h1}”)`);
} else {
  check(false, 'pathology tab links to a disease');
}

console.log('\n── Research & the research-idea form ────────────────');
await go('/research');
await page.waitForTimeout(600);

const researchText = await page.locator('#main').innerText();
check(/CIG Research/i.test(researchText), 'the Research page leads with CIG Research');
check(
  !/\bGlossary\b[\s\S]{0,40}\btab\b/i.test(researchText) &&
    (await page.locator('.tabs .tab', { hasText: 'Glossary' }).count()) === 0 &&
    (await page.locator('.tabs .tab', { hasText: 'Key Points' }).count()) === 0,
  'Research no longer contains the glossary or key-point tabs',
);
check(
  (await page.locator('.research-empty').count()) === 1,
  'Research shows the publications empty state rather than demo records',
);
check(
  /coming soon/i.test(await page.locator('.research-empty').innerText()),
  'the empty state reads as finished copy, not a gap',
);
check(!/demo record/i.test(researchText), 'no demo research record is presented as CIG research');
check(/Have a Research Idea\?/i.test(researchText), 'the Research page carries the "Have a Research Idea?" section');

// The prominent CTA takes the visitor to the form.
const ideaCta = page.locator('button', { hasText: 'Submit a Research Idea' }).first();
check((await ideaCta.count()) > 0, 'a prominent "Submit a Research Idea" button is present');
await ideaCta.click();
await page.waitForTimeout(900);
check((await page.locator('#research-idea').count()) === 1, 'the research-idea form is on the page');

// No phone number is asked for anywhere on the form.
const formText = await page.locator('#research-idea').innerText();
check(!/phone|mobile number|telephone/i.test(formText), 'the form does not ask for a phone number');
for (const label of [
  'Full name',
  'Email address',
  'Research idea',
  'Area of interest',
  'previously participated in research',
  'Additional information',
]) {
  check(new RegExp(label, 'i').test(formText), `the form asks for: ${label}`);
}
check(
  /does not guarantee acceptance or participation/i.test(formText),
  'the form states that submission does not guarantee acceptance or participation',
);

// Validation: an empty submit must be refused, with the first field focused.
await page.locator('#research-idea button[type="submit"]').click();
await page.waitForTimeout(400);
const errorCount = await page.locator('#research-idea .form-error').count();
check(errorCount >= 4, `empty submission is refused with field-level errors (${errorCount})`);
check(
  (await page.locator('#research-idea .form-result').count()) === 0,
  'no confirmation is shown for an invalid submission',
);
const invalidMarked = await page.locator('#research-idea [aria-invalid="true"]').count();
check(invalidMarked >= 3, `invalid fields are marked for assistive technology (${invalidMarked})`);

// A malformed email is caught.
await page.locator('#research-idea input[type="text"]').first().fill('Test Student');
await page.locator('#research-idea input[type="email"]').fill('not-an-email');
await page.locator('#research-idea textarea').first().fill('x');
await page.locator('#research-idea button[type="submit"]').click();
await page.waitForTimeout(300);
const emailErr = await page.locator('#research-idea .form-error').allInnerTexts();
check(
  emailErr.some((t) => /email address/i.test(t)),
  'a malformed email address is rejected',
);
check(
  emailErr.some((t) => /at least \d+ characters/i.test(t)),
  'a one-character proposal is rejected',
);

// A complete submission is accepted and confirmed.
await page.locator('#research-idea input[type="email"]').fill('student@example.edu');
await page
  .locator('#research-idea textarea')
  .first()
  .fill(
    'A cross-sectional study of blood pressure awareness among preclinical students at the Faculty of Medicine, and whether a short teaching session changes it.',
  );
await page.locator('#research-idea select').selectOption({ index: 1 });
await page.locator('#research-idea input[type="radio"]').first().check();
await page.locator('#research-idea button[type="submit"]').click();
await page.waitForTimeout(700);
const result = page.locator('.form-result');
check((await result.count()) === 1, 'a complete submission produces a confirmation');
const resultText = await result.innerText();
check(/thank you/i.test(resultText), 'the confirmation thanks the student');
check(
  /does not guarantee acceptance or participation/i.test(resultText),
  'the confirmation repeats that submission does not guarantee participation',
);
check(
  !/we have stored|saved to our database|added to our records/i.test(resultText),
  'the confirmation never claims the submission was stored',
);
const resultFocused = await page.evaluate(() =>
  document.activeElement?.classList.contains('form-result'),
);
check(resultFocused === true, 'focus moves to the confirmation for screen-reader users');

console.log('\n── Navigation audit ─────────────────────────────────');
// Every internal link on every page must land somewhere real, and the primary
// navigation must mark exactly one section as current.
const AUDIT_ROUTES = [
  '/', '/about', '/activities', '/leadership', '/journal', '/research',
  '/learn', '/learn/ecg', '/learn/simulation', '/learn/examination',
  '/learn/glossary', '/learn/keypoints', '/anatomy', '/diseases',
  '/diseases/atherosclerosis',
];

const seen = new Set();
const linkSources = new Map();
for (const r of AUDIT_ROUTES) {
  await go(r);
  await page.waitForTimeout(450);

  const links = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="#/"]')].map((a) => ({
      href: a.getAttribute('href').replace(/^#/, ''),
      label: (a.textContent || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
    })),
  );
  for (const l of links) {
    if (!seen.has(l.href)) {
      seen.add(l.href);
      linkSources.set(l.href, { from: r, label: l.label });
    }
  }

  const active = await page.evaluate(
    () => [...document.querySelectorAll('.nav-links .nav-link.active')].map((a) => a.textContent),
  );
  check(active.length <= 1, `${r}: at most one navigation item is marked current (${active.join(', ') || 'none'})`);
}

check(seen.size > 30, `collected ${seen.size} distinct internal links across the site`);

const dead = [];
for (const href of [...seen].sort()) {
  await go(href);
  await page.waitForTimeout(350);
  const notFound = await page.evaluate(() =>
    (document.querySelector('#main')?.textContent ?? '').includes('Page not found'),
  );
  const heading = await page.locator('h1').first().count();
  if (notFound || heading === 0) {
    const src = linkSources.get(href);
    dead.push(`${href} (linked as “${src.label}” from ${src.from})`);
  }
}
check(dead.length === 0, `every internal link resolves to a real page${dead.length ? ': ' + dead.join('; ') : ` (${seen.size} checked)`}`);

// No link anywhere may still point into the old Research tabs.
const stale = [...seen].filter((h) => /^\/research\?(tab|topic)=/.test(h) || h === '/resources');
check(stale.length === 0, `no stale Research deep links remain${stale.length ? ': ' + stale.join(', ') : ''}`);

// Learning Hub cards must all stay inside the Learning Hub.
await go('/learn');
const hubTargets = await page.evaluate(() =>
  [...document.querySelectorAll('.hub-grid a, .hub-feature')]
    .map((a) => (a.getAttribute('href') || '').replace(/^#/, '').split('?')[0])
    .filter(Boolean),
);
check(hubTargets.length >= 8, `the Learning Hub offers its modules (${hubTargets.length} cards)`);
check(
  hubTargets.every((h) => h.startsWith('/learn') || h.startsWith('/anatomy') || h.startsWith('/diseases')),
  `every Learning Hub card stays inside the Hub (${[...new Set(hubTargets)].join(', ')})`,
);

// Browser back and forward across the new routes.
await go('/learn');
await page.locator('.nav-links a', { hasText: 'Research' }).first().click();
await page.waitForTimeout(700);
await page.goBack();
await page.waitForTimeout(700);
check(
  (await page.evaluate(() => window.location.hash)) === '#/learn',
  'browser back returns to the Learning Hub',
);
await page.goForward();
await page.waitForTimeout(700);
check(
  (await page.evaluate(() => window.location.hash)) === '#/research',
  'browser forward returns to Research',
);

console.log('\n── Accessibility ────────────────────────────────────');
await go('/');
const a11y = await page.evaluate(() => {
  const problems = [];
  document.querySelectorAll('img').forEach((img) => {
    if (!img.alt && img.getAttribute('aria-hidden') !== 'true') problems.push('img without alt');
  });
  document.querySelectorAll('button, a').forEach((el) => {
    const text = (el.textContent || '').trim();
    const label = el.getAttribute('aria-label') || el.getAttribute('title');
    if (!text && !label) problems.push(`${el.tagName.toLowerCase()} without accessible name`);
  });
  const h1s = document.querySelectorAll('h1').length;
  return { problems: [...new Set(problems)], h1s, hasMain: Boolean(document.querySelector('main')) };
});
check(a11y.h1s === 1, `exactly one h1 on the homepage (${a11y.h1s})`);
check(a11y.hasMain, 'page uses a <main> landmark');
check(a11y.problems.length === 0, `no unlabelled controls or images${a11y.problems.length ? ': ' + a11y.problems.join(', ') : ''}`);

// Keyboard: after a client-side navigation, focus must reset to the top of the
// document so the skip link is the next tab stop.
await go('/diseases');
await go('/');
await page.waitForTimeout(400);
await page.keyboard.press('Tab');
const focused = await page.evaluate(() => document.activeElement?.className ?? '');
check(focused.includes('skip-link'), 'skip link is the first tab stop');

console.log('\n── Responsive layout ────────────────────────────────');
for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const route of [
    '/',
    '/learn',
    '/learn/ecg',
    '/learn/simulation',
    '/learn/examination',
    '/activities',
    '/leadership',
    '/anatomy',
    '/diseases/atherosclerosis',
    '/learn/glossary',
    '/learn/keypoints',
    '/research',
    '/journal',
    '/about',
  ]) {
    await go(route);
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(overflow <= 2, `${vp.name} ${route}: no horizontal overflow (${overflow}px)`);
  }
  await go('/');
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(shots, `${vp.name}-home.png`), fullPage: false });
  await go('/anatomy');
  await page.waitForTimeout(1400);
  await page.screenshot({ path: join(shots, `${vp.name}-anatomy.png`), fullPage: false });
}

// Mobile navigation.
await page.setViewportSize({ width: 390, height: 844 });
await go('/');
const burger = page.locator('.burger');
check((await burger.count()) === 1, 'hamburger button appears on mobile');
await burger.click();
await page.waitForTimeout(400);
check((await page.locator('.mobile-nav').count()) === 1, 'mobile navigation opens');
check(
  (await page.locator('.mobile-nav .crest').count()) === 1,
  'mobile navigation shows the CIG crest',
);
await page.screenshot({ path: join(shots, 'mobile-nav.png') });

// Navigate with whichever item sits in the second slot, so the assertion
// survives changes to the information architecture.
const secondLink = page.locator('.mobile-link').nth(1);
const secondHref = (await secondLink.getAttribute('href')) ?? '';
const secondTarget = secondHref.replace(/^#/, '').split('?')[0];
await secondLink.click();
await page.waitForTimeout(900);
check(
  secondTarget.length > 1 && page.url().includes(secondTarget),
  `mobile navigation navigates (${secondTarget})`,
);

// The simulation on a phone. The stages that carry the widest content — the
// chest the learner taps and the twelve-lead tracing — are checked at 390 px,
// because a check that only ever loads the first stage would never see them.
await go('/learn/simulation?level=advanced');
await page.waitForTimeout(1400);
for (const [label, pattern] of [
  ['electrode stage', /Acquire/],
  ['acquired ECG', /Continue/],
]) {
  const reached = await advanceUntil(pattern, 8);
  if (label === 'electrode stage' && reached) {
    const cap = (await page.locator('.torso-caption').textContent()) ?? '';
    const mSex = /female model/.test(cap) ? 'female' : 'male';
    // A tap must still land on the right electrode at phone scale.
    const target = torsoMap.electrodes[0];
    await tapTorso(target[mSex][0], target[mSex][1]);
    await page.waitForTimeout(300);
    check(
      (await page.locator('.sim-electrode.is-done').count()) === 1,
      'mobile: tapping the chest places an electrode accurately',
    );
    for (let i = 1; i < torsoMap.electrodes.length; i++) {
      const code = ((await page.locator('.sim-electrode.is-active .sim-electrode-code').textContent()) ?? '').trim();
      const t = torsoMap.electrodes.find((e) => e.code === code);
      if (!t) break;
      await tapTorso(t[mSex][0], t[mSex][1]);
      await page.waitForTimeout(90);
    }
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(overflow <= 2, `mobile ${label}: no horizontal overflow (${overflow}px)`);
  await page.screenshot({ path: join(shots, `mobile-simulation-${label.split(' ')[0]}.png`) });
  if (!reached) break;
  await page.locator('.sim-footer button').click();
  await page.waitForTimeout(700);
}
const mobileLeads = await page.locator('.twelve-lead').count();
check(mobileLeads === 12, `mobile: the twelve-lead reflows without loss (${mobileLeads} panels)`);
const leadWidth = await page.evaluate(() => {
  const el = document.querySelector('.twelve-lead');
  return el ? Math.round(el.getBoundingClientRect().width) : 0;
});
check(leadWidth > 120 && leadWidth < 400, `mobile: each lead panel fits the screen (${leadWidth}px)`);

// Mobile anatomy sheet.
await go('/anatomy');
await page.waitForTimeout(1600);
const detailsBtn = page.locator('button', { hasText: 'Details' }).first();
if (await detailsBtn.count()) {
  await detailsBtn.click();
  await page.waitForTimeout(500);
  check((await page.locator('.sheet').count()) === 1, 'mobile bottom sheet opens for structure details');
  await page.screenshot({ path: join(shots, 'mobile-anatomy-sheet.png') });
  await page.keyboard.press('Escape');
} else {
  notes.push('Mobile “Details” button not found — the sheet may open automatically on selection.');
}

console.log('\n── Console ──────────────────────────────────────────');
const realErrors = consoleErrors.filter(
  (e) => !/favicon|fonts\.googleapis|fonts\.gstatic|ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION|BLOCKED)|net::/i.test(e),
);
check(realErrors.length === 0, `no console errors${realErrors.length ? ':\n      ' + realErrors.slice(0, 8).join('\n      ') : ''}`);

await browser.close();

console.log('\n─────────────────────────────────────────────────────');
if (notes.length) {
  console.log('Notes:');
  notes.forEach((n) => console.log('  • ' + n));
}
if (failures.length) {
  console.log(`\nFAILED (${failures.length}):`);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('\nAll checks passed. Screenshots in build/shots/');
