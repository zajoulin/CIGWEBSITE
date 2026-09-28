/* ==========================================================================
   cardio3d — anatomical heart metadata
   --------------------------------------------------------------------------
   Names, colours and attribution for the Z-Anatomy heart. Kept apart from
   heart.ts so the sidebar and pages can use them without pulling in the
   ~1.4 MB of baked geometry, which loads only when a viewer starts.
   ========================================================================== */

import type { PartGroup } from './model';

export const HEART_ATTRIBUTION =
  '3D model: Z-Anatomy (CC BY-SA 4.0), derived from BodyParts3D © The Database Center for Life Science (CC BY-SA 2.1 JP). Conduction pathways are schematic.';

export interface PartStyle {
  color: string;
  groups: PartGroup[];
  opacity: number;
  order: number;
}

/** Colours and grouping per structure — the same scheme as the diagrammatic model. */
export const HEART_STYLE: Record<string, PartStyle> = {
  'heart.left_ventricle': { color: '#d84a63', groups: ['chambers'], opacity: 0.9, order: 1 },
  'heart.right_ventricle': { color: '#5b8fd6', groups: ['chambers'], opacity: 0.86, order: 2 },
  'heart.left_atrium': { color: '#d4576f', groups: ['chambers'], opacity: 0.86, order: 1 },
  'heart.right_atrium': { color: '#4f7fc4', groups: ['chambers'], opacity: 0.86, order: 2 },
  'heart.interventricular_septum': { color: '#9aa8bd', groups: ['septa'], opacity: 1, order: 0 },
  'heart.interatrial_septum': { color: '#8f9db2', groups: ['septa'], opacity: 1, order: 0 },
  'heart.tricuspid_valve': { color: '#a8dbe8', groups: ['valves'], opacity: 1, order: 0 },
  'heart.mitral_valve': { color: '#8fd0e0', groups: ['valves'], opacity: 1, order: 0 },
  'heart.pulmonary_valve': { color: '#7cc3d8', groups: ['valves'], opacity: 1, order: 0 },
  'heart.aortic_valve': { color: '#9ad8e6', groups: ['valves'], opacity: 1, order: 0 },
  'heart.coronary_arteries': { color: '#ef5350', groups: ['coronary', 'arteries'], opacity: 1, order: 0 },
  'heart.coronary_veins': { color: '#5f86c9', groups: ['coronary', 'veins'], opacity: 1, order: 0 },
  'vessels.aorta': { color: '#e05a70', groups: ['great-vessels', 'arteries'], opacity: 1, order: 0 },
  'vessels.pulmonary_trunk': { color: '#6d8fd6', groups: ['great-vessels', 'arteries'], opacity: 1, order: 0 },
  'vessels.pulmonary_arteries': { color: '#6d8fd6', groups: ['great-vessels', 'arteries'], opacity: 1, order: 0 },
  'vessels.pulmonary_veins': { color: '#e0697c', groups: ['great-vessels', 'veins'], opacity: 1, order: 0 },
  'vessels.svc': { color: '#4a70b0', groups: ['great-vessels', 'veins'], opacity: 1, order: 0 },
  'vessels.ivc': { color: '#4a70b0', groups: ['great-vessels', 'veins'], opacity: 1, order: 0 },
};

export const CONDUCTION_STYLE: Record<string, PartStyle> = {
  'heart.sa_node': { color: '#f2b544', groups: ['conduction'], opacity: 1, order: 0 },
  'heart.av_node': { color: '#f2b544', groups: ['conduction'], opacity: 1, order: 0 },
  'heart.bundle_of_his': { color: '#f5c65f', groups: ['conduction'], opacity: 1, order: 0 },
  'heart.purkinje_fibers': { color: '#f8d98a', groups: ['conduction'], opacity: 1, order: 0 },
};

/** Every meshName the anatomical model draws — structures outside it are text-only. */
export const HEART_MESH_NAMES: ReadonlySet<string> = new Set([
  ...Object.keys(HEART_STYLE),
  ...Object.keys(CONDUCTION_STYLE),
]);
