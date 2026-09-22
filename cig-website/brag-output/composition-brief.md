# HyperFrames Composition Brief: CIG — Cardiovascular Learning Hub

## Objective
Create a cinematic, high-quality launch-style brag video for the CIG Cardiovascular Learning Hub that showcases the disease animations and interactive 3D anatomy as its centerpiece.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920×1080
- Duration: 22 seconds

## Source Material
- Project root: `/Users/aboodajoulin/Documents/GitHub/CIGWEBSITE/cig-website`
- Primary files read: `src/styles/tokens.css`, `src/components/disease/scenes.tsx`, `src/components/disease/DiseaseAnimationPlayer.tsx`, `src/components/anatomy/AnatomyStage.tsx`, `src/lib/cardio3d/model.ts`, `src/lib/cardio3d/renderer.ts`, `content/org.json`, `content/animations.json`
- Product name: CIG — Cardiology Interest Group
- Tagline / strongest claim: "The heart is not a diagram." (hook) → "27 animated pathophysiology modules" → "Built by students. For students."

## Creative Direction
- Tone preset: **cinematic**
- Creative direction: *medical-grade product reveal — peer-built but it ships with hospital-grade polish*
- Interpretation: Epic, slow reveals. Big dark navy canvases with glowing blue-crimson science visuals. Every scene holds long enough to feel authoritative. Typography is restrained and precise with IBM Plex Mono for data readouts. No hype language. Let the science speak.

## Visual Identity
- Background: `#03172c` (dark stage / navy-950) — the dark canvas used in `.stage` and for disease animations
- Text: `#ffffff` (white) and `rgba(140,180,230,0.9)` (the light label tone from SVG scenes)
- Accent: `#1063ad` (navy-500 / sky-interactive), `#c02a49` (crimson for disease/pathology moments)
- Display font: Inter (primary), IBM Plex Mono (monospace for data, labels, badges)
- Body font: Inter

## Storyboard
From `brag-output/brag-plan.md`:

### Scene 1 — Hook — 3s
Dark navy canvas with atherosclerosis SVG animation running. Large mono text: "The heart is not a diagram." Music fades in.

### Scene 2 — Disease Animation — 5s
Full SVG myocardial infarction or atherosclerosis scene with ECG inset showing ST elevation. Label callouts appear one by one. Badge: "DISEASE MODULES" → "27 animated pathophysiology modules"

### Scene 3 — 3D Anatomy Viewer — 4s
WebGL procedural heart model auto-rotating with structure highlight on left ventricle. Info panel slides in. Badge: "INTERACTIVE ANATOMY" → "24 selectable structures"

### Scene 4 — ECG Bedside Monitor — 4s
Bedside cardiac monitor showing AF rhythm with rate counter "ATRIAL RATE ≈ 450/min". Rhythm library badges appear. Badge: "ECG SIMULATOR" → "20 live rhythms. Sinus to VF."

### Scene 5 — Outro — 6s
CIG crest centered on dark navy. Three stat blocks appear one by one: "27 Disease Modules", "27 Animations", "24 Structures". Small sub-label: "Built by students. For students."

## Audio
- Audio role: cinematic support — building, confident bed underneath science in motion
- Audio arc: Music fades in under hook, builds through science scenes, bell cues land on anatomy discovery and crest reveal, fades out gracefully as stats hold
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` · 109.96 BPM · steady and clean
- Music treatment: Start 0s, fade in 0→0.35 over 1.5s, hold at 0.35, gentle fade to 0 over last 1.5s
- Music cue guidance: Preset available. Strong cues at 8.74s, 13.11s, 17.47s, 22.93s.
  - 8.74s → anatomy info panel + bell SFX (Scene 3)
  - 17.47s → CIG crest appearance + bell SFX (Scene 5)
  - 22.93s → "Built by students" sub-label (Scene 5)
- Audio-reactive treatment: subtle; use music RMS/bass to make the hero glow and disease canvas breathe — very slight vignette or glow pulse on the dark background. No waveform/equalizer visuals.
- SFX posture: minimal — 3-4 soft, precise cues. Polished restraint.
  - Scene 2 label callout → `interface/drop_001` (quiet, 0.35 volume)
  - Scene 3 info panel + structure highlight → `impactBell_heavy_000` at 8.74s (beat-locked)
  - Scene 4 rhythm badges → 4x `interface/drop_001` at low volume (0.30)
  - Scene 5 crest → `impactBell_heavy_004` at 17.47s (beat-locked)
- Restraint rule: No layered SFX. No more than one SFX per scene transition. Music never above 0.38.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render).

Requirements:
- Show at least one real UI, copy, or visual element from the source project (the disease animation SVG, the anatomy model structure, the ECG monitor readout)
- Keep all text readable in the final render
- Keep the video within 15-25 seconds (target 22s)
- Include the planned music/SFX layer (music on by default)
- Treat music cue metadata as optional timing hints. Major reveals may move toward nearby strong cues within ~0.15s.
- Use SFX to support motion and interaction: bell sounds for discovery/brand moments, drop sounds for sequential reveals
- Honor planned music treatment (fade-in/fade-out, volume posture)
- Use audio-reactive: subtle RMS-based glow on dark background elements
- Run `hyperframes check` before render — brag's single gate

## Implementation Notes

### Disease Animation Recreation
Recreate the atherosclerosis SVG scene as static reference:
- Vessel cross-section with plaque growing (from `scenes.tsx` Atherosclerosis scene)
- Use the same color palette: `wallDeep`, `wall`, `lumen`, `cap`, `necrotic`, `thrombus`, `platelet` colors from the scene
- Draw it as SVG with `viewBox="0 0 800 450"`
- Static "mid-animation" state showing plaque with some thrombus

### 3D Anatomy Representation
Since we cannot render actual WebGL in the composition, create a stylized representation:
- Colored geometric heart outline (schematic, not photorealistic)
- Label callouts matching the CIG anatomy terminology

### ECG Strip
- Draw as SVG path with the irregular AF waveform
- Show rate counter in monospace

### CIG Crest
- Simple representation of the crest or the CIG abbreviation with the university and faculty name

## Key Visual References from Source
1. **Colors**: `navy-950 (#03172c)`, `navy-500 (#1063ad)`, `crimson (#c02a49)`, label blue (`rgba(140,180,230,0.9)`)
2. **Typography**: Inter for body/headlines, IBM Plex Mono for data readouts and labels
3. **Layout**: Dark stage backgrounds with glowing SVG elements, info panels with monospace labels
4. **Motion**: Animated disease pathophysiology (SVG particles, plaque growth, ECG tracing), auto-rotating 3D model feel, ECG sweep