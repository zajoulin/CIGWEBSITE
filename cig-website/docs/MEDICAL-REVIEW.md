# Medical review checklist

**This content has not been reviewed by a cardiologist.** It was written from
standard textbooks and current society guidelines, and every citation in
`content/references.json` was checked against the publisher's own page — but a
qualified reviewer must sign it off before CIG publishes it under the group's name.

## How the content was written

- **Anatomy and physiology** follow standard references: Gray's Anatomy, Moore's
  *Clinically Oriented Anatomy*, Guyton and Hall's *Textbook of Medical
  Physiology*, and Braunwald's *Heart Disease*.
- **Disease content** follows current ESC / ACC / AHA guidelines where they exist;
  each module cites the specific guideline it draws on.
- **Numerical values** (pressures, valve areas, gradients, intervals, ejection
  fraction) are stated as approximate ranges, because reference ranges vary
  between institutions and modalities.
- **Treatment sections** deliberately describe *categories of therapy* and the
  principles behind them, never doses, never regimens, never recommendations for
  an individual. Each carries the "Educational summary" framing.
- **No statistic about CIG itself** is invented. The homepage figures count what
  is actually in the content files.
- **No research findings are claimed.** The nine research records are demo
  entries whose abstracts state plainly that no data were collected.

- **ECG content** follows the AHA/ACCF/HRS standardisation statements and the
  relevant ESC guidelines (pacing, supraventricular tachycardia, ventricular
  arrhythmias, acute coronary syndromes, pericardial disease); each rhythm cites
  the specific document it draws on.
- **The waveforms are synthesised**, not recorded from patients. They are
  generated from the interval and amplitude parameters in `content/ecg/*.json`,
  which a reviewer should check against the values they teach.
- **Heart sounds are synthesised** from a timing and frequency model, and are
  schematic teaching representations rather than clinical recordings. The
  interface states this wherever they are played.
- **The bedside monitor and the patient room are brand-neutral educational
  representations.** They imitate no manufacturer's interface, describe no real
  patient, and are labelled as simulations.
- **Every clinical simulation case is fictional.** The cases in
  `content/simulation/cases/` were written so that the presenting complaint,
  the history, the observations, the waveform parameters, the auscultation
  findings and the expected interpretation all describe the same patient. Cases
  are selected at random from that reviewed library; no ECG parameters, vitals
  or findings are ever generated at run time.
- **Clinical-action questions describe principles, not instructions.** Each one
  says explicitly that it is an educational scenario and that real decisions
  follow current guidelines and local protocols.

## What a reviewer should check

For each of the 24 anatomical structures:

- [ ] Location, relations and attachments are correct and use current terminology
- [ ] Blood supply, venous drainage and innervation are accurate
- [ ] Quoted pressures and dimensions are within accepted normal ranges
- [ ] The `keyPoints` are the five things a student should actually retain
- [ ] Cross-linked diseases genuinely involve that structure

For each of the 27 disease modules:

- [ ] The pathophysiology steps are in the right causal order with nothing missing
- [ ] Risk factors are correctly split into modifiable and non-modifiable
- [ ] Clinical features distinguish symptoms from signs correctly
- [ ] Investigations describe what the test actually shows in that condition
- [ ] Severity thresholds match the cited guideline, and the guideline is current
- [ ] Treatment categories are complete, current and non-prescriptive
- [ ] Key takeaways are true as stated, without over-simplifying into error

For each animation:

- [ ] Each step is a real stage of the mechanism, in the right order
- [ ] The visualisation does not imply anything the caption does not say
- [ ] The "Educational visualisation" label is present and adequate

Platform-wide:

- [ ] Every reference resolves and supports the claim it is attached to
- [ ] Guidelines cited are still the current version (they are superseded often)
- [ ] The disclaimer in `org.json` is worded appropriately for your institution
- [ ] Spelling conventions are consistent (the content uses British English)

For each of the 20 ECG rhythms:

- [ ] The waveform on screen matches the recognition criteria stated beside it
- [ ] Rate, PR, QRS, QT and ST values in `measurements` are the values you teach
- [ ] The mechanism text is correct and current
- [ ] The alarm level and the bedside vitals are clinically plausible for that rhythm
- [ ] Management principles are categories of therapy, never doses or regimens
- [ ] The narration steps describe the physiology in the right order

For each of the 20 clinical simulation cases (`content/simulation/cases/`):

- [ ] The presenting complaint, history and examination findings are internally consistent
- [ ] The observations are plausible for that presentation *and* agree with the
      rhythm's waveform rate (the validator enforces the rate; a reviewer must
      judge the blood pressure, saturations and respiratory rate)
- [ ] The systematic reading (`ecg.rate` through `ecg.tWaves`) matches what the
      generated tracing actually shows
- [ ] `ecg.leadOverrides` put the abnormality in the right territory, with the
      right reciprocal changes
- [ ] `interpretation` is phrased as ECG findings supporting a conclusion, not as
      a diagnosis the ECG cannot make on its own
- [ ] Every question has exactly one defensible answer, and the distractors are
      wrong for the reason the feedback gives
- [ ] `clinicalContext` states honestly what the ECG cannot tell you
- [ ] Learning objectives are what a student should actually take from the case
- [ ] The references support the teaching points, and are current

For the clinical examination module:

- [ ] Every electrode position matches your institution's placement protocol
- [ ] The female placement guidance (under, not on, breast tissue) is stated
- [ ] The auscultation areas and the explanation of why each is used are correct
- [ ] Murmur timing, shape, pitch and radiation are right for each lesion
- [ ] The manoeuvres listed genuinely change the murmur in the way described
- [ ] Challenge-mode feedback text teaches the landmark rather than just marking
- [ ] The electrode positions in `content/simulation/torso.json` sit where the
      landmark in `content/exam/leads.json` says they should, on both models
- [ ] The correction messages name the correct anatomical landmark


## Recording the review

When a reviewer signs off, record it here:

| Date | Reviewer | Role | Scope reviewed | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

Re-review whenever a cited guideline is superseded, and at least annually.
