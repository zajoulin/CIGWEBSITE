#!/usr/bin/env node
/**
 * Static checks for the Next.js layer that can run without `npm install`
 * (the App Router's own types only exist once `next` is installed):
 *
 *   • every app/**.tsx parses as valid TypeScript/TSX
 *   • every relative import resolves to a file that exists
 *   • every route file exports a default component
 *   • client boundaries are declared where hooks are used
 *
 * `npm run typecheck` is still the authoritative check once dependencies are
 * installed; this catches the mistakes that would otherwise only surface then.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const files = [];

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'build') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(tsx?|mts)$/.test(entry)) files.push(full);
  }
};
walk(join(root, 'app'));

const CLIENT_HOOKS = /\buse(State|Effect|Ref|Memo|Callback|Context|Reducer|LayoutEffect|Id)\s*\(/;

for (const file of files) {
  const rel = file.slice(root.length + 1);
  const source = readFileSync(file, 'utf8');

  // 1. Does it parse?
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const diags = sf.parseDiagnostics ?? [];
  for (const d of diags) {
    const { line } = sf.getLineAndCharacterOfPosition(d.start ?? 0);
    problems.push(`${rel}:${line + 1} syntax: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
  }

  // 2. Do relative imports resolve?
  const importRe = /(?:from|import)\s+['"](\.{1,2}\/[^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(source))) {
    const request = m[1];
    const base = resolve(dirname(file), request);
    const candidates = [
      base,
      base + '.ts',
      base + '.tsx',
      base + '.json',
      base + '.css',
      join(base, 'index.ts'),
      join(base, 'index.tsx'),
    ];
    if (!candidates.some((c) => existsSync(c) && statSync(c).isFile())) {
      problems.push(`${rel}: unresolved import "${request}"`);
    }
  }

  // 3. Route files must default-export something.
  if (/\/(page|layout|not-found|error|loading)\.tsx$/.test(rel.replace(/\\/g, '/'))) {
    if (!/export\s+default\s/.test(source)) {
      problems.push(`${rel}: route file has no default export`);
    }
  }

  // 4. Hooks require a client boundary.
  if (CLIENT_HOOKS.test(source) && !source.startsWith("'use client'")) {
    problems.push(`${rel}: uses React hooks but is not marked 'use client'`);
  }
}

// 5. The client boundaries must re-export components that actually exist.
const boundaries = files.filter((f) => f.includes(`${'_client'}`));
for (const file of boundaries) {
  const rel = file.slice(root.length + 1);
  const source = readFileSync(file, 'utf8');
  const m = source.match(/export\s*\{\s*(\w+)\s+as\s+default\s*\}\s*from\s*['"]([^'"]+)['"]/);
  if (!m) {
    problems.push(`${rel}: expected an "export { X as default } from '…'" client boundary`);
    continue;
  }
  const [, exported, request] = m;
  const target = ['.ts', '.tsx'].map((e) => resolve(dirname(file), request + e)).find(existsSync);
  if (!target) {
    problems.push(`${rel}: cannot resolve ${request}`);
    continue;
  }
  const targetSrc = readFileSync(target, 'utf8');
  if (!new RegExp(`export\\s+const\\s+${exported}\\b`).test(targetSrc)) {
    problems.push(`${rel}: ${request} does not export ${exported}`);
  }
}

console.log(`checked ${files.length} files in app/`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  problems.forEach((p) => console.log('  ✗ ' + p));
  process.exit(1);
}
console.log('app/ layer looks structurally sound.');
