# Brag Plan: CIG — Cardiovascular Learning Hub

## What is this app?
A student-built cardiovascular education platform at Al-Balqa' Applied University that ships a real-time WebGL 3D anatomy viewer, 27 disease modules with medically-sequenced SVG pathophysiology animations, a 20-rhythm ECG simulator, a clinical simulation bedside, and a 3D thorax for auscultation and lead placement.

## The angle
This isn't a slide deck. It's a functioning cardiovascular teaching environment — built entirely by students. The hook is that it shows you the *science in motion*: atherosclerosis forming inside a vessel, atrial fibrillation breaking the rhythm, a heart failure ventricle visibly dilating. The brag shows those animations running, the 3D heart spinning, and the ECG strip going live — then lands on the brand: "Built by students. For students."

## Hook (first 2–3 seconds)
Cold open: a dark canvas. The atherosclerosis vessel SVG animation starts mid-motion — lipid particles flowing, plaque growing. Over it in large mono type: **"The heart is not a diagram."** — then slam cut to the full platform.

## Key moments (the middle)
1. **Disease animation in motion** — the atherosclerosis or myocardial infarction SVG scene runs live, with ST elevation rising on the ECG inset in the same panel. Label callouts fade in one by one.
2. **WebGL anatomy viewer** — the 3D procedural cardiac model auto-rotating. A structure highlights (left ventricle). A clean info callout fades in beside it: "24 anatomical structures. Selectable. Interactive."
3. **ECG bedside monitor** — a rhythm strip sweeps across the screen, showing the sinus → AF transition. The atrial rate counter reads "≈ 450 / min". Clean monospace label.

## Outro / punchline
CIG crest fades in on a dark navy stage. Underneath:
**Cardiology Interest Group**
*Faculty of Medicine · Al-Balqa' Applied University*
Then small: **"27 disease modules. 27 animations. Built by students."**
Fade to deep navy.

## User flow worth showing
Landing page → Learning Hub → Disease module (animation playing) → Anatomy viewer (3D rotating heart, structure selected) → ECG simulator (rhythm strip, rate shown). Three beats: *navigate → explore pathophysiology → interact with anatomy and ECG.*

## Tone
- Preset: **cinematic**
- Creative direction: *medical-grade product reveal — this is peer-built but it looks like it ships with a hospital*
- Interpretation: Epic, slow reveals. Big dark canvases with glowing blue-navy science. Every scene holds long enough to feel authoritative. Typography is restrained and precise. No hype language. Let the science speak.

## Format: landscape — 1920×1080
## Duration: 22 seconds

## Visual identity (from the project)
- Background: `#03172c` (dark stage / navy-950)
- Accent: `#1063ad` (navy-500 / sky-interactive)
- Text (primary): `#ffffff` and `rgba(140,180,230,0.9)` (the light label tone from the SVG scenes)
- Crimson accent: `#c02a49` (used only for disease/pathology moments — perfect for the animation scenes)
- Display font: Inter (with IBM Plex Mono for data readouts and labels)
- Body font: Inter
- Strongest visual element: The animated SVG scenes on the dark stage background — glowing blue vessels, red thrombus formation, pulsing heart outline. The WebGL viewer with its navy dark canvas and lit, colorful anatomical structures.

## Share copy (draft)
We built a cardiovascular teaching platform for medical students — real 3D anatomy, 27 disease animations, a live ECG simulator. Entirely student-made. Come learn the heart.

## Audio direction
- Role: cinematic support — a building, confident musical bed underneath science in motion
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` — steady and clean, 109.96 BPM
- Music treatment: Start at 0s, fade in from 0 to 0.35 over 1.5s, hold at 0.35 through the video, gentle fade to 0 over last 1.5s
- Music cue guidance: Preset available. Strong cues at 8.74s, 13.11s, 17.47s, 22.93s. Target major reveals near these. Beat grid ~0.55s intervals (109 BPM).
  - 8.74s → anatomy viewer reveal
  - 13.11s → ECG strip goes live
  - 17.47s → outro CIG crest slam
  - 22.93s → final stat line fades in
- Audio-reactive treatment: subtle; use music RMS/bass to make the hero glow and the disease animation canvas breathe — very slight vignette or glow pulse on the dark background. No waveform/equalizer visuals.
- SFX posture: minimal — 3-4 soft, precise cues. Polished restraint.
- Audio-coupled moments:
  - Disease animation canvas appearing → `impactSoft_medium_001` for the hard transition in
  - 3D anatomy viewer appearing / structure highlight → `impactBell_heavy_000` (the "discovery" moment)
  - ECG rhythm starting → `interface/drop_001` soft
  - CIG crest slam in outro → `impactBell_heavy_004`
- Restraint rule: No layered SFX. No more than one SFX per scene transition. Music never above 0.38. Keep it clinical, not celebratory.

---

## Storyboard

### Scene 1 — Hook: "The Heart Is Not a Diagram" — 3s
**On screen:** Full-bleed dark navy canvas (`#03172c`). The atherosclerosis SVG animation is running — rendered at ~60% of the canvas. Vessel cross-section visible, plaque growing, blood particles flowing. Faint blue grid lines behind it. The SVG scene glows blue-crimson.
**Text:** Large display mono text fades in from opacity 0 over 0.4s: `"The heart is not a diagram."` (white, 64px, IBM Plex Mono or Inter, light weight, centered). Holds for ~2s.
Sequential/interaction: Text fades in at ~0.6s; SVG animation is running behind it continuously
Audio intent: The music fades in. Immediately present but understated — sets tension.
Audio-coupled idea: Music fade-in starts at 0. No SFX here — let the science speak.
Music: steady build, cinematic
Transition mood: hard cut → Scene 2

### Scene 2 — Disease Animation Live — 5s
**On screen:** Dark stage. Full SVG animation canvas — the myocardial infarction or atherosclerosis scene. It's running at full speed. The inset ECG panel (bottom right) shows the Lead V3 strip with ST elevation developing. Label callouts appear one by one: "Fibrous cap", "Thrombus formation", "Downstream ischaemia".
**Text:** Top-left: small monospace badge `DISEASE MODULES` (dim, letterspace 0.1em). Then large: `"27 animated pathophysiology modules"` — slides up from below into view.
Sequential/interaction: Label callouts appear one by one (3 labels, ~1s apart on beat grid ~1.09s intervals from beats array). ECG strip sweeps continuously.
Audio intent: Music building, energetic. The scene has visual rhythm from the animation.
Audio-coupled idea: Each label callout subtly matched to `interface/drop_001` (very quiet, 0.35 volume)
Music: steady, building
Transition mood: dramatic crossfade (0.5s) → Scene 3

### Scene 3 — 3D Anatomy Viewer — 4s
**On screen:** Dark navy stage. The WebGL procedural heart model auto-rotating — warm lit, multiple colored structures visible (red chambers, blue vessels, gold conduction system). A structure highlight glows on the left ventricle. Beside the model, a clean panel slides in:
```
LEFT VENTRICLE
Pumps oxygenated blood into the aorta.
```
**Text:** Top right badge: `INTERACTIVE ANATOMY`. Below the panel: `"24 selectable structures"` in monospace.
Sequential/interaction: Model rotates continuously. Info panel slides in from right at ~1s. Highlight on left ventricle glows.
Audio intent: Discovery moment. The bell cue lands here.
Audio-coupled idea: Info panel slide-in aligned to strong cue at 8.74s → `impactBell_heavy_000` at 8.74s (beat-locked)
Music: confident, full energy
Transition mood: clean crossfade → Scene 4

### Scene 4 — ECG Bedside Monitor — 4s
**On screen:** Dark canvas. A bedside cardiac monitor interface: a scrolling ECG trace (atrial fibrillation rhythm — irregular, no P waves, fibrillatory baseline). Rate counter in large monospace: `"ATRIAL RATE ≈ 450 / min"`. Below: irregularly irregular annotation in crimson. Alongside: a secondary panel showing 20 ECG rhythm library badges fading in.
**Text:** `ECG SIMULATOR` badge top-left. Then center: `"20 live rhythms. Sinus to VF."` in bold Inter.
Sequential/interaction: Rhythm badges appear one by one (small, fast, 4 across). ECG trace sweeps live.
Audio intent: Rhythm and precision. Tiny badge pops on beat.
Audio-coupled idea: 4 rhythm badge reveals snapped to consecutive beats ~13.11s (beat-locked): 13.11, 13.64, 14.20, 14.73 → `interface/drop_001` at low volume (0.30) for each
Music: full energy peak
Transition mood: dramatic crossfade → Scene 5

### Scene 5 — Outro: CIG Crest & Stats — 6s
**On screen:** Deep navy canvas (`#03172c`). The CIG crest fades in centered, glowing faintly. Below it:
```
Cardiology Interest Group
Faculty of Medicine · Al-Balqa' Applied University
```
After 1.5s, three stat blocks slide in from below, one by one:
```
27      27       24
Disease  Animations  Structures
Modules
```
Then at ~5s: small sub-label fades in: `"Built by students. For students."`
Sequential/interaction: Three stat blocks appear one by one (beat-grid aligned). Sub-label last.
Audio intent: Resolution. The bell hit lands on the crest appearance, then music fades out.
Audio-coupled idea: CIG crest fade-in aligned to strong cue at 17.47s → `impactBell_heavy_004` at 17.47s (beat-locked). Stat blocks beat-grid: 18.56, 19.66, 20.75. Final sub-label at 22.37s.
Music: fading gracefully from 0.35 → 0 over last 2s
Transition mood: none — end

---

**Music mood for this video:** steady cinematic bed — confident, clean, building then fading
**Audio summary:** Music fades in under the hook, builds through the science scenes, lands a bell on the anatomy discovery and crest reveal, and fades out gracefully as the stats and sign-off hold.

## Music cue guidance
- Track: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` · ~110 BPM · preset available
- Strong cue locks (max 3 in this video):
  1. **8.74s** → anatomy info panel + bell SFX (Scene 3)
  2. **17.47s** → CIG crest appearance + bell SFX (Scene 5)
  3. **22.93s** → sub-label "Built by students" fade-in (Scene 5)
- Beat grid windows for sequential reveals:
  - Scene 2 labels: beats at 6.00, 7.09, 8.19 (or detect at ~3s into scene)
  - Scene 4 rhythm badges: 13.11, 13.64, 14.20, 14.73
  - Scene 5 stat blocks: 18.56, 19.66, 20.75
- Restraint: no beat-lock forces if it harms text readability. Stat block labels hold for min 0.8s each before exiting.
