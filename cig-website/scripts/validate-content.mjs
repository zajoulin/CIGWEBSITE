#!/usr/bin/env node
/**
 * Validates every cross-reference in /content: ids exist, nothing is duplicated,
 * every category is populated, the leadership hierarchy is well-formed and the
 * homepage statistics still match the real content counts.
 *
 * Run before every commit:  node scripts/validate-content.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const R = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const J = p => JSON.parse(readFileSync(`${R}/${p}`, 'utf8'));

const refs = J('references.json');
const people = J('people.json');
const teams = J('teams.json');
const org = J('org.json');
const cats = J('anatomy/_categories.json');
const anat = readdirSync(`${R}/anatomy`).filter(f => !f.startsWith('_')).flatMap(f => J(`anatomy/${f}`));
const dcats = J('diseases/_categories.json');
const dis = readdirSync(`${R}/diseases`).filter(f => !f.startsWith('_')).flatMap(f => J(`diseases/${f}`));
const anims = J('animations.json');
const kps = J('keypoints.json');
const gloss = J('glossary.json');
const research = J('research.json');
const researchCfg = J('research-config.json');
const journal = J('journal.json');
const hub = J('hub.json');
const events = J('events.json');
const ecgCats = J('ecg/_categories.json');
const ecg = readdirSync(`${R}/ecg`).filter(f => !f.startsWith('_')).flatMap(f => J(`ecg/${f}`));
const leads = J('exam/leads.json');
const sites = J('exam/auscultation.json');
const sounds = J('exam/heart-sounds.json');
const landmarks = J('exam/landmarks.json');
const challenges = J('exam/challenges.json');
const simConfig = J('simulation/config.json');
const torso = J('simulation/torso.json');
const simScoring = J('simulation/scoring.json');
const cases = readdirSync(`${R}/simulation/cases`).filter(f => !f.startsWith('_')).flatMap(f => J(`simulation/cases/${f}`));

const err = [];
const set = a => new Set(a.map(x => x.id));
const refIds = set(refs), peopleIds = set(people), anatIds = set(anat), disIds = set(dis),
      kpIds = set(kps), animIds = set(anims), catIds = set(cats.categories), dcatIds = set(dcats),
      ecgCatIds = set(ecgCats), ecgIds = set(ecg), leadIds = set(leads), siteIds = set(sites),
      soundIds = set(sounds), landmarkIds = set(landmarks);

const chk = (cond, msg) => { if (!cond) err.push(msg); };
const chkAll = (list, pool, label, where) => (list || []).forEach(x => chk(pool.has(x), `${where}: unknown ${label} "${x}"`));

// duplicates
const dup = arr => { const s = new Set(), d = []; arr.forEach(x => s.has(x.id) ? d.push(x.id) : s.add(x.id)); return d; };
[['anatomy', anat], ['diseases', dis], ['people', people], ['keypoints', kps], ['glossary', gloss], ['refs', refs], ['research', research], ['hub', hub], ['events', events],
 ['ecg', ecg], ['leads', leads], ['auscultation', sites], ['heart-sounds', sounds], ['landmarks', landmarks], ['challenges', challenges], ['ecg-categories', ecgCats],
 ['clinical cases', cases], ['simulation levels', simConfig.levels]]
  .forEach(([n, a]) => dup(a).forEach(d => err.push(`duplicate id in ${n}: ${d}`)));

anat.forEach(s => {
  chk(catIds.has(s.category), `anatomy ${s.id}: unknown category ${s.category}`);
  chkAll(s.references, refIds, 'reference', `anatomy ${s.id}`);
  chkAll(s.related.structures, anatIds, 'structure', `anatomy ${s.id}`);
  chkAll(s.related.diseases, disIds, 'disease', `anatomy ${s.id}`);
  chkAll(s.related.keyPoints, kpIds, 'keypoint', `anatomy ${s.id}`);
  (s.pathology || []).forEach(p => p.diseaseId && chk(disIds.has(p.diseaseId), `anatomy ${s.id}: pathology -> unknown disease ${p.diseaseId}`));
  ['anatomy','physiology','clinical'].forEach(k => chk(s[k], `anatomy ${s.id}: missing ${k}`));
  chk(s.keyPoints?.length, `anatomy ${s.id}: no keyPoints`);
  chk(/^#[0-9a-f]{6}$/i.test(s.color), `anatomy ${s.id}: bad color`);
  chk(s.meshName?.includes('.'), `anatomy ${s.id}: bad meshName`);
});

dis.forEach(d => {
  chk(dcatIds.has(d.categoryId), `disease ${d.id}: unknown category ${d.categoryId}`);
  chkAll(d.references, refIds, 'reference', `disease ${d.id}`);
  chkAll(d.relatedStructures, anatIds, 'structure', `disease ${d.id}`);
  chkAll(d.relatedKeyPoints, kpIds, 'keypoint', `disease ${d.id}`);
  if (d.animationId) chk(animIds.has(d.animationId), `disease ${d.id}: unknown animation ${d.animationId}`);
  ['overview','riskFactors','pathophysiology','physiologyChanges','progression','clinical','investigations','complications','treatment','keyTakeaways'].forEach(k =>
    chk(d[k] && (Array.isArray(d[k]) ? d[k].length : true), `disease ${d.id}: missing/empty ${k}`));
});

kps.forEach(k => {
  chkAll(k.references, refIds, 'reference', `keypoint ${k.id}`);
  chkAll(k.related.structures, anatIds, 'structure', `keypoint ${k.id}`);
  chkAll(k.related.diseases, disIds, 'disease', `keypoint ${k.id}`);
});

gloss.forEach(g => {
  chkAll(g.relatedAnatomy, anatIds, 'structure', `glossary ${g.id}`);
  chkAll(g.relatedDiseases, disIds, 'disease', `glossary ${g.id}`);
});

anims.forEach(a => { chkAll(a.references, refIds, 'reference', `animation ${a.id}`); chk(a.steps.length >= 6, `animation ${a.id}: too few steps`); });

teams.forEach(t => {
  chk(peopleIds.has(t.headId), `team ${t.id}: unknown head ${t.headId}`);
  chkAll(t.memberIds, peopleIds, 'person', `team ${t.id}`);
});
const teamIds = set(teams);
people.forEach(p => { if (p.teamId) chk(teamIds.has(p.teamId), `person ${p.id}: unknown team ${p.teamId}`); });
chk(people.filter(p => p.role === 'president').length === 1, 'expected exactly 1 president');
chk(people.filter(p => p.role === 'vice-president').length === 2, 'expected exactly 2 VPs');
chk(people.filter(p => p.role === 'team-head').length === 6, 'expected exactly 6 team heads');
chk(teams.length === 6, 'expected 6 teams');

// ---- ECG rhythms ---------------------------------------------------------
const FEATURES = new Set(['p','pr','qrs','j','st','t','u','qt','rr','baseline']);
const ATRIAL = new Set(['sinus','none','fibrillatory','flutter','dissociated','retrograde']);
const QRS_SHAPES = new Set(['narrow','wide','monomorphic','chaotic']);
const ST_SHAPES = new Set(['flat','convex','concave','downsloping','upsloping']);
const T_SHAPES = new Set(['normal','peaked','inverted','flattened','broad']);
const ALARMS = new Set(['normal','advisory','warning','critical']);

ecg.forEach(r => {
  const w = `ecg ${r.id}`;
  chk(ecgCatIds.has(r.categoryId), `${w}: unknown category ${r.categoryId}`);
  chkAll(r.references, refIds, 'reference', w);
  chkAll(r.relatedDiseases, disIds, 'disease', w);
  chkAll(r.relatedKeyPoints, kpIds, 'keypoint', w);
  chkAll(r.relatedStructures, anatIds, 'structure', w);
  ['name','rateRange','regularity'].forEach(k =>
    chk(typeof r[k] === 'string' && r[k].length > 2, `${w}: missing ${k}`));
  ['tagline','summary','mechanism','significance','management'].forEach(k =>
    chk(typeof r[k] === 'string' && r[k].length > 20, `${w}: missing/short ${k}`));
  chk(r.recognition?.length >= 3, `${w}: needs at least three recognition points`);
  chk(r.causes?.length >= 1, `${w}: no causes listed`);
  chk(r.highlights?.length >= 3, `${w}: needs at least three highlights`);
  chk(r.narration?.length >= 4, `${w}: needs at least four narration steps`);
  chk(r.measurements?.length >= 4, `${w}: needs at least four measurements`);

  (r.highlights || []).forEach(h => {
    chk(FEATURES.has(h.feature), `${w}: highlight has unknown feature "${h.feature}"`);
    chk(h.label && h.note, `${w}: highlight ${h.feature} missing label or note`);
  });
  (r.narration || []).forEach((n, i) => {
    chk(n.title && n.text, `${w}: narration step ${i} missing title or text`);
    chk(typeof n.duration === 'number' && n.duration > 0, `${w}: narration step ${i} bad duration`);
    if (n.highlight) chk(FEATURES.has(n.highlight), `${w}: narration step ${i} unknown highlight "${n.highlight}"`);
  });
  (r.measurements || []).forEach(m =>
    chk(m.label && m.value && m.normal, `${w}: measurement "${m.label}" missing a field`));

  // waveform: the parameters the engine needs, in the units it expects
  const f = r.waveform || {};
  chk(f, `${w}: no waveform`);
  ['rate','irregularity','pAmplitude','prInterval','qrsDuration','qrsAmplitude','stShift','tAmplitude','qtInterval']
    .forEach(k => chk(typeof f[k] === 'number', `${w}: waveform.${k} must be a number`));
  chk(ATRIAL.has(f.atrial), `${w}: waveform.atrial "${f.atrial}" is not a known atrial activity`);
  chk(QRS_SHAPES.has(f.qrsShape), `${w}: waveform.qrsShape "${f.qrsShape}" unknown`);
  if (f.stShape) chk(ST_SHAPES.has(f.stShape), `${w}: waveform.stShape "${f.stShape}" unknown`);
  if (f.tShape) chk(T_SHAPES.has(f.tShape), `${w}: waveform.tShape "${f.tShape}" unknown`);
  chk(f.rate > 0 && f.rate <= 320, `${w}: implausible rate ${f.rate}`);
  chk(f.qrsDuration > 0.03 && f.qrsDuration < 0.3, `${w}: implausible QRS duration ${f.qrsDuration}`);
  chk(f.qtInterval > 0.15 && f.qtInterval < 0.8, `${w}: implausible QT ${f.qtInterval}`);
  chk(f.irregularity >= 0 && f.irregularity <= 1, `${w}: irregularity must be 0–1`);
  if (f.atrial === 'sinus') chk(f.prInterval > 0, `${w}: a sinus rhythm needs a PR interval`);
  if (f.dropEvery) chk(f.dropEvery >= 2, `${w}: dropEvery must be 2 or more`);
  if (f.atrial === 'flutter' || f.atrial === 'dissociated') {
    chk(typeof f.atrialRate === 'number', `${w}: ${f.atrial} needs an atrialRate`);
  }

  // the bedside numbers the monitor displays
  const v = r.vitals || {};
  ['heartRate','spo2','respiratoryRate','bpSystolic','bpDiastolic'].forEach(k =>
    chk(typeof v[k] === 'number', `${w}: vitals.${k} must be a number`));
  chk(ALARMS.has(v.alarm), `${w}: vitals.alarm "${v.alarm}" unknown`);
  chk(typeof v.bedside === 'string' && v.bedside.length > 10, `${w}: vitals.bedside missing`);
  if (v.alarm !== 'normal') chk(v.alarmText, `${w}: an alarming rhythm needs vitals.alarmText`);
  chk(v.spo2 >= 0 && v.spo2 <= 100, `${w}: implausible SpO2 ${v.spo2}`);
});
ecgCats.forEach(c => chk(ecg.some(r => r.categoryId === c.id), `ecg category ${c.id} has no rhythms`));
chk(ecg.some(r => r.featured), 'at least one ECG rhythm should be featured');

// ---- Clinical examination ------------------------------------------------
const point = (p, where) =>
  chk(Array.isArray(p) && p.length === 3 && p.every(n => typeof n === 'number'),
      `${where}: position must be three numbers`);

const EXPECTED_LEADS = ['ra','la','rl','ll','v1','v2','v3','v4','v5','v6'];
chk(leads.length === 10, `expected 10 ECG leads, found ${leads.length}`);
EXPECTED_LEADS.forEach(id => chk(leadIds.has(id), `leads.json: missing electrode "${id}"`));
leads.forEach(l => {
  const w = `lead ${l.id}`;
  ['code','name','landmark','howToFind','why','views','colorName'].forEach(k =>
    chk(l[k], `${w}: missing ${k}`));
  chk(/^#[0-9a-f]{6}$/i.test(l.color), `${w}: bad color`);
  chk(['limb','precordial'].includes(l.group), `${w}: group must be limb or precordial`);
  point(l.position, w);
  if (l.positionFemale) point(l.positionFemale, `${w} (female)`);
  chk(l.pitfalls?.length >= 1, `${w}: list at least one common error`);
  chk(typeof l.order === 'number', `${w}: missing order`);
});

chk(sites.length === 5, `expected 5 auscultation areas, found ${sites.length}`);
sites.forEach(s => {
  const w = `auscultation ${s.id}`;
  ['name','shortName','location','valve','why','technique'].forEach(k => chk(s[k], `${w}: missing ${k}`));
  point(s.position, w);
  if (s.positionFemale) point(s.positionFemale, `${w} (female)`);
  chk(s.listenFor?.length >= 2, `${w}: listenFor needs at least two entries`);
  chk(s.soundIds?.length >= 1, `${w}: no sounds are audible here`);
  chkAll(s.soundIds, soundIds, 'heart sound', w);
});

const SHAPES = new Set(['thump','plateau','crescendo','decrescendo','diamond']);
sounds.forEach(h => {
  const w = `heart sound ${h.id}`;
  ['name','quality','description','mechanism'].forEach(k => chk(h[k], `${w}: missing ${k}`));
  chk(['normal','extra-sound','murmur'].includes(h.kind), `${w}: unknown kind ${h.kind}`);
  chk(['none','systolic','diastolic','continuous'].includes(h.timing), `${w}: unknown timing ${h.timing}`);
  chk(['low','medium','high'].includes(h.pitch), `${w}: unknown pitch ${h.pitch}`);
  chk(siteIds.has(h.bestHeardAt), `${w}: bestHeardAt "${h.bestHeardAt}" is not an auscultation area`);
  chkAll(h.relatedDiseases, disIds, 'disease', w);
  chkAll(h.references, refIds, 'reference', w);
  chk(typeof h.rate === 'number' && h.rate > 30 && h.rate < 200, `${w}: implausible rate`);
  chk(h.events?.length >= 2, `${w}: needs at least S1 and S2`);
  (h.events || []).forEach(e => {
    const ew = `${w} event ${e.id}`;
    chk(['sound','murmur','click'].includes(e.kind), `${ew}: unknown kind ${e.kind}`);
    chk(e.start >= 0 && e.start < 1, `${ew}: start must be 0–1 of the cycle`);
    chk(e.end > e.start && e.end <= 1, `${ew}: end must follow start and stay within the cycle`);
    chk(e.intensity > 0 && e.intensity <= 1, `${ew}: intensity must be 0–1`);
    chk(e.frequency > 10 && e.frequency < 2000, `${ew}: implausible frequency`);
    chk(e.bandwidth > 0, `${ew}: bandwidth must be positive`);
    chk(e.noise >= 0 && e.noise <= 1, `${ew}: noise must be 0–1`);
    if (e.shape) chk(SHAPES.has(e.shape), `${ew}: unknown shape ${e.shape}`);
    chk(e.label && e.note, `${ew}: missing label or note`);
  });
  // A murmur must actually be in the phase it claims.
  const s2 = (h.events || []).find(e => e.id === 's2');
  (h.events || []).filter(e => e.kind === 'murmur').forEach(e => {
    if (!s2) return;
    if (h.timing === 'systolic') chk(e.start < s2.start + 0.02, `${w}: a systolic murmur must start before S2`);
    if (h.timing === 'diastolic') chk(e.end > s2.start, `${w}: a diastolic murmur must run after S2`);
  });
});
sounds.forEach(h => chk(sites.some(s => s.soundIds.includes(h.id)),
  `heart sound ${h.id} is not audible at any auscultation area`));

landmarks.forEach(l => {
  const w = `landmark ${l.id}`;
  ['name','short','note'].forEach(k => chk(l[k], `${w}: missing ${k}`));
  chk(['bony','space','line','organ'].includes(l.kind), `${w}: unknown kind ${l.kind}`);
  point(l.position, w);
});

challenges.forEach(c => {
  const w = `challenge ${c.id}`;
  ['prompt','successText','failText','hint'].forEach(k => chk(c[k], `${w}: missing ${k}`));
  chk(['core','advanced'].includes(c.difficulty), `${w}: unknown difficulty`);
  if (c.mode === 'leads') chk(leadIds.has(c.targetId), `${w}: unknown lead "${c.targetId}"`);
  else if (c.mode === 'auscultation') chk(siteIds.has(c.targetId), `${w}: unknown site "${c.targetId}"`);
  else if (c.mode === 'rhythm') {
    chk(ecgIds.has(c.targetId), `${w}: unknown rhythm "${c.targetId}"`);
    chk(c.options?.length >= 3, `${w}: a rhythm question needs at least three options`);
    chkAll(c.options, ecgIds, 'rhythm', w);
    chk(c.options.includes(c.targetId), `${w}: the answer must be among the options`);
  } else err.push(`${w}: unknown mode "${c.mode}"`);
});
['leads','auscultation','rhythm'].forEach(m =>
  chk(challenges.some(c => c.mode === m), `no ${m} challenges defined`));

// ---- Clinical simulation -------------------------------------------------
/* Everything the simulation shows is content, so everything the simulation
   shows is checked here: that each case names a rhythm that exists, that its
   questions have exactly one right answer, that its auscultation findings are
   audible where they claim to be, and — the point of the whole exercise —
   that the vitals in the case agree with the waveform driving the monitor. */
const LEAD_CODES = new Set(['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']);
const SIM_LEVELS = new Set(simConfig.levels.map(l => l.id));
const SIM_STAGES = new Set(['brief','examination','electrodes','acquire','auscultation','interpret','score']);
const SIM_KINDS = new Set(['rhythm','systematic','interpretation','action']);
const caseIds = set(cases);
const ecgById = new Map(ecg.map(r => [r.id, r]));

['eyebrow','title','lede','cardTitle','cardText','cardCta','safetyNote','audioNote']
  .forEach(k => chk(typeof simConfig[k] === 'string' && simConfig[k].length > 3, `simulation/config.json: missing ${k}`));
chk(simConfig.levels?.length === 4, 'simulation/config.json: expected four difficulty levels');
simConfig.levels.forEach(l => {
  const w = `simulation level ${l.id}`;
  ['label','tagline','blurb'].forEach(k => chk(l[k], `${w}: missing ${k}`));
  chk(l.stages?.length >= 3, `${w}: needs at least three stages`);
  chkAll(l.stages, SIM_STAGES, 'stage', w);
  chk(l.stages[0] === 'brief', `${w}: must start at the bedside brief`);
  chk(l.stages.includes('electrodes') && l.stages.includes('acquire') && l.stages.includes('interpret'),
    `${w}: every level must place electrodes, acquire the ECG and interpret it`);
  chk(l.stages[l.stages.length - 1] === 'score', `${w}: must end with the debrief`);
  chkAll(l.questionKinds, SIM_KINDS, 'question kind', w);
  chk(l.questionKinds.includes('rhythm'), `${w}: every level asks for the rhythm`);
  chk(typeof l.toleranceScale === 'number' && l.toleranceScale > 0 && l.toleranceScale < 4, `${w}: implausible toleranceScale`);
  chk(typeof l.showPlacementGuides === 'boolean', `${w}: showPlacementGuides must be a boolean`);
  chk(typeof l.showVitalsUpfront === 'boolean', `${w}: showVitalsUpfront must be a boolean`);
});
SIM_STAGES.forEach(id => chk(simConfig.stageLabels.some(s => s.id === id), `simulation/config.json: no label for stage "${id}"`));
simConfig.stageLabels.forEach(s => chk(s.label && s.task, `simulation stage ${s.id}: missing label or task`));

// the flat torso the learner works on
chk(torso.width > 0 && torso.height > 0, 'simulation/torso.json: needs a view box');
chk(torso.electrodes?.length === 10, `simulation/torso.json: expected 10 electrode targets, found ${torso.electrodes?.length}`);
const torsoLeadIds = new Set();
torso.electrodes.forEach(e => {
  const w = `torso electrode ${e.leadId}`;
  chk(leadIds.has(e.leadId), `${w}: no such electrode in exam/leads.json`);
  torsoLeadIds.add(e.leadId);
  const lead = leads.find(l => l.id === e.leadId);
  if (lead) {
    chk(lead.code === e.code, `${w}: code "${e.code}" does not match leads.json ("${lead.code}")`);
    chk(lead.group === e.group, `${w}: group does not match leads.json`);
  }
  ['male','female'].forEach(sex => {
    const p = e[sex];
    chk(Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number'), `${w}: ${sex} position must be two numbers`);
    if (Array.isArray(p) && p.length === 2) {
      chk(p[0] >= 0 && p[0] <= torso.width && p[1] >= 0 && p[1] <= torso.height, `${w}: ${sex} position is outside the torso view box`);
    }
  });
  chk(typeof e.tolerance === 'number' && e.tolerance > 4 && e.tolerance < 80, `${w}: implausible tolerance`);
  chk(e.correction?.length > 20, `${w}: needs a correction message that says where the electrode belongs`);
  chk(e.cue?.length > 20, `${w}: needs a placement cue`);
});
EXPECTED_LEADS.forEach(id => chk(torsoLeadIds.has(id), `simulation/torso.json: missing electrode "${id}"`));
/* Targets must not overlap, or a click could satisfy two electrodes at once. */
for (let i = 0; i < torso.electrodes.length; i++) {
  for (let j = i + 1; j < torso.electrodes.length; j++) {
    const a = torso.electrodes[i], b = torso.electrodes[j];
    ['male','female'].forEach(sex => {
      const dx = a[sex][0] - b[sex][0], dy = a[sex][1] - b[sex][1];
      const d = Math.sqrt(dx * dx + dy * dy);
      chk(d > Math.max(a.tolerance, b.tolerance),
        `simulation/torso.json: ${a.code} and ${b.code} overlap on the ${sex} torso (${d.toFixed(0)} units apart)`);
    });
  }
}
chk(torso.auscultation?.length === 5, 'simulation/torso.json: expected 5 auscultation targets');
torso.auscultation.forEach(a => {
  chk(siteIds.has(a.siteId), `torso auscultation "${a.siteId}": no such auscultation area`);
  ['male','female'].forEach(sex =>
    chk(Array.isArray(a[sex]) && a[sex].length === 2, `torso auscultation ${a.siteId}: ${sex} position must be two numbers`));
  chk(typeof a.tolerance === 'number' && a.tolerance > 4, `torso auscultation ${a.siteId}: implausible tolerance`);
});

// scoring
chk(simScoring.sections?.length === 3, 'simulation/scoring.json: expected three scored sections');
simScoring.sections.forEach(s => {
  chk(['placement','analysis','reasoning'].includes(s.id), `scoring section "${s.id}" is unknown`);
  chk(s.label && s.description, `scoring section ${s.id}: missing label or description`);
  chk(typeof s.max === 'number' && s.max > 0, `scoring section ${s.id}: max must be positive`);
});
chk(typeof simScoring.placementPenalty === 'number' && simScoring.placementPenalty > 0, 'simulation/scoring.json: placementPenalty must be positive');
chk(typeof simScoring.hintPenalty === 'number' && simScoring.hintPenalty >= 0, 'simulation/scoring.json: hintPenalty must be a number');
chk(simScoring.bands?.length >= 3, 'simulation/scoring.json: needs at least three performance bands');
chk(simScoring.bands.some(b => b.min === 0), 'simulation/scoring.json: the lowest band must start at 0');
simScoring.bands.forEach((b, i) => {
  chk(b.label && b.note, `scoring band ${i}: missing label or note`);
  if (i > 0) chk(b.min < simScoring.bands[i - 1].min, `scoring band ${i}: bands must be listed best first`);
});

// the case library
chk(cases.length >= 12, `simulation: the case library is too small (${cases.length})`);
cases.forEach(c => {
  const w = `case ${c.id}`;
  ['title','presentingComplaint','interpretation','explanation','clinicalContext']
    .forEach(k => chk(typeof c[k] === 'string' && c[k].length > 20, `${w}: missing/short ${k}`));
  chk(c.levels?.length >= 1, `${w}: must be offered at at least one level`);
  chkAll(c.levels, SIM_LEVELS, 'level', w);
  chk(['core','intermediate','advanced'].includes(c.difficulty), `${w}: unknown difficulty "${c.difficulty}"`);
  chk(c.patient && typeof c.patient.age === 'number' && c.patient.age > 0 && c.patient.age < 110, `${w}: implausible patient age`);
  chk(['male','female'].includes(c.patient?.sex), `${w}: patient sex must be male or female`);
  chk(c.patient?.descriptor?.length > 5 && c.patient?.setting?.length > 5, `${w}: missing patient descriptor or setting`);
  chk(c.history?.length >= 2, `${w}: needs at least two history points`);
  chk(c.symptoms?.length >= 1, `${w}: needs at least one symptom line`);
  chk(c.examinationFindings?.length >= 3, `${w}: needs at least three examination findings`);
  chk(c.learningObjectives?.length >= 3, `${w}: needs at least three learning objectives`);
  chkAll(c.references, refIds, 'reference', w);
  chk(c.references?.length >= 1, `${w}: every case must carry at least one reference`);
  chkAll(c.relatedDiseases, disIds, 'disease', w);
  chkAll(c.relatedKeyPoints, kpIds, 'keypoint', w);

  // the rhythm that generates the tracing
  chk(ecgIds.has(c.ecgRhythmId), `${w}: unknown ECG rhythm "${c.ecgRhythmId}"`);
  const rhythm = ecgById.get(c.ecgRhythmId);

  // vitals must agree with the waveform, or the monitor contradicts the ECG
  const v = c.vitals || {};
  ['heartRate','spo2','respiratoryRate','bpSystolic','bpDiastolic'].forEach(k =>
    chk(typeof v[k] === 'number', `${w}: vitals.${k} must be a number`));
  chk(ALARMS.has(v.alarm), `${w}: vitals.alarm "${v.alarm}" unknown`);
  if (v.alarm !== 'normal') chk(v.alarmText, `${w}: an alarming case needs vitals.alarmText`);
  chk(typeof v.bedside === 'string' && v.bedside.length > 20, `${w}: vitals.bedside missing`);
  chk(v.spo2 >= 0 && v.spo2 <= 100, `${w}: implausible SpO2 ${v.spo2}`);
  chk(v.respiratoryRate >= 0 && v.respiratoryRate < 60, `${w}: implausible respiratory rate`);
  chk(v.bpSystolic === 0 || v.bpSystolic > v.bpDiastolic, `${w}: systolic pressure must exceed diastolic`);
  if (rhythm && v.heartRate > 0 && !v.heartRateLabel) {
    /* The monitor counts the rate off the waveform the engine generates, so a
       case whose displayed heart rate disagrees with its own waveform would
       show two different numbers for the same patient. */
    const generated = rhythm.waveform.rate;
    const tolerance = Math.max(6, generated * 0.12);
    chk(Math.abs(v.heartRate - generated) <= tolerance,
      `${w}: vitals.heartRate ${v.heartRate} disagrees with the waveform rate ${generated} of "${c.ecgRhythmId}"`);
  }

  // the systematic reading
  const e = c.ecg || {};
  ['rate','rhythm','pWaves','prInterval','qrs','axis','stSegment','tWaves'].forEach(k =>
    chk(typeof e[k] === 'string' && e[k].length > 3, `${w}: ecg.${k} missing`));
  chk(e.keyFindings?.length >= 2, `${w}: ecg.keyFindings needs at least two entries`);
  chk(e.keyLeads?.length >= 1, `${w}: ecg.keyLeads must name at least one lead`);
  chkAll(e.keyLeads, LEAD_CODES, 'lead', `${w} ecg.keyLeads`);
  chk(FEATURES.has(e.highlight), `${w}: ecg.highlight "${e.highlight}" is not an ECG feature`);
  Object.entries(e.leadOverrides || {}).forEach(([code, o]) => {
    chk(LEAD_CODES.has(code), `${w}: leadOverrides has unknown lead "${code}"`);
    Object.entries(o).forEach(([k, val]) => {
      chk(['p','q','r','s','st','t'].includes(k), `${w}: leadOverrides.${code} has unknown component "${k}"`);
      chk(typeof val === 'number' && Math.abs(val) <= 6, `${w}: leadOverrides.${code}.${k} is out of range`);
    });
  });
  /* A rhythm is something the ECG really does establish, so "atrial
     fibrillation" is a legitimate interpretation. Ischaemia, hypertrophy and
     electrolyte disturbance are not: the tracing is supportive evidence, and
     the wording has to say so. */
  if (rhythm && ['ischaemia', 'chamber', 'metabolic'].includes(rhythm.categoryId)) {
    chk(/consistent with|compatible with|suggest|supportive|cannot|does not establish/i.test(c.interpretation),
      `${w}: the interpretation of a ${rhythm.categoryId} case must be phrased as ECG findings supporting a diagnosis, not as the diagnosis itself`);
  }

  // auscultation findings must be audible where the case says they are
  (c.auscultation || []).forEach(a => {
    const aw = `${w} auscultation ${a.siteId}`;
    chk(siteIds.has(a.siteId), `${aw}: unknown auscultation area`);
    chk(soundIds.has(a.soundId), `${aw}: unknown heart sound "${a.soundId}"`);
    const site = sites.find(s => s.id === a.siteId);
    if (site) chk(site.soundIds.includes(a.soundId),
      `${aw}: "${a.soundId}" is not listed as audible at the ${a.siteId} area`);
    chk(a.note?.length > 20, `${aw}: needs a teaching note`);
  });

  // questions
  chk(c.questions?.length >= 3, `${w}: needs at least three questions`);
  const kinds = new Set((c.questions || []).map(q => q.kind));
  chk(kinds.has('rhythm'), `${w}: every case must ask for the rhythm`);
  const qIds = new Set();
  (c.questions || []).forEach(q => {
    const qw = `${w} question ${q.id}`;
    chk(!qIds.has(q.id), `${qw}: duplicate question id`);
    qIds.add(q.id);
    chk(SIM_KINDS.has(q.kind), `${qw}: unknown kind "${q.kind}"`);
    chk(q.prompt?.length > 10, `${qw}: missing prompt`);
    chk(q.explanation?.length > 20, `${qw}: missing explanation`);
    chk(q.options?.length >= 3, `${qw}: needs at least three options`);
    const correct = (q.options || []).filter(o => o.correct === true);
    chk(correct.length === 1, `${qw}: must have exactly one correct option (found ${correct.length})`);
    (q.options || []).forEach(o => {
      chk(o.id && o.text, `${qw}: option missing id or text`);
      chk(o.feedback?.length > 10, `${qw}: option "${o.id}" needs feedback explaining why`);
    });
    if (q.highlight) chk(FEATURES.has(q.highlight), `${qw}: unknown highlight "${q.highlight}"`);
    chkAll(q.leads, LEAD_CODES, 'lead', qw);
    if (q.kind === 'systematic') chk(q.step, `${qw}: a systematic question needs a step label`);
  });
});
/* Every level must have cases to draw on, or randomisation has nothing to pick. */
simConfig.levels.forEach(l =>
  chk(cases.filter(c => c.levels.includes(l.id)).length >= 3,
    `simulation level ${l.id}: needs at least three cases to randomise between`));
/* The library must actually cover the teaching patterns it claims to. */
['normal-sinus-rhythm','atrial-fibrillation','stemi','complete-heart-block','left-bundle-branch-block',
 'right-bundle-branch-block','left-ventricular-hypertrophy','nstemi-ischaemia','pericarditis','hyperkalaemia']
  .forEach(id => chk(cases.some(c => c.ecgRhythmId === id), `simulation: no case teaches "${id}"`));

// stats truthfulness
const statMap = Object.fromEntries(org.stats.map(s => [s.label, s.value]));
chk(+statMap['Anatomical structures'] === anat.length, `stat mismatch: anatomy ${statMap['Anatomical structures']} vs ${anat.length}`);
chk(+statMap['Disease modules'] === dis.length, `stat mismatch: diseases ${statMap['Disease modules']} vs ${dis.length}`);
chk(+statMap['Pathophysiology animations'] === anims.length, `stat mismatch: animations`);
chk(+statMap['Student teams'] === teams.length, `stat mismatch: teams`);

// ---- CIG organisational identity ----------------------------------------
['abbr','name','shortName','legalName','tagline','heroSub','heroKicker','missionStatement','visionStatement','whoWeAre']
  .forEach(k => chk(typeof org[k] === 'string' && org[k].length > 1, `org.json: missing ${k}`));
['name','short','faculty'].forEach(k => chk(org.university?.[k], `org.json: missing university.${k}`));
['alt','caption'].forEach(k => chk(org.crest?.[k], `org.json: missing crest.${k}`));
['eyebrow','title','body','primaryLabel','secondaryLabel','note'].forEach(k => chk(org.joinCta?.[k], `org.json: missing joinCta.${k}`));
['name','short','eyebrow','lede','blurb'].forEach(k => chk(org.learningHub?.[k], `org.json: missing learningHub.${k}`));

// ---- Navigation ----------------------------------------------------------
chk(Array.isArray(org.nav) && org.nav.length >= 4, 'org.json: nav must list the primary sections');
const KNOWN_ROUTES = new Set([
  '/', '/about', '/activities', '/leadership', '/journal', '/research',
  '/learn', '/learn/ecg', '/learn/examination', '/learn/simulation',
  '/learn/glossary', '/learn/keypoints', '/anatomy', '/diseases',
]);
/** Learning Hub resources — these must never be reached through /research. */
const HUB_ROUTES = new Set([
  '/learn', '/learn/ecg', '/learn/examination', '/learn/simulation',
  '/learn/glossary', '/learn/keypoints', '/anatomy', '/diseases',
]);
(org.nav || []).forEach(n => {
  ['href','label','short'].forEach(k => chk(n[k], `nav entry ${n.href || '?'}: missing ${k}`));
  chk(KNOWN_ROUTES.has((n.href || '').split('?')[0]), `nav entry "${n.href}" points at an unknown route`);
});
chk((org.nav || []).some(n => n.href === '/'), 'org.json: nav must include Home');
chk(new Set((org.nav || []).map(n => n.href)).size === (org.nav || []).length, 'org.json: nav contains duplicate entries');
chk(new Set((org.nav || []).map(n => n.label)).size === (org.nav || []).length, 'org.json: nav contains duplicate labels');

// ---- Learning Hub sections ----------------------------------------------
const METRICS = new Set(['structures','diseases','animations','keyPoints','glossary','references','ecgRhythms','auscultationSites','clinicalCases']);
hub.forEach(h => {
  ['title','text','href','icon','cta'].forEach(k => chk(h[k], `hub ${h.id}: missing ${k}`));
  chk(METRICS.has(h.metric), `hub ${h.id}: unknown metric "${h.metric}"`);
  const base = (h.href || '').split('?')[0].replace(/\/[^/]*$/, m => m);
  chk(KNOWN_ROUTES.has(base) || KNOWN_ROUTES.has(base.replace(/\/[^/]+$/, '')), `hub ${h.id}: href "${h.href}" points at an unknown route`);
  // Regression guard. The Glossary and the Key Points used to be tabs inside
  // Research, so every Hub card that opened one navigated the learner out of
  // the Learning Hub. A Hub card must stay inside the Hub.
  const target = (h.href || '').split('?')[0];
  chk(
    HUB_ROUTES.has(target) || target.startsWith('/diseases/') || target.startsWith('/anatomy'),
    `hub ${h.id}: href "${h.href}" leaves the Learning Hub — hub resources must not point at Research or any other CIG section`,
  );
});
// The eight Learning Hub resources the platform promises.
['anatomy','diseases','ecg','examination','simulation','animations','keypoints','glossary']
  .forEach(id => chk(hub.some(h => h.id === id), `hub: missing the "${id}" card`));

// ---- Research section ----------------------------------------------------
['eyebrow','title','lede'].forEach(k => chk(researchCfg[k], `research-config.json: missing ${k}`));
chk(Array.isArray(researchCfg.commitment) && researchCfg.commitment.length >= 1, 'research-config.json: commitment must list at least one item');
(researchCfg.commitment || []).forEach(c => ['id','title','text','icon'].forEach(k => chk(c[k], `research commitment ${c.id || '?'}: missing ${k}`)));
['title','lede','emptyTitle','emptyDetail','emptyCta'].forEach(k => chk(researchCfg.published?.[k], `research-config.json: missing published.${k}`));
const idea = researchCfg.idea || {};
['eyebrow','title','body','ctaLabel','formTitle','formLede','submitLabel','disclaimer',
 'confirmationTitle','confirmationBody','mailtoTitle','mailtoBody','mailtoTitleManual',
 'mailtoBodyManual','errorTitle','errorBody','emailSubjectPrefix']
  .forEach(k => chk(typeof idea[k] === 'string' && idea[k].length > 1, `research-config.json: missing idea.${k}`));
chk(Array.isArray(idea.areas) && idea.areas.length >= 3, 'research-config.json: idea.areas must offer real choices');
chk(Array.isArray(idea.experienceOptions) && idea.experienceOptions.length >= 2, 'research-config.json: idea.experienceOptions must offer real choices');
chk(idea.endpoint === null || (typeof idea.endpoint === 'string' && /^https:\/\//.test(idea.endpoint)),
    'research-config.json: idea.endpoint must be null or an https:// URL');
// The endpoint ships to the browser, so it must never carry a secret.
chk(!/(api[-_]?key|secret|token|password|bearer)/i.test(String(idea.endpoint ?? '')),
    'research-config.json: idea.endpoint looks like it contains a credential — the form is client-side, never put a key in it');
// Research is CIG's own work only: nothing here may be demo content.
research.forEach(r => {
  ['id','title','abstract','category'].forEach(k => chk(r[k], `research ${r.id || '?'}: missing ${k}`));
  chk(Array.isArray(r.authors) && r.authors.length, `research ${r.id}: needs at least one author`);
  chk(!r.placeholder, `research ${r.id}: placeholder records must not be published as CIG research — keep them in content/research.example.json`);
  chk(!/\bdemo\b|placeholder/i.test(`${r.title} ${r.abstract}`), `research ${r.id}: reads as demo content`);
});

// ---- Journal -------------------------------------------------------------
['eyebrow','name','short','title','lede','about'].forEach(k => chk(journal[k], `journal.json: missing ${k}`));
['title','detail'].forEach(k => chk(journal.empty?.[k], `journal.json: missing empty.${k}`));
chk(Array.isArray(journal.issues), 'journal.json: issues must be an array');
(journal.issues || []).forEach(i => {
  ['id','title','date','summary'].forEach(k => chk(i[k], `journal issue ${i.id || '?'}: missing ${k}`));
  chk(Array.isArray(i.articles), `journal issue ${i.id}: articles must be an array`);
});
(journal.sections || []).forEach(s => {
  ['id','title','text','icon','href','cta'].forEach(k => chk(s[k], `journal section ${s.id || '?'}: missing ${k}`));
  chk(KNOWN_ROUTES.has((s.href || '').split('?')[0]), `journal section ${s.id}: href "${s.href}" points at an unknown route`);
});
chk(journal.submissions?.title && journal.submissions?.text, 'journal.json: missing submissions copy');

// ---- Activities / events -------------------------------------------------
events.forEach(e => {
  ['title','kind','icon','when','where','audience','text'].forEach(k => chk(e[k], `event ${e.id}: missing ${k}`));
});

// every disease category populated
dcats.forEach(c => chk(dis.some(d => d.categoryId === c.id), `disease category ${c.id} has no diseases`));
cats.categories.forEach(c => chk(anat.some(s => s.category === c.id), `anatomy category ${c.id} has no structures`));

console.log(`counts: ${hub.length} hub sections, ${events.length} events, ${anat.length} structures, ${dis.length} diseases, ${anims.length} animations, ${kps.length} key points, ${gloss.length} glossary, ${people.length} people, ${teams.length} teams, ${research.length} research, ${refs.length} references`);
console.log(`clinical: ${ecg.length} ECG rhythms in ${ecgCats.length} families, ${leads.length} electrodes, ${sites.length} auscultation areas, ${sounds.length} heart sounds, ${landmarks.length} landmarks, ${challenges.length} challenges`);
console.log(`simulation: ${cases.length} clinical cases across ${simConfig.levels.length} difficulty levels, ${cases.reduce((n, c) => n + c.questions.length, 0)} questions, ${torso.electrodes.length} electrode targets, ${torso.auscultation.length} auscultation targets`);
if (err.length) { console.log('\nERRORS (' + err.length + '):'); err.forEach(e => console.log(' - ' + e)); process.exit(1); }
console.log('\nAll cross-references valid.');
