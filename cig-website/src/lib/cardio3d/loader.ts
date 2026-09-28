/* ==========================================================================
   cardio3d — model source abstraction
   --------------------------------------------------------------------------
   The viewer draws `ModelPart[]`. Where those parts come from is deliberately
   pluggable, so a properly licensed anatomical GLB/GLTF can replace the
   procedural model without touching the renderer, the controls, the search or
   the information panel.

   ── HOW TO DROP IN A LICENSED GLB ──────────────────────────────────────────
   1. Put the file at  public/models/cardiovascular.glb
   2. Name each mesh in the source file to match the `meshName` field in
      content/anatomy/*.json — for example:

          heart.left_ventricle      heart.mitral_valve
          heart.right_ventricle     vessels.aorta
          heart.left_atrium         vessels.pulmonary_trunk
          heart.sa_node             vessels.svc          …and so on.

      Any mesh whose name is not in the anatomy content is still rendered, it
      simply is not selectable from the sidebar.
   3. Set the source below to `{ kind: 'gltf', url: '/models/cardiovascular.glb' }`
      and implement `loadGltf` with a GLTF parser of your choice (three.js's
      GLTFLoader, or a standalone parser — the renderer only needs positions,
      normals and indices per mesh).
   4. Record the licence and required attribution in LICENSES.md and surface it
      in the viewer's attribution line.

   Candidate openly-licensed sources are listed in docs/3d-model-sourcing.md.
   Do not use a copyrighted medical model without the appropriate licence.
   ========================================================================== */

import { buildCardiovascularModel, type ModelPart } from './model';
import { HEART_ATTRIBUTION } from './heart-meta';
import type { SectionData } from './heart';

export type ModelSource =
  | { kind: 'procedural' }
  | { kind: 'anatomical' }
  | { kind: 'gltf'; url: string; attribution?: string };

/**
 * The source currently in use: the Z-Anatomy heart, baked by
 * scripts/bake-heart-model.mjs. Set to `{ kind: 'procedural' }` to go back to
 * the diagrammatic model.
 */
export const MODEL_SOURCE: ModelSource = { kind: 'anatomical' };

export interface LoadedModel {
  parts: ModelPart[];
  /** Attribution string to display beneath the viewer, if the licence requires it. */
  attribution: string | null;
  /** True when the model is the built-in diagrammatic one. */
  procedural: boolean;
  /** Cross-section plane and labels, when the model provides them. */
  section: SectionData | null;
}

/**
 * Loads the model for the viewer. Asynchronous by design so a future GLB path
 * can stream the file in without any caller changing.
 */
export const loadModel = async (source: ModelSource = MODEL_SOURCE): Promise<LoadedModel> => {
  if (source.kind === 'anatomical') {
    // Loaded on demand so the geometry stays out of the page's main bundle.
    const { buildAnatomicalHeart, heartSection } = await import('./heart');
    return {
      parts: buildAnatomicalHeart(),
      attribution: HEART_ATTRIBUTION,
      procedural: false,
      section: heartSection(),
    };
  }

  if (source.kind === 'procedural') {
    // Yield once so the loading state can paint before geometry generation.
    await new Promise((r) => setTimeout(r, 0));
    return {
      parts: buildCardiovascularModel(),
      attribution: null,
      procedural: true,
      section: null,
    };
  }

  throw new Error(
    'GLTF loading is not implemented yet. See the instructions at the top of ' +
      'src/lib/cardio3d/loader.ts, then implement the parser here.',
  );
};
