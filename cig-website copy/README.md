# Cardiology Interest Group (CIG) — Al-Balqa' Applied University

The official digital home of the **Cardiology Interest Group**, a student-led
society in the Faculty of Medicine at Al-Balqa' Applied University.

The site introduces the organisation first — who CIG is, what it does, what it
runs, who leads it and how to get involved — and hosts the **CIG Cardiovascular
Learning Hub**, the group's open education programme: a **Clinical Simulation**
where the learner stands at a patient's bedside and works one case through from
presentation to interpretation, a 3D anatomy viewer, a disease explorer with
animated pathophysiology, a simulated bedside cardiac monitor running twenty ECG
rhythms, an interactive 3D thorax for lead placement and auscultation, referenced
key-point topics and a cardiovascular glossary.
Everything is driven by editable JSON, so the CIG team can replace every word
without touching a component.

## Brand

The identity is derived from the official CIG crest (`public/brand/`): a deep
university navy (`#043464`, sampled from the shield) on white.

- **Light by default.** White and near-white neutrals carry navy type; cards are
  white on a faint blue-grey page.
- **Navy chrome.** The navigation, the footer, every section front and the
  call-to-action bands are the deep CIG navy, so the group's identity frames
  every page without flooding it.
- **Dark stages.** Anything with the `stage` class re-declares the same design
  tokens in a dark navy palette. It is used where a dark canvas is the right
  substrate for the science — the WebGL anatomy viewer and the SVG
  pathophysiology animations — and for the navy chrome above.
- **Crimson is a clinical accent only**, reserved for disease and pathology
  content. It is never the primary colour.

All of this lives in `src/styles/tokens.css`. Change a value there and the whole
platform follows. The crest is inlined as a data URI by `gen-content.mjs`, so it
renders in the Next.js app and in the offline single-file build alike, and it is
never stretched — only its width is ever set.

---

## Two ways to run it

### 1. The Next.js application (the real codebase)

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start   # production build
npm run typecheck            # TypeScript, no emit
```

**CIG:** `/` · `/about` · `/activities` · `/leadership` · `/journal` · `/research`

**Learning Hub:** `/learn` · `/learn/simulation` · `/learn/ecg` ·
`/learn/examination` · `/anatomy` · `/diseases` · `/diseases/<id>` ·
`/learn/keypoints` · `/learn/glossary`

Deep links: `/anatomy?structure=<id>` · `/diseases?category=<id>` ·
`/learn/ecg?rhythm=<id>` · `/learn/keypoints?topic=<id>` ·
`/learn/simulation?level=beginner|intermediate|advanced|simulation&case=<id>` ·
`/learn/examination?mode=leads|auscultation|anatomy&sex=male|female&lead=<id>`

Shorthand addresses redirect to the canonical route rather than answering on a
second URL: `/glossary`, `/keypoints`, `/key-points`, `/ecg`, `/simulation`,
`/examination`, `/learning-hub`, `/resources`, `/people`. The links from before
the Learning Hub and Research were separated — `/research?tab=glossary`,
`/research?tab=keypoints`, `/research?topic=<id>` — redirect too, so old
bookmarks still land in the right place.

The primary navigation is **content-driven**: it comes from `nav` in
`content/org.json`, and `scripts/validate-content.mjs` checks that every entry
points at a route that exists.
Every disease module is statically generated with its own title, description and
Open Graph metadata.

### 2. The single-file build (`static/cig.html`)

```bash
npm run build:static
```

Produces one self-contained HTML file — no server, no network, no build tooling
needed to open it. Useful for handing the platform to someone on a USB stick, for
offline teaching sessions, or for hosting on anything that can serve a file.

It contains the *same* React components as the Next.js app; only the router
implementation differs (`src/lib/router.tsx` is the abstraction, `app/providers.tsx`
and `static-entry.tsx` are the two implementations).

### Verifying it

```bash
npm run build:static
npm run verify       # needs `npm i -D playwright` and `npx playwright install chromium`
```

`scripts/verify.mjs` loads the built file in a real browser and checks that every
route renders, the 3D viewer draws, tabs/filters/search/animations/modals work,
cross-links navigate, there is no horizontal overflow at four viewport widths,
the keyboard order is correct, and the console is clean. Screenshots land in
`build/shots/`.

---

## Where the content lives

**Nothing is hard-coded into a component.** Everything is JSON under `/content`:

| File | What it holds |
| --- | --- |
| `content/org.json` | Identity (name, university, crest text), mission, vision, activities, timeline, contact, disclaimer, the primary navigation, the join call-to-action, Learning Hub copy and homepage stats |
| `content/hub.json` | The Learning Hub cards and where each one leads; the card marked `featured` becomes the flagship banner |
| `content/events.json` | Sessions and events (currently clearly-marked placeholders) |
| `content/people.json` | Every person: name, position, role, team, photo, bio, interests, links |
| `content/teams.json` | The six teams, their heads and members |
| `content/anatomy/*.json` | 24 anatomical structures, one file per region |
| `content/diseases/*.json` | 27 disease modules, grouped by category |
| `content/animations.json` | The step scripts for the pathophysiology animations — one per disease module |
| `content/ecg/_categories.json` | The nine rhythm families and their monitor accent colours |
| `content/ecg/*.json` | 20 ECG rhythms: waveform parameters, bedside vitals, recognition criteria, highlights, narration, measurements and clinical text |
| `content/simulation/config.json` | Clinical Simulation copy, the safety statement, the four difficulty levels and the stage labels |
| `content/simulation/torso.json` | Where each electrode and auscultation area sits on the flat male and female torso, with its tolerance and its correction message |
| `content/simulation/scoring.json` | The three scored sections, the penalties and the performance bands |
| `content/simulation/cases/*.json` | 20 reviewed clinical cases: presentation, history, examination, vitals, ECG reading, auscultation findings, questions, explanation and references |
| `content/exam/leads.json` | The ten ECG electrodes: position on the thorax, landmark, technique, what the lead views, common errors |
| `content/exam/auscultation.json` | The five auscultation areas: position, valve, why sound is loudest there, technique |
| `content/exam/heart-sounds.json` | Eight heart sounds and murmurs, each with the acoustic event model that drives both the synthesiser and the cycle timeline |
| `content/exam/landmarks.json` | Surface landmarks — sternal angle, intercostal spaces, midclavicular and axillary lines, apex beat |
| `content/exam/challenges.json` | Challenge-mode questions for lead placement, auscultation and rhythm recognition |
| `content/keypoints.json` | Twelve referenced key-point teaching topics |
| `content/glossary.json` | 36 cardiovascular terms with formulae and cross-links |
| `content/research.json` | CIG's own research records — ships empty, so Research shows its "publications are coming soon" state |
| `content/research-config.json` | The Research page: introduction, commitments, empty state, and every word of the Research Idea form (including the submission endpoint slot) |
| `content/journal.json` | The CIG Journal: introduction, issues (ships empty), journal-club cross-links and the submissions note |
| `content/references.json` | Every citation used anywhere on the platform |

After editing any of these:

```bash
npm run gen:content
```

That compiles `/content` into `src/data/content.generated.ts`, which both build
targets import. `npm run dev`, `npm run build` and `npm run build:static` all run
it for you.

See **[docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md)** for the field-by-field
guide, and **[docs/MEDICAL-REVIEW.md](docs/MEDICAL-REVIEW.md)** for the review
checklist before this goes public.

---

## What still needs replacing

Placeholder content is deliberately obvious, and marked in the interface:

- **Every person** — "President Name", "Vice President Name A", "Team Head Name — Education",
  "Member Name 1"… with a shared placeholder biography. No real names have been invented.
- **CIG's research** — `research.json` ships **empty**, so `/research` shows
  "CIG research publications are coming soon." Add records only for research the
  group has actually produced; the validator rejects placeholder records outright.
  The nine old demo entries are kept in `content/research.example.json` purely as
  a shape reference and are not loaded by the site.
- **The CIG Journal** — `journal.json` ships with no issues, so `/journal` shows
  its own "first issue is coming soon" state. The editorial process and
  submission dates are marked as to be confirmed.
- **The Research Idea form's submission endpoint** — see below. This is the one
  thing that has to be wired up.
- **The timeline and contact details** in `org.json`.
- **Every event** in `events.json` — four entries describing the shape of a CIG
  session without announcing a real date, venue or speaker.
- **Membership details** — how to join, intake dates and the application route
  (`joinCta.note` in `org.json`).
- **Photographs** — `photo: null` renders an elegant monogram, so the layout is
  already correct before any photograph exists.

The medical content (anatomy, physiology, pathology, disease modules, key points,
glossary) is written from standard textbooks and current society guidelines and
carries verified references — but it has **not** been reviewed by a cardiologist.
Do that before publishing. See `docs/MEDICAL-REVIEW.md`.

### Connecting the Research Idea form

`/research` carries a full **Have a Research Idea?** submission form. The
platform has no accounts and no database, and the form deliberately adds
neither. Two things decide where a submission goes:

1. **`contact.email` in `content/org.json`.** While it is the placeholder
   address, the form validates the submission, shows it back to the student and
   asks them to email it — it will not open a mail client addressed to nowhere,
   and it never claims the message was sent.
2. **`idea.endpoint` in `content/research-config.json`.** Leave it `null` and a
   completed form opens the student's own email application with the submission
   composed and addressed to the CIG contact address; the confirmation says
   exactly that. Set it to the URL of CIG's own form service — Formspree, a
   Google Form endpoint, a serverless function — and the form `POST`s the
   submission there as JSON instead, and only then shows "Your research idea has
   been submitted to the CIG research team."

```jsonc
// content/research-config.json
"idea": {
  "endpoint": "https://formspree.io/f/xxxxxxxx"   // or null
}
```

The endpoint is a **plain public URL**. Everything in `/content` ships to the
browser, so no API key, token or password belongs in it —
`validate-content.mjs` fails the build if the endpoint looks like it carries a
credential.

Nothing in the form ever reports a delivery it has not had: a failed `POST`
shows an error with the CIG address to write to instead, and no state is
described as stored when it is not.

---

## Architecture

```
content/                JSON — the single source of truth for all content
  anatomy/              one file per anatomical region
  diseases/             one file per disease category group
scripts/
  gen-content.mjs       content/*.json  →  src/data/content.generated.ts
  build-static.mjs      TypeScript + React  →  one self-contained HTML file
  verify.mjs            browser test suite
src/
  lib/
    types.ts            every content model (also the contract for a future CMS)
    content.ts          typed collections, lookup maps, derived data, search index
    router.tsx          routing abstraction shared by both build targets
    cardio3d/           the dependency-free WebGL2 engine
      math.ts           vectors and column-major 4×4 matrices
      geometry.ts       parametric surfaces, swept tubes, splines, merging
      model.ts          the cardiovascular model — one named mesh per structure
      thorax.ts         the thoracic model for the examination module
      renderer.ts       shading, transparency, GPU picking, camera, animation
      loader.ts         model source abstraction + GLB/GLTF drop-in instructions
    ecg/
      engine.ts         the ECG waveform synthesiser — parameters in, millivolts out
      leads.ts          projection of the cardiac vector onto all twelve leads,
                        plus the per-case override layer
      monitorTone.ts    the QRS beep and alarm tones
    audio/
      heartSounds.ts    heart-sound and murmur synthesis from the content model
  styles/               design tokens, base, components, modules
  components/
    layout/             Navbar, Footer
    ui/                 primitives, Modal, Sheet, SearchBar, loading/error states
    anatomy/            AnatomyStage, AnatomyTree, AnatomyControls, AnatomyInfoPanel
    disease/            DiseaseExplorer, DiseaseDetail, animation player, scenes, ECG
    ecg/                BedsideMonitor, EcgWorkspace, teaching strip, rhythm quiz
    simulation/         ClinicalSimulation, useSimulation, PatientRoomScene,
                        TorsoStage, TwelveLead
    exam/               ChestStage, ExaminationWorkspace, cardiac cycle timeline
    people/             PersonCard, PersonModal, LeadershipTree
    research/           ResearchDatabase, ResearchIdeaForm, KeyPoints, Glossary
    icons/              the inline SVG icon set
    brand/              the official crest and the CIG lockup
  pages/                Home, About, Activities, Learning Hub, Clinical Simulation,
                        ECG, Examination, Glossary, Key Points, Leadership,
                        Diseases, Disease detail, Research, Journal
  App.tsx               route switch + document metadata (used by the static build)
app/                    Next.js App Router: metadata, static params, client boundaries
```

### The 3D viewer

The cardiovascular model is **generated in code** — parametric surfaces for the
chambers and septa, swept tubes for every vessel, a branching network for the
Purkinje fibres. That means no licensing constraints and nothing to download, and
every structure is a separately named, individually selectable mesh whose name
(`heart.left_ventricle`, `vessels.aorta`, …) matches the `meshName` field in the
anatomy content.

It is a **diagrammatic** model: anatomically arranged and correctly related, but
not photorealistic, and the interface says so. To replace it with a properly
licensed GLB/GLTF, follow the instructions at the top of
`src/lib/cardio3d/loader.ts` — the renderer, controls, search, view modes and
information panel need no changes. Candidate openly-licensed sources are
researched in **[docs/3d-model-sourcing.md](docs/3d-model-sourcing.md)**.

The same renderer draws the **thorax** used by the clinical examination module
(`src/lib/cardio3d/thorax.ts`): a translucent chest wall over ribs, sternum,
clavicles and a heart in its true position, with one small mesh per electrode,
auscultation area and surface landmark. Male and female chest walls come from the
same silhouette with a breast contour applied to the anterior surface, and every
marker position is projected onto the chest wall by inverting the superellipse,
so a lead sits exactly at the lateral coordinate the content file states.

The renderer is written directly against WebGL2 rather than Three.js. It does
smooth shading with a three-light rig, correct back-to-front transparency, GPU
colour-buffer picking, animated per-part opacity, and damped orbit/pan/zoom with
camera flights. If WebGL2 is unavailable it reports the failure and the page
falls back to the full structure list and information panel — the 3D never takes
the page down with it.

---

## The ECG engine

`src/lib/ecg/engine.ts` synthesises the trace. It is given amplitudes in
millivolts, intervals in seconds and conduction rules — never a rhythm name — so
all twenty rhythms come out of one generator and one JSON schema:

- **Two scheduling modes** cover everything. Atrium-driven rhythms (sinus, the AV
  blocks) let the P wave decide when the QRS happens, which is what produces
  Wenckebach's lengthening PR interval and Mobitz II's abrupt drops. Ventricle-
  driven rhythms (fibrillation, flutter, the tachycardias) run the ventricles on
  their own clock with the atria independent, absent or fibrillating.
- **Deterministic.** Every irregularity comes from a seeded hash of the beat
  index, so scrubbing backwards reproduces exactly the same trace.
- **Measurable.** The monitor draws a calibrated 25 mm/s, 10 mm/mV grid, so the
  intervals on screen can be measured the way they are on paper.
- **Feature windows.** The engine converts a named feature — P wave, PR interval,
  QRS, J point, ST segment, T wave, U wave, QT, R–R — into an absolute time
  window for a specific beat, which is what lets the monitor shade exactly the
  right part of a scrolling waveform.
- **Fast.** Beats are located by binary search, so a full four-channel monitor
  costs well under a millisecond per frame however long the recording has run.

### The clinical simulation

`/learn/simulation` is the Hub's flagship module and the only place the patient
room appears. It is a single encounter with a single fictional patient, run
through seven stages: read the presentation, examine, place ten electrodes,
acquire a twelve-lead ECG, auscultate, interpret, and be scored.

- **Cases are data, not code.** Twenty reviewed cases live in
  `content/simulation/cases/`, each internally coherent from the presenting
  complaint through the observations to the waveform parameters, the heart
  sounds and the expected interpretation. `scripts/validate-content.mjs` checks
  that coherence — including that the heart rate the monitor displays agrees
  with the rate the waveform engine is generating.
- **Randomisation selects; it never generates.** A new case is drawn at random
  from the cases valid for the chosen difficulty. No ECG parameter, observation
  or finding is ever produced at run time, because a randomly assembled tracing
  would carry no guarantee of describing a real clinical picture.
- **Placement is evaluated, not accepted.** Each electrode is judged against the
  anatomical position in `content/simulation/torso.json`, with a tolerance that
  tightens as the difficulty rises. A wrong placement is refused, the learner is
  told where the electrode belongs, and the attempt is recorded and marked.
- **The twelve-lead is territory-specific.** Each lead is the projection of the
  synthesised vector onto that lead's axis, adjusted by the case's own per-lead
  overrides — which is what makes an inferior infarct elevate II, III and aVF and
  depress I and aVL rather than looking the same everywhere.
- **Two-dimensional on purpose.** The chest the learner taps is one scalable SVG
  generated from a table of body half-widths, so it costs nothing to draw, needs
  no GPU and is accurate to tap on a phone. The WebGL thorax in the examination
  module remains the place to explore the same anatomy in three dimensions.
- **Every stage has a keyboard-accessible equivalent.** Electrodes and
  auscultation areas are buttons in a list beside the diagram, and placing from
  the landmark costs the same hint penalty as asking for it.

Heart sounds are synthesised the same way (`src/lib/audio/heartSounds.ts`): one
cardiac cycle is rendered offline from the timing, frequency, bandwidth and
envelope in `content/exam/heart-sounds.json`, then looped, so the murmur the
learner hears and the systole/diastole timeline they see are driven by the same
model. The stethoscope's bell and diaphragm are a real filter change. These are
schematic teaching sounds, not clinical recordings, and the interface says so.

---

## Accessibility

- Semantic landmarks, one `h1` per page, a skip link as the first tab stop
- Focus is moved to a top-of-page announcer after client-side navigation, so
  keyboard users never resume mid-document and screen readers hear the new page
- Modals and the mobile sheet trap focus, restore it on close and respond to Escape
- The 3D model has a complete keyboard-accessible equivalent (the structure tree)
- Tabs implement the arrow-key pattern; the animation timeline is a real slider
- The ECG transport is ordinary buttons and a native range input, so the whole
  monitor is keyboard-operable, and the monitor canvas carries a description of
  the rhythm and rate it is showing
- Every electrode, auscultation area and landmark on the 3D chest is also a
  button in the list beside it, so nothing needs a pointer or a working GPU
- The same is true of the simulation's two-dimensional chest: every electrode and
  auscultation area can be reached from the list, and the simulation's stage
  stepper only ever allows movement back to a completed stage
- Monitor tones and heart sounds never play until the learner asks for them
- `prefers-reduced-motion` disables scroll reveals, auto-rotation, flow particles
  and camera easing
- Status is never carried by colour alone — icons and text labels accompany it

## Performance

- The 3D model is generated lazily, only when a viewer mounts
- The render loop is demand-driven: it idles when nothing is moving
- Every GPU resource is disposed on unmount
- Picking renders at half resolution to an offscreen buffer
- The content bundle is parsed once from a single string literal
- Zero runtime dependencies beyond React
- The monitor samples one point per pixel per frame and locates beats by binary
  search; React re-renders about ten times a second while the canvas animates at
  the display's refresh rate
- Heart-sound audio is rendered once per sound and looped, not re-synthesised

## Licence

Code: choose a licence before publishing. Content: written for CIG; the medical
text is CIG's to edit and publish. See `LICENSES.md` for third-party attribution
requirements if you drop in an external 3D model.
