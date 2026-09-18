#!/usr/bin/env node
/**
 * Compiles every JSON file under /content into a single typed TypeScript module
 * at src/data/content.generated.ts.
 *
 * Why: it gives both build targets (the Next.js app and the single-file static
 * build) one dependency-free import, keeps `tsc` fast by embedding the data as a
 * string literal rather than a deeply-inferred object literal, and means the CIG
 * team only ever edits JSON.
 *
 * Run: npm run gen:content   (also run automatically by build:static)
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const outFile = join(root, 'src', 'data', 'content.generated.ts');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Read every non-underscore-prefixed .json in a directory and flatten the arrays. */
const readDirFlat = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort()
    .flatMap((f) => readJson(join(dir, f)));

const anatomyCats = readJson(join(contentDir, 'anatomy', '_categories.json'));

const bundle = {
  ecgCategories: readJson(join(contentDir, 'ecg', '_categories.json')),
  ecgRhythms: readDirFlat(join(contentDir, 'ecg')),
  ecgLeads: readJson(join(contentDir, 'exam', 'leads.json')),
  auscultationSites: readJson(join(contentDir, 'exam', 'auscultation.json')),
  heartSounds: readJson(join(contentDir, 'exam', 'heart-sounds.json')),
  surfaceLandmarks: readJson(join(contentDir, 'exam', 'landmarks.json')),
  examChallenges: readJson(join(contentDir, 'exam', 'challenges.json')),
  simulationConfig: readJson(join(contentDir, 'simulation', 'config.json')),
  torsoMap: readJson(join(contentDir, 'simulation', 'torso.json')),
  simScoring: readJson(join(contentDir, 'simulation', 'scoring.json')),
  clinicalCases: readDirFlat(join(contentDir, 'simulation', 'cases')),
  org: readJson(join(contentDir, 'org.json')),
  people: readJson(join(contentDir, 'people.json')),
  teams: readJson(join(contentDir, 'teams.json')),
  references: readJson(join(contentDir, 'references.json')),
  anatomyGroups: anatomyCats.groups,
  anatomyCategories: anatomyCats.categories,
  structures: readDirFlat(join(contentDir, 'anatomy')),
  diseaseCategories: readJson(join(contentDir, 'diseases', '_categories.json')),
  diseases: readDirFlat(join(contentDir, 'diseases')),
  animations: readJson(join(contentDir, 'animations.json')),
  keyPoints: readJson(join(contentDir, 'keypoints.json')),
  glossary: readJson(join(contentDir, 'glossary.json')),
  research: readJson(join(contentDir, 'research.json')),
  researchConfig: readJson(join(contentDir, 'research-config.json')),
  journal: readJson(join(contentDir, 'journal.json')),
  hub: readJson(join(contentDir, 'hub.json')),
  events: readJson(join(contentDir, 'events.json')),
};

const json = JSON.stringify(bundle);

/* ------------------------------------------------------------------------ *
 * The official CIG crest is inlined as a data URI so that BOTH build targets
 * render it — including the dependency-free single-file build, which has no
 * server to fetch /brand/*.webp from. Sources live in public/brand.
 * ------------------------------------------------------------------------ */
const brandDir = join(root, 'public', 'brand');
const dataUri = (file, mime) =>
  `data:${mime};base64,${readFileSync(join(brandDir, file)).toString('base64')}`;

const brand = {
  lockup: dataUri('cig-lockup.webp', 'image/webp'),
  mark: dataUri('cig-mark.webp', 'image/webp'),
};

const brandFile = join(root, 'src', 'data', 'brand.generated.ts');
mkdirSync(dirname(brandFile), { recursive: true });
writeFileSync(
  brandFile,
  `/* eslint-disable */
/**
 * AUTO-GENERATED — DO NOT EDIT.
 * The official CIG crest, inlined from public/brand by scripts/gen-content.mjs
 * so that the Next.js app and the offline single-file build both display it.
 */

/** Full crest: university wordmark + shield. */
export const CIG_LOCKUP = ${JSON.stringify(brand.lockup)};

/** Shield only, for compact placements (navigation, footer, favicons). */
export const CIG_MARK = ${JSON.stringify(brand.mark)};
`,
);

const banner = `/* eslint-disable */
/**
 * AUTO-GENERATED — DO NOT EDIT.
 * Produced by scripts/gen-content.mjs from the JSON files in /content.
 * Edit the JSON, then run: npm run gen:content
 *
 * Generated: ${new Date().toISOString().slice(0, 10)}
 * Contains: ${bundle.structures.length} anatomical structures, ${bundle.diseases.length} diseases,
 * ${bundle.animations.length} animations, ${bundle.ecgRhythms.length} ECG rhythms,
 * ${bundle.heartSounds.length} heart sounds, ${bundle.clinicalCases.length} clinical simulation cases,
 * ${bundle.keyPoints.length} key-point topics,
 * ${bundle.glossary.length} glossary terms, ${bundle.people.length} people, ${bundle.research.length} research records.
 */
import type { ContentBundle } from '../lib/types-bundle';

export const rawContent = JSON.parse(
  ${JSON.stringify(json)}
) as ContentBundle;
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, banner);

const kb = (json.length / 1024).toFixed(0);
console.log(
  `gen-content: ${bundle.structures.length} structures, ${bundle.diseases.length} diseases, ` +
    `${bundle.keyPoints.length} key points, ${bundle.glossary.length} glossary, ` +
    `${bundle.ecgRhythms.length} ECG rhythms, ${bundle.ecgLeads.length} leads, ` +
    `${bundle.auscultationSites.length} auscultation sites, ${bundle.heartSounds.length} heart sounds, ` +
    `${bundle.clinicalCases.length} clinical cases, ` +
    `${bundle.people.length} people → src/data/content.generated.ts (${kb} KB)`,
);

if (!existsSync(outFile)) {
  console.error('gen-content: failed to write output');
  process.exit(1);
}
