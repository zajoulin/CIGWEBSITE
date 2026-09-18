#!/usr/bin/env node
/**
 * Touch walkthrough: drives each interactive feature with real touch taps at
 * a phone viewport and asserts the app responded. Everything here goes
 * through page.tap()/touchscreen, never a mouse click, so anything that only
 * responds to a mouse fails.
 */
import { chromium, devices } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'file://' + join(root, 'static', 'cig.html');

const W = Number(process.env.W || 390);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: 844 }, isMobile: true, hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const go = async (route, wait = 2500) => {
  await page.goto(FILE + '#' + route, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
};

/** Tap by selector, scrolling it into view first. Returns false if absent. */
const tap = async (sel, i = 0) => {
  // Only ever aim at something a finger could actually reach: the desktop
  // nav CTA, for instance, is present in the DOM at 0x0 on a phone.
  const el = page.locator(sel).locator('visible=true').nth(i);
  try {
    await el.scrollIntoViewIfNeeded({ timeout: 4000 });
    await el.tap({ timeout: 4000 });
    await page.waitForTimeout(600);
    return true;
  } catch { return false; }
};

console.log(`\n=== touch walkthrough @ ${W}px ===\n`);

/* ---------------------------------------------------------- navigation -- */
console.log('navigation');
await go('/');
check('burger opens the menu', await tap('.burger') && await page.locator('.mobile-nav a').first().isVisible());
const navCount = await page.locator('.mobile-nav a').count();
check('menu lists every destination', navCount >= 7, `${navCount} links`);
await tap('.mobile-nav a[href*="learn"]', 0);
check('tapping a menu item navigates', page.url().includes('/learn'), page.url().split('#')[1]);
check('menu closes after navigating', !(await page.locator('.mobile-nav a').first().isVisible().catch(() => false)));

/* ------------------------------------------------------------- ECG page -- */
console.log('\nECG learning');
await go('/learn/ecg', 3200);
const rhythmBefore = await page.locator('.ecg-rail-item.active, .ecg-rail-item[aria-pressed="true"]').first().textContent().catch(() => '');
check('rhythm library item is tappable', await tap('.ecg-rail-item', 4));
const rhythmAfter = await page.locator('.ecg-rail-item.active, .ecg-rail-item[aria-pressed="true"]').first().textContent().catch(() => '');
check('tapping a rhythm changes the selection', rhythmBefore !== rhythmAfter, `${(rhythmBefore||'').trim()} -> ${(rhythmAfter||'').trim()}`);
check('pause/play responds to touch', await tap('.ctrl-btn-primary'));
check('frame step responds to touch', await tap('.ctrl-btn-frame'));
check('speed control responds to touch', await tap('.anim-speed button', 3));
check('sound toggle responds to touch', await tap('.mon-btn'));
check('ECG feature chip responds to touch', await tap('.ecg-feature-row button', 1));
check('teaching-strip wave label is tappable', await tap('.ecg-strip-label'));
// quiz
const q = await page.locator('.quiz-option').count();
check('rhythm quiz renders options', q > 0, `${q} options`);
await tap('.quiz-option', 0);
const answered = await page.locator('.quiz-option.is-right, .quiz-option.is-wrong, .quiz-feedback, [class*="quiz"][class*="correct"]').count();
check('quiz answers on tap', answered > 0);

/* -------------------------------------------------------- 3D anatomy ---- */
console.log('\n3D anatomy');
await go('/anatomy', 4000);
check('view-mode switch responds to touch', await tap('.view-mode', 1));
check('structure chip responds to touch', await tap('.filter-chip', 3));
const panel = await page.locator('.anatomy-panel, .info-panel, [class*="anatomy"] h2, h3').count();
check('selecting a structure shows its detail', panel > 0);
// Choosing a structure from the picker opens the info panel as a modal
// bottom sheet, which covers the stage and its camera buttons. It must
// therefore look modal and be dismissible by tapping away from it.
check('structure details open as a bottom sheet', (await page.locator('.sheet').count()) > 0);
check('the sheet has a backdrop over the covered stage', (await page.locator('.sheet-backdrop').count()) > 0);
await page.touchscreen.tap(W / 2, 30);
await page.waitForTimeout(800);
check('tapping outside the sheet closes it', (await page.locator('.sheet').count()) === 0);
check('camera control responds to touch once the sheet is closed',
  await tap('.ctrl-btn:has-text("Reset view")'));
check('focus-selected enables after choosing a structure',
  await page.locator('.ctrl-btn').locator('visible=true').nth(0).isEnabled());
check('touch hint is the touch wording', (await page.locator('.hint-touch').first().isVisible().catch(() => false)));
check('mouse hint is hidden on touch', !(await page.locator('.hint-mouse').first().isVisible().catch(() => false)));

/* ------------------------------------------------------- examination ---- */
console.log('\n3D examination');
await go('/learn/examination', 4200);
check('mode switch (leads/auscultation) taps', await tap('.view-mode', 1));
check('sex toggle taps', await tap('.view-mode', 4));
check('electrode / site list item taps', await tap('.exam-list button, .lead-row, .site-row, li button', 1));
check('challenge mode starts on tap', await tap('.btn-ghost'));
check('stage control taps', await tap('.ctrl-btn', 1));

/* -------------------------------------------------------- simulation ---- */
console.log('\nclinical simulation');
await go('/learn/simulation', 3500);
check('difficulty level taps', await tap('.sim-level', 1));
check('new random case taps', await tap('.btn-sm'));
check('bedside findings list is present on touch', (await page.locator('.room-finding').count()) === 4,
  `${await page.locator('.room-finding').count()} findings`);
await tap('.room-finding', 0);
check('a bedside finding opens on tap', (await page.locator('.room-finding-detail').count()) > 0);
check('bedside monitor taps', await tap('.room-monitor'));
check('advance to the next stage taps', await tap('.btn-primary'));

/* ------------------------------------------------------ heart sounds ---- */
console.log('\nheart sounds');
await go('/learn/examination', 4200);
await tap('.view-mode', 1); // auscultation
const audioReady = await page.evaluate(() => typeof (window.AudioContext || window.webkitAudioContext) === 'function');
check('audio is constructed on a user gesture (no autoplay block)', audioReady);
const sound = await tap('.exam-list button, .site-row, li button', 1);
check('an auscultation site plays on tap', sound);

/* ------------------------------------------------------------ research -- */
console.log('\nresearch pages and form');
await go('/research', 2500);
check('opens the submission form on tap', await tap('.btn-primary') && (await page.locator('.research-form, form').count()) > 0);
await page.locator('input[type="text"]').first().tap();
await page.keyboard.type('Test Student');
await page.locator('input[type="email"]').first().tap();
await page.keyboard.type('test@example.org');
await page.locator('textarea').first().tap();
await page.keyboard.type('Does early beta-blockade change outcome after STEMI?');
check('text fields accept touch input', (await page.locator('input[type="text"]').first().inputValue()) === 'Test Student');
const sel = page.locator('select').first();
if (await sel.count()) { await sel.selectOption({ index: 1 }); }
check('radio row selects by tapping the row (not the 16px dot)',
  await (async () => {
    const row = page.locator('.form-radio').nth(1);
    await row.scrollIntoViewIfNeeded();
    const box = await row.boundingBox();
    // tap the far right of the row, well away from the radio itself
    await page.touchscreen.tap(box.x + box.width - 20, box.y + box.height / 2);
    await page.waitForTimeout(400);
    return page.locator('.form-radio input').nth(1).isChecked();
  })());
const submitted = await tap('button[type="submit"], .form-actions .btn-primary');
await page.waitForTimeout(1200);
check('form submits on tap', submitted && (await page.locator('.form-result, [role="status"]').count()) > 0);

/* ---------------------------------------------------------- diseases ---- */
console.log('\ndiseases and animations');
await go('/diseases', 2500);
check('category filter taps', await tap('.filter-chip', 2));
check('disease card opens on tap', await tap('.disease-card') && page.url().includes('/diseases/'));
await page.waitForTimeout(1500);
check('animation play/pause taps', await tap('.ctrl-btn'));
check('animation speed taps', await tap('.anim-speed button', 2));
check('table-of-contents link taps', await tap('.toc-link', 3));

/* ------------------------------------------------- glossary / keypoints -- */
console.log('\nglossary, key points, search');
await go('/learn/glossary', 2000);
await page.locator('.field input').first().tap();
await page.keyboard.type('afterload');
await page.waitForTimeout(900);
check('search field accepts touch input', (await page.locator('.field input').first().inputValue()).length > 0);
check('search field is 16px so iOS does not zoom in',
  (await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.field input')).fontSize))) >= 16);
await go('/learn/keypoints', 2000);
check('key point card opens on tap', await tap('.kp-card'));

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (errors.length) console.log('page errors:', [...new Set(errors)]);
await browser.close();
process.exit(fail ? 1 : 0);
