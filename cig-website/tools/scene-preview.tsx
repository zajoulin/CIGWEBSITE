/* Development helper (not part of the app build).
   Renders every pathophysiology scene to standalone SVG files at a series of
   timeline positions, so the frames can be inspected without a browser.

   Usage:  NODE_PATH=/home/claude/.npm-global/lib/node_modules \
             npx tsx --tsconfig tsconfig.static.json tools/scene-preview.tsx <outDir> [sceneId...]
*/
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderScene, SCENE_VIEWBOX } from '../src/components/disease/scenes';
import type { SceneContext } from '../src/components/disease/sceneUtils';
import { animations } from '../src/lib/content';

const outDir = process.argv[2] ?? 'build/scene-preview';
const only = process.argv.slice(3);
mkdirSync(outDir, { recursive: true });

const FRAMES = 4;

for (const anim of animations) {
  if (only.length && !only.includes(anim.id)) continue;
  const n = anim.steps.length;
  for (let f = 0; f < FRAMES; f++) {
    const g = FRAMES === 1 ? 1 : (f + 0.8) / FRAMES;
    const step = Math.min(n - 1, Math.floor(g * n));
    const ctx: SceneContext = {
      g,
      step,
      t: g * n - step,
      n,
      clock: 1400 + f * 730,
      reduced: false,
    };
    const body = renderToStaticMarkup(renderScene(anim.scene, ctx) as never);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SCENE_VIEWBOX}" width="800" height="450">` +
      `<rect width="800" height="450" fill="#070b14"/>${body}</svg>`;
    writeFileSync(join(outDir, `${anim.id}-${f}.svg`), svg);
  }
  console.log(`rendered ${anim.id} (${n} steps)`);
}
