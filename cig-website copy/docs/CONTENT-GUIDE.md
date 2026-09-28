# Content guide

Everything the platform says lives in `/content` as JSON. Edit the JSON, run
`npm run gen:content`, and the interface updates. No component needs touching.

The TypeScript models for every file are in `src/lib/types.ts` — that file is
also the contract a future CMS or admin dashboard would write to.

```bash
npm run gen:content     # after any content edit
npm run dev             # runs it for you
```

---

## People and teams

### `content/people.json`

```jsonc
{
  "id": "president",                    // stable, referenced by teams.json
  "name": "President Name",             // ← replace
  "position": "President",              // shown above the name on the card
  "role": "president",                  // president | vice-president | team-head | member | advisor
  "teamId": null,                       // null for president and VPs
  "photo": null,                        // "/people/asma.jpg" — null renders a monogram
  "bio": "…",                           // 2–3 sentences, the person's own words
  "academicInterests": ["…"],
  "cardiovascularInterests": ["…"],
  "year": "Year 4",
  "socials": { "email": "mailto:…", "linkedin": "https://…" },
  "placeholder": true                   // ← delete this once it is real
}
```

**Adding a photograph:** put the file in `public/` (for example
`public/people/name.jpg`) and set `"photo": "/people/name.jpg"`. Portraits at a
4:5 aspect ratio look best; anything else is cropped to fill. Until then the
monogram fallback keeps the layout correct.

**`placeholder: true`** shows a "Placeholder content" badge in the profile modal.
Remove the field when the entry is real.

### `content/teams.json`

```jsonc
{
  "id": "education",
  "name": "Education Team",
  "shortName": "Education",
  "description": "…",
  "headId": "head-education",           // must be a people.json id
  "memberIds": ["m-edu-1", "m-edu-2"],  // must all be people.json ids
  "icon": "graduation",                 // any IconName from src/lib/types.ts
  "accent": "crimson"                   // crimson | cyan | azure | amber
}
```

The hierarchy on the homepage and About page is derived automatically:
president → vice presidents → team heads → the members of each team. Adding a
seventh team, or a fourth vice president, needs no code change.

---

## Organisation

### `content/org.json`

The identity of the group and almost every organisational string on the site:

| Field | What it drives |
| --- | --- |
| `name`, `abbr`, `shortName`, `legalName` | The wordmark in the navigation, the footer and page titles |
| `university` | `name`, `short`, `faculty` — shown in the navigation, the hero, the footer and the document title |
| `crest` | `alt` and `caption` for the official crest image |
| `tagline` | The line under the hero title and in the footer |
| `heroSub`, `heroKicker` | The hero paragraph and the small meta line beneath the buttons |
| `missionStatement`, `visionStatement`, `whoWeAre` | About CIG, the homepage and the footer |
| `joinCta` | The closing "Join CIG" band on every page |
| `learningHub` | The name, eyebrow and description of the Learning Hub |
| `nav` | **The primary navigation.** Add, remove or rename an item here and the header, the mobile sheet and the footer all follow |
| `mission` | The six commitments ("What we do") |
| `activities` | The CIG programme, on the homepage and `/activities` |
| `timeline`, `contact`, `socials`, `disclaimer` | About CIG and the footer |
| `stats` | The four figures in the hero and the Resources band |

**The homepage statistics must stay true.** They currently say 24 anatomical
structures, 27 disease modules, 27 animations and 6 teams because that is exactly
what the content contains. If you add content, update these — do not inflate them.
`validate-content.mjs` fails the build if they drift.

**Navigation entries must point at real routes.** The validator only accepts
`/`, `/about`, `/activities`, `/leadership`, `/journal`, `/research`, `/learn`,
`/learn/ecg`, `/learn/examination`, `/learn/simulation`, `/learn/glossary`,
`/learn/keypoints`, `/anatomy` and `/diseases` (a `?query` suffix is allowed).
Duplicate hrefs and duplicate labels are rejected too, so the same destination
can never appear twice in the header.

### `content/hub.json`

The eight cards of the CIG Cardiovascular Learning Hub, shown on the homepage
and on `/learn`. Each entry needs `id`, `title`, `text`, `href`, `icon`, `cta`
and a `metric` — one of `structures`, `diseases`, `animations`, `keyPoints`,
`glossary` or `references`. The metric is looked up from the real content
counts, so the number on the card can never be wrong.

**A Hub card must stay inside the Hub.** `href` has to be a `/learn…`,
`/anatomy` or `/diseases` route. The validator refuses anything else, because
the Glossary and the Key Points were once tabs inside `/research` and every Hub
card that opened one silently navigated the learner out of the Learning Hub and
into CIG's research section. They are now `/learn/glossary` and
`/learn/keypoints`.

### `content/events.json`

Sessions, workshops, journal clubs and clinical exposure days, shown on
`/activities`. Each entry needs `id`, `title`, `kind`, `icon`, `when`, `where`,
`audience` and `text`.

Every entry currently ships with `"placeholder": true`, which renders a visible
*Placeholder* tag and a notice above the list. **Remove that flag only when the
entry describes a real event** — the notice is what keeps the site from
announcing something that does not exist.

---

## Anatomy

`content/anatomy/` holds one file per region: `chambers.json`, `valves.json`,
`septa.json`, `coronary.json`, `conduction.json`, `great-vessels.json`,
`peripheral.json`, plus `_categories.json` which defines the sidebar tree.

Each structure needs:

```jsonc
{
  "id": "left-ventricle",
  "name": "Left Ventricle",
  "abbr": "LV",
  "latin": "Ventriculus sinister",
  "category": "chambers",               // must exist in _categories.json
  "meshName": "heart.left_ventricle",   // links it to the 3D model
  "color": "#d84a63",                   // sidebar swatch and 3D material
  "summary": "…",                       // one sentence, used in tooltips and search
  "synonyms": ["LV", "…"],              // extra search terms
  "anatomy":    { location, shape, relations[], attachments[],
                  bloodSupply, venousDrainage, innervation, function },
  "physiology": { function, pressures[{label,value,note}], electrical,
                  hemodynamics[], concepts[] },
  "pathology":  [{ name, note, diseaseId? }],   // diseaseId makes it a link
  "clinical":   { relevance, conditions[], examination[], imaging[], procedures[] },
  "keyPoints":  ["…"],                  // 5 short, examinable facts
  "references": ["gray", "guyton"],     // ids from references.json
  "related":    { structures[], diseases[], keyPoints[] }   // the knowledge graph
}
```

Those six blocks become the six tabs of the information panel, and `related`
becomes the cross-links beneath it.

**Adding a structure:** add the object, and either give it a `meshName` that
exists in the 3D model or invent a new one and add the geometry in
`src/lib/cardio3d/model.ts`. A structure with no matching mesh still works
everywhere except the 3D view.

---

## Diseases

`content/diseases/` holds `_categories.json` (the twelve categories) plus grouped
disease files. Every disease has the same twelve sections, which is what makes
the modules comparable:

```jsonc
{
  "id": "myocardial-infarction",
  "name": "Myocardial Infarction",
  "abbr": "MI",
  "categoryId": "coronary-artery-disease",
  "featured": true,                     // shown on the homepage
  "animationId": "myocardial-infarction",  // or null
  "tagline": "…",                       // one sentence for the card
  "overview": "…",
  "riskFactors": { "modifiable": [], "nonModifiable": [] },
  "pathophysiology": [{ "title": "…", "text": "…" }],   // numbered steps
  "anatomyInvolved": ["…"],
  "relatedStructures": ["coronary-arteries"],  // links into the 3D viewer
  "physiologyChanges": ["…"],
  "progression": [{ "stage": "…", "text": "…" }],
  "clinical": { "symptoms": [], "signs": [] },
  "investigations": [{ "modality": "…", "findings": "…" }],
  "complications": ["…"],
  "treatment": { "principles": "…", "groups": [{ "name": "…", "detail": "…" }] },
  "keyTakeaways": ["…"],
  "references": ["umdmi-2018"],
  "relatedKeyPoints": ["ecg-essentials"]
}
```

`treatment.principles` is rendered inside the amber "Educational summary" box —
keep it categorical and non-prescriptive. This is a teaching platform, not a
protocol.

---

## Animations

`content/animations.json` holds the step scripts. The **script** (titles, text,
markers, durations) is data; the **drawing** for each scene is code. The five
original scenes live in `src/components/disease/scenes.tsx`, which is also the
dispatcher; the rest are grouped by system in `scenes.vascular.tsx`,
`scenes.valve.tsx`, `scenes.myocardial.tsx` and `scenes.electrical.tsx`, and all
of them are built from the shared primitives in `sceneKit.tsx` (panels, meters,
readouts, jets, chambers, traces).

```jsonc
{
  "id": "atherosclerosis",
  "scene": "atherosclerosis",           // which renderer draws it
  "title": "Atherosclerosis",
  "subtitle": "Normal artery → … → thrombosis",
  "steps": [{ "title": "…", "text": "…", "duration": 1, "markers": ["…"] }],
  "references": ["esc-prevention-2021"]
}
```

You can freely reword any step's `title`, `text` and `markers`, and change
`duration` to give a step more or less time.

A scene draws itself as a pure function of animation progress, so scrubbing the
timeline always reproduces the same frame. Elements appear with
`phase(ctx, from, to)`, where `from`/`to` are **step indices**: an element that
belongs to step *k* uses `phase(ctx, k, k + 1)`, and the last step of an
*n*-step script is therefore `phase(ctx, n - 1, n)`. If you add or remove a step
in the JSON, re-check those indices.

Adding a **new** scene means writing a renderer function in the relevant
`scenes.*.tsx` group (or a new one), listing it in that file's registry, adding
the id to `AnimationSceneId` in `src/lib/types.ts`, and pointing a disease's
`animationId` at it.

To inspect scenes without a browser,
`npx tsx tools/scene-preview.tsx <outDir>` renders four frames of every scene to
standalone SVG files; `node tools/verify-animations.mjs <outDir> <disease-id>…`
plays them in the built page and screenshots the player.

---

## ECG rhythms

`content/ecg/` holds one file per rhythm family plus `_categories.json`. Every
rhythm is fully described by data: there is **no** rhythm-specific code anywhere.
The waveform engine is handed parameters and returns millivolts.

```jsonc
{
  "id": "mobitz-i",
  "name": "Second-Degree AV Block, Mobitz I",
  "abbr": "Wenckebach",
  "categoryId": "block",                 // must exist in ecg/_categories.json
  "featured": true,                      // shown first in the rail
  "tagline": "Longer, longer, longer, drop — then the cycle repeats.",
  "rateRange": "…", "regularity": "…",
  "summary": "…",                        // what the rhythm is
  "mechanism": "…",                      // what is happening physiologically
  "recognition": ["…"],                  // how to spot it, in order
  "causes": ["…"], "significance": "…", "management": "…",

  "waveform": { … },                     // see below
  "vitals": {                            // what the monitor displays
    "heartRate": 62, "spo2": 97, "respiratoryRate": 14,
    "bpSystolic": 118, "bpDiastolic": 72, "temperature": 36.6,
    "alarm": "advisory",                 // normal | advisory | warning | critical
    "alarmText": "IRREGULAR RHYTHM",
    "bedside": "One line of clinical context for the bedside scene."
  },

  "highlights": [                        // the chips under the monitor
    { "feature": "pr", "label": "Progressive PR lengthening",
      "note": "…", "abnormal": true }
  ],
  "narration": [                         // the synchronised explanation
    { "title": "…", "text": "…", "duration": 1.3, "highlight": "pr" }
  ],
  "measurements": [
    { "label": "PR interval", "value": "0.18 → 0.36 s",
      "normal": "0.12–0.20 s, constant", "abnormal": true }
  ],
  "relatedDiseases": [], "relatedKeyPoints": [], "relatedStructures": [],
  "references": ["esc-pacing-2021"]
}
```

### The `waveform` block

Amplitudes are **millivolts**, intervals are **seconds** — the same units the
monitor's 25 mm/s, 10 mm/mV grid is drawn to, so what you type is what can be
measured on screen.

| Field | Meaning |
| --- | --- |
| `rate` | Ventricular rate, bpm |
| `irregularity` | 0 = metronomic, 1 = irregularly irregular |
| `sinusArrhythmia` | Respiratory variation in cycle length, 0–1 |
| `atrial` | `sinus` · `none` · `fibrillatory` · `flutter` · `dissociated` · `retrograde` |
| `atrialRate` | Atrial rate when the atria are independent (flutter, complete block) |
| `pAmplitude`, `pDuration` | P wave size and width |
| `prInterval` | P onset to QRS onset |
| `prIncrement` | Seconds added to PR on each beat of a Wenckebach group |
| `dropEvery` | Every nth atrial beat fails to conduct |
| `qrsDuration`, `qrsAmplitude` | QRS width and R height |
| `qrsShape` | `narrow` · `wide` · `monomorphic` · `chaotic` |
| `qAmplitude`, `sAmplitude` | Q wave depth (pathological Q) and S wave depth |
| `stShift`, `stShape` | J-point deviation and its morphology (`convex` for STEMI, `concave` for pericarditis) |
| `tAmplitude`, `tShape` | T wave; `peaked` for hyperkalaemia, `flattened` for hypokalaemia |
| `uAmplitude` | U wave — prominent in hypokalaemia |
| `qtInterval` | QRS onset to T end |
| `fibrillatory`, `wander`, `noise` | Baseline fibrillation, drift and fine noise |

A rhythm's `highlights[].feature` and `narration[].highlight` may be any of
`p · pr · qrs · j · st · t · u · qt · rr · baseline`. The engine turns the name
into an exact time window on the beat currently under the cursor, so the shading
always lands on the right part of the complex.

---

## Clinical examination

`content/exam/` describes the 3D thorax module. Positions are `[x, y, z]` in
model space: **+x is the patient's left**, **+y is superior**, **+z is anterior**.
The chest wall decides the final depth, so `z` is advisory — `x` and `y` are what
matter, and they are honoured exactly.

- **`leads.json`** — the ten electrodes. `position` (and `positionFemale` where
  it differs), `color` and `colorName` following the AHA convention, `landmark`,
  `howToFind`, `why` the position matters, `views` (the myocardium it looks at)
  and `pitfalls`.
- **`auscultation.json`** — the five areas. `position`, `valve`, `why` sound is
  loudest there, `listenFor`, `technique` and the `soundIds` audible at the site.
- **`heart-sounds.json`** — sounds and murmurs. `events[]` is the acoustic model:
  each event has `start`/`end` as a fraction of the cardiac cycle (0 = S1),
  `intensity`, `frequency` in Hz, `bandwidth`, `noise` (0 = pure tone, 1 = pure
  turbulence) and `shape` (`thump` · `plateau` · `crescendo` · `decrescendo` ·
  `diamond`). The same events drive the synthesiser and the systole/diastole
  timeline, so audio and picture cannot drift apart.
- **`landmarks.json`** — the surface anatomy every position is defined by.
- **`challenges.json`** — challenge-mode questions. `mode` is `leads`,
  `auscultation` or `rhythm`; `targetId` is the lead, site or rhythm id; and
  `successText` / `failText` / `hint` are the feedback the learner sees.

To add a murmur: add it to `heart-sounds.json`, then list its id in the
`soundIds` of every auscultation site where it should be audible.

---

## Key points, glossary, research, references

- **`keypoints.json`** — twelve teaching topics. Each has `sections` (with
  optional `facts` lists and `table` objects), `pearls`, `references` and
  `related` cross-links.
- **`glossary.json`** — a term, definition, optional `formula` and
  `typicalValue`, plus `relatedAnatomy` / `relatedPhysiology` / `relatedDiseases`
  ids that become links.
- **`research.json`** — **CIG's own research and nothing else.** It ships empty,
  so `/research` shows "CIG research publications are coming soon." rather than
  demo records dressed as the group's work. Add a record only for research CIG
  has actually produced. Fields: `id`, `title`, `authors`, `year`, `type`
  (`original-research` · `review` · `case-report` · `abstract` · `poster` ·
  `audit`), `category`, `abstract`, `keyFindings`, `tags`, and the optional
  `status` (`in-progress` · `submitted` · `under-review` · `accepted` ·
  `presented` · `published`), `publicationDate`, `venue`, `team`, `doi`, `link`
  and `pdf` (put PDFs in `public/research/`). The validator rejects any record
  flagged `placeholder` or whose text reads as demo content.
  `research.example.json` holds the old demo entries purely as a shape
  reference — it is not loaded by the site.
- **`research-config.json`** — the copy for `/research`: the introduction, the
  three commitments, the empty state, and the whole "Have a Research Idea?"
  form (its labels, the areas of interest, the experience options, the
  confirmation and the no-guarantee disclaimer). `idea.endpoint` is the one
  field that needs connecting before publication — see the README. **Never put
  an API key or any other credential in it**: the form is client-side, so
  everything in this file ships to the browser, and the validator fails the
  build if the endpoint looks like it carries one.
- **`journal.json`** — the CIG Journal. `issues` ships empty, so `/journal`
  shows its own "first issue is coming soon" state. Each issue needs `id`,
  `title`, `date`, `summary` and an `articles` array (`id`, `title`, `authors`,
  `kind`, `summary`, optional `link` / `pdf`).
- **`references.json`** — every citation on the platform. Referencing a
  non-existent id is caught by the validation below.

**Do not invent references.** Every entry currently in `references.json` was
checked against the publisher's own page. If you cannot verify a citation, leave
it out rather than guessing at a DOI.

---

## Checking your edits

Cross-references between files are easy to break by hand. This script checks all
of them at once:

```bash
node scripts/validate-content.mjs
```

It verifies that every referenced id exists, that no ids are duplicated, that
every category is populated, that the leadership hierarchy is well-formed, that
the organisation identity, navigation, Learning Hub cards and events are complete,
that navigation and hub links point at routes that exist, and that the homepage
statistics still match the real content counts. Run it before every commit.

Then check the built site in a real browser:

```bash
npm run build:static
npm run verify
```

That suite loads every route, confirms the crest decodes and keeps its aspect
ratio on every section front, drives the 3D viewer, the animations, search,
filters and modals, and checks for horizontal overflow at 1440, 1180, 834 and
390 px.


---

## The clinical simulation (`content/simulation/`)

The Learning Hub's bedside module is entirely content-driven. Four files, plus a
directory of cases:

| File | What it holds |
| --- | --- |
| `simulation/config.json` | Module copy, the safety statement, the four difficulty levels and the stage labels |
| `simulation/torso.json` | Where every electrode and auscultation area sits on the flat male and female torso, with the tolerance and the correction message for each |
| `simulation/scoring.json` | The three scored sections, the penalties and the performance bands |
| `simulation/cases/*.json` | The reviewed case library — one file per family, flattened at build time |

### Adding a case

```jsonc
{
  "id": "case-inferior-stemi",
  "title": "Crushing chest pain, elevation in II, III and aVF",
  "levels": ["beginner", "intermediate", "advanced", "simulation"],
  "difficulty": "intermediate",          // core | intermediate | advanced
  "patient": {
    "age": 62, "sex": "male",
    "descriptor": "62-year-old man",     // how the bedside describes them
    "setting": "Emergency department, resuscitation area"
  },
  "presentingComplaint": "…",
  "history": ["…"], "symptoms": ["…"], "examinationFindings": ["…"],
  "vitals": { … },                       // same shape as an ECG rhythm's vitals
  "ecgRhythmId": "stemi",                // must exist in content/ecg/
  "ecg": {
    "rate": "…", "rhythm": "…", "pWaves": "…", "prInterval": "…",
    "qrs": "…", "axis": "…", "stSegment": "…", "tWaves": "…",
    "keyFindings": ["…"],
    "keyLeads": ["II", "III", "aVF"],
    "highlight": "st",                   // shaded on the tracing
    "leadOverrides": { "aVL": { "st": -1.5 } }
  },
  "interpretation": "ECG findings consistent with …",
  "auscultation": [
    { "siteId": "mitral", "soundId": "normal-s1-s2", "note": "…" }
  ],
  "questions": [ … ],
  "explanation": "…", "learningObjectives": ["…"], "clinicalContext": "…",
  "relatedDiseases": [], "relatedKeyPoints": [], "references": ["esc-acs-2023"]
}
```

**The rules the validator enforces**, and why each one exists:

- `vitals.heartRate` must agree with the waveform rate of `ecgRhythmId` — or the
  monitor above the bed would show one number while the tracing showed another.
- A heart sound must be listed as audible at the area the case claims to hear it
  at, in `content/exam/auscultation.json`.
- Every question must have exactly one correct option, and every option must
  carry feedback explaining why it is right or wrong.
- A case whose rhythm is in the `ischaemia`, `chamber` or `metabolic` families
  must phrase its `interpretation` as findings supporting a conclusion — the ECG
  does establish a rhythm, but it does not establish ischaemia or hypertrophy.
- Every level must have at least three cases to randomise between.

### `leadOverrides`

The waveform engine synthesises one cardiac vector, and `src/lib/ecg/leads.ts`
projects it onto each of the twelve leads. What a fixed projection cannot know is
the *territory* of a case. `leadOverrides` multiplies the amplitude of one
component in one lead: `p`, `q`, `r`, `s`, `st` or `t`. A value of 1 leaves the
lead alone, 0 removes that component and a negative value inverts it.

That is how an inferior infarct elevates II, III and aVF while depressing I and
aVL, and how a left bundle branch block produces a deep QS in V1 with discordant
ST elevation and a broad R in V6 with discordant depression — all from the same
generator.

### Moving an electrode

Positions in `simulation/torso.json` are in the torso's own view units (a
400 × 560 box, midline at x = 200). The validator checks that every position
lands inside the box, that no two targets overlap, and that the ten ids match
`content/exam/leads.json`. The artwork is generated in code from a table of body
half-widths in `src/components/simulation/TorsoStage.tsx`; if you move a target
far, check on screen that it still lands on the body.
