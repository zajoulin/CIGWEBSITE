#!/usr/bin/env node
/**
 * Mobile responsiveness audit.
 * Loads static/cig.html at phone viewports and reports, per route:
 *   - horizontal document overflow (and which elements cause it)
 *   - elements wider than the viewport
 *   - interactive controls below the 44x44 touch target guideline
 *   - text that overflows / overlaps its container
 *   - console errors
 */
import { chromium, devices } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'file://' + join(root, 'static', 'cig.html');

const ROUTES = [
  '/', '/learn', '/learn/ecg', '/learn/simulation', '/learn/examination',
  '/learn/glossary', '/learn/keypoints', '/anatomy', '/diseases',
  '/diseases/myocardial-infarction', '/about', '/activities', '/leadership',
  '/journal', '/research',
];

const VIEWPORTS = process.env.VP
  ? JSON.parse(process.env.VP)
  : [
      { name: 'iphone-se-375', width: 375, height: 667 },
      { name: 'iphone-13-390', width: 390, height: 844 },
      { name: 'iphone-pm-430', width: 430, height: 932 },
    ];

const ONLY = process.env.ROUTES ? process.env.ROUTES.split(',') : ROUTES;

const probe = () => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const out = {
    scrollWidth: de.scrollWidth,
    clientWidth: vw,
    bodyScrollWidth: document.body.scrollWidth,
    overflowing: [],
    smallTargets: [],
    overlaps: [],
    tinyText: [],
  };

  const describe = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : '';
    const txt = (el.textContent || '').trim().slice(0, 40).replace(/\s+/g, ' ');
    return `${el.tagName.toLowerCase()}${id}${cls}${txt ? ` "${txt}"` : ''}`;
  };

  const all = Array.from(document.querySelectorAll('body *'));
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;

    // Geometry *inside* an <svg> is clipped by that element's own viewport,
    // and decoration that takes no pointer events and is clipped by an
    // ancestor cannot reach the user — neither is a page overflow. The <svg>
    // element itself is still measured.
    const insideSvg = el.namespaceURI === 'http://www.w3.org/2000/svg' && el.tagName.toLowerCase() !== 'svg';
    const clipped = (() => {
      let a = el.parentElement;
      while (a && a !== document.body) {
        const acs = getComputedStyle(a);
        if (acs.overflowX === 'hidden' || acs.overflowX === 'clip') return true;
        a = a.parentElement;
      }
      return false;
    })();
    const decorative = cs.pointerEvents === 'none' && !(el.textContent || '').trim() && clipped;

    // horizontal overflow past the viewport
    if (!insideSvg && !decorative && (r.right > vw + 1 || r.left < -1)) {
      // ignore elements inside a scrollable container (intentional carousels)
      let p = el.parentElement, inScroller = false;
      while (p && p !== document.body) {
        const pcs = getComputedStyle(p);
        if ((pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 1) {
          inScroller = true; break;
        }
        p = p.parentElement;
      }
      if (!inScroller) {
        out.overflowing.push({
          el: describe(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
        });
      }
    }

    // touch target size
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role');
    const interactive =
      tag === 'button' || tag === 'a' || tag === 'select' || tag === 'summary' ||
      (tag === 'input' && !['hidden'].includes(el.type)) ||
      role === 'button' || role === 'tab' || role === 'link' || role === 'checkbox' ||
      role === 'radio' || role === 'switch' || role === 'option' || role === 'menuitem';
    if (interactive && !el.disabled && !insideSvg) {
      // inline links inside running text are exempt
      const insideProse = tag === 'a' && el.closest('p,li,td,dd,figcaption');
      if (!insideProse && (r.width < 44 || r.height < 44) && r.width > 0) {
        out.smallTargets.push({ el: describe(el), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }

    // text overflowing its own box (clipped/overlapping)
    if (el.children.length === 0 && (el.textContent || '').trim()) {
      if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX === 'visible' && cs.whiteSpace !== 'nowrap') {
        out.overlaps.push({ el: describe(el), scrollW: el.scrollWidth, clientW: el.clientWidth });
      }
      const fs = parseFloat(cs.fontSize);
      if (fs && fs < 11) out.tinyText.push({ el: describe(el), fontSize: fs });
    }
  }

  const dedupe = (arr, key) => {
    const seen = new Set(); const out2 = [];
    for (const x of arr) { const k = x[key]; if (seen.has(k)) continue; seen.add(k); out2.push(x); }
    return out2;
  };
  out.overflowing = dedupe(out.overflowing, 'el').slice(0, 25);
  out.smallTargets = dedupe(out.smallTargets, 'el').slice(0, 25);
  out.overlaps = dedupe(out.overlaps, 'el').slice(0, 15);
  out.tinyText = dedupe(out.tinyText, 'el').slice(0, 15);
  return out;
};

const shotDir = join(root, 'build', 'audit');
mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch();
const report = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13'].userAgent,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));

  for (const route of ONLY) {
    errors.length = 0;
    await page.goto(FILE + '#' + route, { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    const res = await page.evaluate(probe);
    const shot = `${vp.name}${route.replace(/\//g, '_') || '_home'}.png`;
    if (process.env.SHOTS) {
      await page.screenshot({ path: join(shotDir, shot), fullPage: false });
    }
    report.push({ viewport: vp.name, route, ...res, errors: [...new Set(errors)].slice(0, 5) });
  }
  await ctx.close();
}
await browser.close();

writeFileSync(join(shotDir, 'report.json'), JSON.stringify(report, null, 2));

// terse console summary
let issues = 0;
for (const r of report) {
  const hOverflow = r.scrollWidth > r.clientWidth + 1;
  const n = r.overflowing.length + r.smallTargets.length + r.overlaps.length + r.errors.length + (hOverflow ? 1 : 0);
  if (!n) continue;
  issues += n;
  console.log(`\n## ${r.viewport} ${r.route}`);
  if (hOverflow) console.log(`  ! horizontal scroll: scrollWidth=${r.scrollWidth} vs ${r.clientWidth}`);
  for (const o of r.overflowing) console.log(`  overflow  ${o.el}  [${o.left}..${o.right}] w=${o.width}`);
  for (const t of r.smallTargets) console.log(`  tap<44    ${t.el}  ${t.w}x${t.h}`);
  for (const o of r.overlaps) console.log(`  textclip  ${o.el}  ${o.scrollW}>${o.clientW}`);
  for (const e of r.errors) console.log(`  console   ${e}`);
}
console.log(`\n=== ${issues} findings across ${report.length} page/viewport combos ===`);
