#!/usr/bin/env node
/**
 * Builds the entire CIG platform into ONE self-contained HTML file.
 *
 *   1. regenerate the content module from /content
 *   2. compile the TypeScript/TSX sources to CommonJS with `tsc`
 *   3. link every module — application code plus React — into a single IIFE
 *      with a tiny CommonJS registry (no bundler dependency)
 *   4. inline the stylesheet and write static/cig.html
 *
 * The result needs no server, no network and no build tooling to open, which
 * is what lets the same React codebase ship both as a Next.js app and as a
 * single page anyone can double-click.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'build', 'cjs');
const staticDir = join(root, 'static');

const log = (...args) => console.log('[build:static]', ...args);

/* ------------------------------------------------------------- 1 + 2 ---- */

log('generating content module…');
execFileSync(process.execPath, [join(root, 'scripts', 'gen-content.mjs')], { stdio: 'inherit' });

log('compiling TypeScript → CommonJS…');
try {
  execFileSync('npx', ['--no-install', 'tsc', '-p', 'tsconfig.bundle.json'], {
    cwd: root,
    stdio: 'inherit',
  });
} catch {
  console.error('[build:static] TypeScript compilation failed.');
  process.exit(1);
}

/* ----------------------------------------------------------------- 3 ---- */

/** Locate the globally-installed React packages used for the vendored runtime. */
const findVendorRoot = () => {
  const candidates = [
    join(root, 'node_modules'),
    '/home/claude/.npm-global/lib/node_modules',
    join(process.env.HOME ?? '', '.npm-global/lib/node_modules'),
  ];
  for (const c of candidates) {
    if (c && existsSync(join(c, 'react', 'package.json'))) return c;
  }
  throw new Error('Could not find a React installation to vendor into the bundle.');
};

const vendorRoot = findVendorRoot();
const reactVersion = JSON.parse(
  readFileSync(join(vendorRoot, 'react', 'package.json'), 'utf8'),
).version;

const VENDOR = {
  react: join(vendorRoot, 'react/cjs/react.production.js'),
  'react/jsx-runtime': join(vendorRoot, 'react/cjs/react-jsx-runtime.production.js'),
  'react-dom': join(vendorRoot, 'react-dom/cjs/react-dom.production.js'),
  'react-dom/client': join(vendorRoot, 'react-dom/cjs/react-dom-client.production.js'),
  scheduler: join(vendorRoot, 'react-dom/node_modules/scheduler/cjs/scheduler.production.js'),
};

for (const [name, file] of Object.entries(VENDOR)) {
  if (!existsSync(file)) throw new Error(`Vendored module missing: ${name} → ${file}`);
}

/** Every compiled .js file under build/cjs, keyed by extension-less relative id. */
const localModules = new Map();
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith('.js')) {
      const id = relative(outDir, full).replace(/\\/g, '/').replace(/\.js$/, '');
      localModules.set(id, readFileSync(full, 'utf8'));
    }
  }
};
walk(outDir);
log(`linking ${localModules.size} application modules + ${Object.keys(VENDOR).length} vendored`);

const ENTRY = 'static-entry';
if (!localModules.has(ENTRY)) {
  throw new Error(`Entry module ${ENTRY}.js not found in ${outDir}`);
}

/** Wraps a module body in the registry's function form. */
const defineModule = (id, source) =>
  `__def(${JSON.stringify(id)}, function (module, exports, require) {\n${source}\n});\n`;

let bundle = '';
for (const [name, file] of Object.entries(VENDOR)) {
  bundle += defineModule(name, readFileSync(file, 'utf8'));
}
for (const [id, source] of [...localModules.entries()].sort()) {
  bundle += defineModule(id, source);
}

const runtime = `
(function () {
  'use strict';
  var process = { env: { NODE_ENV: 'production' } };
  var __modules = {};
  var __cache = {};
  function __def(id, fn) { __modules[id] = fn; }

  function __normalize(path) {
    var parts = path.split('/');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '' || p === '.') continue;
      if (p === '..') { out.pop(); continue; }
      out.push(p);
    }
    return out.join('/');
  }

  function __resolve(from, request) {
    if (request.charAt(0) !== '.') return request;
    var base = from.indexOf('/') === -1 ? '' : from.slice(0, from.lastIndexOf('/'));
    var joined = __normalize((base ? base + '/' : '') + request);
    if (__modules[joined]) return joined;
    if (__modules[joined + '/index']) return joined + '/index';
    return joined;
  }

  function __require(from, request) {
    var id = __resolve(from, request);
    if (__cache[id]) return __cache[id].exports;
    var factory = __modules[id];
    if (!factory) {
      throw new Error('Module not found: ' + request + ' (resolved to ' + id + ') from ' + from);
    }
    var mod = { exports: {} };
    __cache[id] = mod;
    factory(mod, mod.exports, function (r) { return __require(id, r); });
    return mod.exports;
  }

${bundle}
  try {
    __require('', ${JSON.stringify(ENTRY)});
  } catch (err) {
    // Never leave a blank page: surface the failure in the document itself.
    var root = document.getElementById('cig-root');
    if (root) {
      root.innerHTML =
        '<div style="min-height:100dvh;display:grid;place-items:center;padding:32px;text-align:center">' +
        '<div style="max-width:52ch"><h1 style="font-size:22px;margin-bottom:12px">This page could not start</h1>' +
        '<p style="font-size:14px;color:#44587a;line-height:1.6">The application script failed to initialise in this browser. ' +
        'Reloading usually fixes it; if not, try a current version of Chrome, Firefox, Safari or Edge.</p>' +
        '<pre style="margin-top:16px;font-size:11px;color:#6a7d9c;white-space:pre-wrap;text-align:left">' +
        String(err && err.message ? err.message : err) + '</pre></div></div>';
    }
    throw err;
  }
})();
`;

/* ----------------------------------------------------------------- 4 ---- */

const cssFiles = ['tokens.css', 'base.css', 'components.css', 'modules.css', 'clinical.css', 'simulation.css', 'touch.css'];
const css = cssFiles
  .map((f) => readFileSync(join(root, 'src', 'styles', f), 'utf8'))
  .join('\n');

const org = JSON.parse(readFileSync(join(root, 'content', 'org.json'), 'utf8'));
const title = `${org.name} (${org.abbr}) — ${org.university.name}`;
const description = org.heroSub;

/* The favicon travels with the file, so the offline build is branded too. */
const favicon =
  'data:image/png;base64,' +
  readFileSync(join(root, 'public', 'brand', 'favicon-32.png')).toString('base64');

const html = `<title>${title}</title>
<meta charset="utf-8" />
<!-- Without this, phones lay the document out at 980px and scale it down: no
     mobile media query ever matches and every tap target shrinks with it. -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="description" content="${description.replace(/"/g, '&quot;')}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
<meta name="theme-color" content="#043464" />
<link rel="icon" type="image/png" sizes="32x32" href="${favicon}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
/>
<style>
${css}
</style>

<div id="cig-root"></div>

<noscript>
  <div style="max-width:70ch;margin:12vh auto;padding:0 24px;font-family:system-ui,sans-serif;color:#0a2440">
    <h1 style="font-size:28px;letter-spacing:-0.03em;margin-bottom:16px">${org.name} (${org.abbr}) — ${org.university.name}</h1>
    <p style="font-size:15px;line-height:1.7;color:#a9bad2">
      ${description}
    </p>
    <p style="margin-top:20px;font-size:14px;line-height:1.7;color:#6a7d9c">
      This platform's interactive anatomy, disease explorer and research database need JavaScript.
      Please enable it, or contact CIG for an accessible alternative.
    </p>
  </div>
</noscript>

<script>
${runtime}
</script>
`;

mkdirSync(staticDir, { recursive: true });
const outFile = join(staticDir, 'cig.html');
writeFileSync(outFile, html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
log(`wrote ${relative(root, outFile)} — ${kb} KB (React ${reactVersion} vendored)`);

if (Buffer.byteLength(html) > 15.5 * 1024 * 1024) {
  console.error('[build:static] Output exceeds the 16 MB artifact limit.');
  process.exit(1);
}
