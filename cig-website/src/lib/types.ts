/* ==========================================================================
   CIG — Content data models
   --------------------------------------------------------------------------
   Every piece of content on this platform is described by one of these types.
   Nothing is hard-coded into a UI component. To change what the site says,
   edit the JSON in /content — the interface adapts automatically.

   These models are also the contract a future CMS/admin dashboard writes to.
   ========================================================================== */

/* ---------------------------------------------------------------- People -- */

export type PersonRole =
  | 'president'
  | 'vice-president'
  | 'team-head'
  | 'member'
  | 'advisor';

export interface SocialLinks {
  email?: string;
  linkedin?: string;
  x?: string;
  instagram?: string;
  orcid?: string;
  researchgate?: string;
  scholar?: string;
}

export interface Person {
  id: string;
  name: string;
  /** Display title, e.g. "President", "Head — Research Team" */
  position: string;
  role: PersonRole;
  /** Team id this person belongs to; null for president / VPs. */
  teamId: string | null;
  /** Path or URL to a photograph. Null renders an elegant monogram fallback. */
  photo: string | null;
  bio: string;
  academicInterests: string[];
  cardiovascularInterests: string[];
  year?: string;
  socials?: SocialLinks;
  /** True while the entry is demo content awaiting real CIG data. */
  placeholder?: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  description: string;
  /** Person id of the team head. */
  headId: string;
  /** Person ids of the members reporting to that head. */
  memberIds: string[];
  icon: IconName;
  accent: 'crimson' | 'blue' | 'azure' | 'amber';
}

/* --------------------------------------------------------------- Anatomy -- */

export type AnatomyCategory =
  | 'chambers'
  | 'valves'
  | 'septa'
  | 'coronary'
  | 'conduction'
  | 'great-vessels'
  | 'peripheral-arteries'
  | 'peripheral-veins';

export type AnatomyGroup = 'heart' | 'great-vessels' | 'peripheral' | 'conduction';

export interface AnatomyCategoryDef {
  id: AnatomyCategory;
  group: AnatomyGroup;
  label: string;
  blurb: string;
}

export interface AnatomyGroupDef {
  id: AnatomyGroup;
  label: string;
  categories: AnatomyCategory[];
}

export interface AnatomyDetail {
  location: string;
  shape: string;
  relations: string[];
  attachments: string[];
  bloodSupply: string;
  venousDrainage: string;
  innervation: string;
  function: string;
}

export interface PhysiologyDetail {
  function: string;
  pressures: { label: string; value: string; note?: string }[];
  electrical: string;
  hemodynamics: string[];
  concepts: string[];
}

export interface PathologyLink {
  name: string;
  note: string;
  /** Optional id into the disease collection, enabling cross-navigation. */
  diseaseId?: string;
}

export interface ClinicalDetail {
  relevance: string;
  conditions: string[];
  examination: string[];
  imaging: string[];
  procedures: string[];
}

export interface AnatomicalStructure {
  id: string;
  name: string;
  /** Common abbreviation, e.g. "LV". */
  abbr?: string;
  latin?: string;
  category: AnatomyCategory;
  /** Identifier of the mesh in the 3D scene, e.g. "heart.left_ventricle". */
  meshName: string;
  /** Base colour used by the 3D model and the sidebar swatch. */
  color: string;
  /** One-line description used in tooltips and search results. */
  summary: string;
  /** Alternative names and spellings that search should match. */
  synonyms: string[];
  anatomy: AnatomyDetail;
  physiology: PhysiologyDetail;
  pathology: PathologyLink[];
  clinical: ClinicalDetail;
  keyPoints: string[];
  /** Reference ids into the references collection. */
  references: string[];
  related: {
    structures: string[];
    diseases: string[];
    keyPoints: string[];
  };
}

/* -------------------------------------------------------------- Diseases -- */

export interface DiseaseCategoryDef {
  id: string;
  label: string;
  blurb: string;
  icon: IconName;
}

export interface PathophysiologyStep {
  title: string;
  text: string;
}

export interface ProgressionStage {
  stage: string;
  text: string;
}

export interface Investigation {
  modality: string;
  findings: string;
}

export interface TreatmentGroup {
  name: string;
  detail: string;
}

export interface Disease {
  id: string;
  name: string;
  abbr?: string;
  categoryId: string;
  tagline: string;
  overview: string;
  riskFactors: { modifiable: string[]; nonModifiable: string[] };
  pathophysiology: PathophysiologyStep[];
  anatomyInvolved: string[];
  /** Structure ids for cross-navigation into the 3D anatomy viewer. */
  relatedStructures: string[];
  physiologyChanges: string[];
  progression: ProgressionStage[];
  clinical: { symptoms: string[]; signs: string[] };
  investigations: Investigation[];
  complications: string[];
  treatment: { principles: string; groups: TreatmentGroup[] };
  keyTakeaways: string[];
  references: string[];
  /** Id into the animations collection, or null if none exists yet. */
  animationId: string | null;
  relatedKeyPoints: string[];
  featured?: boolean;
}

/* ------------------------------------------------------------ Animations -- */

export type AnimationSceneId =
  /* Coronary and myocardial */
  | 'atherosclerosis'
  | 'myocardial-infarction'
  | 'stable-angina'
  | 'heart-failure'
  | 'cardiomyopathy'
  /* Valvular */
  | 'aortic-stenosis'
  | 'aortic-regurgitation'
  | 'mitral-stenosis'
  | 'mitral-regurgitation'
  | 'tricuspid-regurgitation'
  | 'rheumatic-heart-disease'
  | 'infective-endocarditis'
  /* Rhythm and conduction */
  | 'atrial-fibrillation'
  | 'supraventricular-tachycardia'
  | 'ventricular-arrhythmias'
  | 'conduction-disorders'
  /* Aorta, veins and the pulmonary circulation */
  | 'aortic-aneurysm'
  | 'aortic-dissection'
  | 'pulmonary-embolism'
  | 'deep-vein-thrombosis'
  | 'pulmonary-hypertension'
  | 'peripheral-arterial-disease'
  | 'chronic-venous-insufficiency'
  /* Systemic, structural and pericardial */
  | 'hypertension'
  | 'congenital-heart-disease'
  | 'atrial-septal-defect'
  | 'pericardial-disease';

export interface AnimationStep {
  /** Short label, e.g. "Plaque development". */
  title: string;
  /** Explanatory sentence shown under the animation. */
  text: string;
  /** Relative duration weight for the timeline. */
  duration: number;
  /** Optional callouts pinned to the visualisation. */
  markers?: string[];
}

export interface DiseaseAnimation {
  id: AnimationSceneId;
  title: string;
  subtitle: string;
  /** Which renderer draws this scene. */
  scene: AnimationSceneId;
  steps: AnimationStep[];
  references: string[];
}

/* ============================================================================
   ECG & Electrocardiography
   ----------------------------------------------------------------------------
   A rhythm is described entirely as data: the parameters a waveform generator
   needs to synthesise it, the features worth pointing at, a narration timeline
   and the clinical text. Nothing about a rhythm lives in a React component.
   ========================================================================== */

export type EcgCategoryId =
  | 'sinus'
  | 'atrial'
  | 'supraventricular'
  | 'ventricular'
  | 'block'
  | 'bundle-branch'
  | 'chamber'
  | 'ischaemia'
  | 'metabolic';

export interface EcgCategoryDef {
  id: EcgCategoryId;
  label: string;
  blurb: string;
  /** Monitor accent colour for this family of rhythms. */
  accent: 'green' | 'amber' | 'red' | 'cyan';
}

/** How the QRS complex is drawn. */
export type QrsShape = 'narrow' | 'wide' | 'monomorphic' | 'chaotic';

/** The morphology of the ST segment between the J point and the T wave. */
export type StShape = 'flat' | 'convex' | 'concave' | 'downsloping' | 'upsloping';

export type TShape = 'normal' | 'peaked' | 'inverted' | 'flattened' | 'broad';

/** Atrial activity between ventricular complexes. */
export type AtrialActivity = 'sinus' | 'none' | 'fibrillatory' | 'flutter' | 'dissociated' | 'retrograde';

/**
 * Every parameter the waveform engine needs. Amplitudes are in millivolts and
 * intervals in seconds, so the generated trace can be measured against the
 * standard 25 mm/s, 10 mm/mV calibration the monitor draws.
 */
export interface EcgWaveform {
  /** Ventricular rate in beats per minute. */
  rate: number;
  /** Beat-to-beat variability, 0 = metronomic, 1 = irregularly irregular. */
  irregularity: number;
  /** Respiratory sinus arrhythmia depth, 0–1. */
  sinusArrhythmia?: number;

  /** What the atria are doing between QRS complexes. */
  atrial: AtrialActivity;
  /** Atrial rate when the atria are independent of the ventricles. */
  atrialRate?: number;
  /** P wave amplitude in mV (0 when absent). */
  pAmplitude: number;
  /** P wave duration in seconds. */
  pDuration?: number;

  /** PR interval in seconds, measured from P onset to QRS onset. */
  prInterval: number;
  /** Wenckebach: seconds added to the PR interval on each successive beat. */
  prIncrement?: number;
  /** Every nth atrial beat fails to conduct (Mobitz I and II). */
  dropEvery?: number;
  /** Conducted:blocked ratio for fixed-ratio block, e.g. 2 for 2:1 flutter. */
  conductionRatio?: number;

  qrsDuration: number;
  qrsAmplitude: number;
  qrsShape: QrsShape;
  /** Pathological Q wave depth in mV. */
  qAmplitude?: number;
  /** S wave depth in mV. */
  sAmplitude?: number;

  /** ST shift at the J point in mV; positive is elevation. */
  stShift: number;
  stShape?: StShape;

  tAmplitude: number;
  tShape?: TShape;
  /** U wave amplitude in mV — hypokalaemia makes it prominent. */
  uAmplitude?: number;
  /** QT interval in seconds. */
  qtInterval: number;

  /** Coarse fibrillatory baseline amplitude in mV (atrial fibrillation). */
  fibrillatory?: number;
  /** Slow baseline drift, 0–1. */
  wander?: number;
  /** Fine electrical/muscle noise, 0–1. */
  noise?: number;
}

/** A feature of the beat the learner can be shown. */
export type EcgFeatureId =
  | 'p'
  | 'pr'
  | 'qrs'
  | 'j'
  | 'st'
  | 't'
  | 'u'
  | 'qt'
  | 'rr'
  | 'baseline';

export interface EcgHighlight {
  /** Which part of the beat to shade. The engine computes the time window. */
  feature: EcgFeatureId;
  label: string;
  /** What the learner should notice, in one or two sentences. */
  note: string;
  /** Marks a feature that is abnormal in this rhythm. */
  abnormal?: boolean;
}

/** One step of the explanation that stays synchronised with the trace. */
export interface EcgNarrationStep {
  title: string;
  text: string;
  /** Relative duration weight, as in the pathophysiology animations. */
  duration: number;
  /** Feature highlighted automatically while this step is on screen. */
  highlight?: EcgFeatureId;
}

/** A measured interval shown in the analysis panel. */
export interface EcgMeasurement {
  label: string;
  value: string;
  normal: string;
  abnormal?: boolean;
}

/** The other bedside numbers displayed alongside the trace. */
export interface PatientVitals {
  heartRate: number;
  /** Displayed rate label when the monitor cannot count a rate, e.g. "- - -". */
  heartRateLabel?: string;
  spo2: number;
  respiratoryRate: number;
  bpSystolic: number;
  bpDiastolic: number;
  temperature?: number;
  /** Drives the monitor's alarm border, tone and banner. */
  alarm: 'normal' | 'advisory' | 'warning' | 'critical';
  alarmText?: string;
  /** One line of bedside context for the patient-room scene. */
  bedside: string;
}

export interface EcgRhythm {
  id: string;
  name: string;
  abbr?: string;
  categoryId: EcgCategoryId;
  tagline: string;
  /** Displayed rate range, e.g. "60–100 bpm". */
  rateRange: string;
  regularity: string;
  /** What the rhythm is. */
  summary: string;
  /** What is happening physiologically — the synchronised explanation. */
  mechanism: string;
  /** Stepwise recognition criteria. */
  recognition: string[];
  causes: string[];
  significance: string;
  management: string;
  waveform: EcgWaveform;
  vitals: PatientVitals;
  highlights: EcgHighlight[];
  narration: EcgNarrationStep[];
  measurements: EcgMeasurement[];
  /** Ids into the disease collection, for cross-navigation. */
  relatedDiseases: string[];
  relatedKeyPoints: string[];
  relatedStructures: string[];
  references: string[];
  /** Shown first in the rhythm rail. */
  featured?: boolean;
}

/* ============================================================================
   Clinical examination — leads, auscultation and heart sounds
   ========================================================================== */

/** A point on the 3D thorax, in model space. */
export type ChestPoint = [number, number, number];

export type ExamSex = 'male' | 'female';

export interface EcgLead {
  id: string;
  /** Display code, e.g. "V4". */
  code: string;
  name: string;
  group: 'limb' | 'precordial';
  /** Electrode cable colour, AHA convention. */
  color: string;
  colorName: string;
  /** Placement on the male thorax model. */
  position: ChestPoint;
  /** Placement on the female thorax model when it differs. */
  positionFemale?: ChestPoint;
  /** The anatomical landmark that defines the position. */
  landmark: string;
  /** How to find that landmark at the bedside. */
  howToFind: string;
  /** Why the position matters — the educational payload. */
  why: string;
  /** The region of myocardium this lead looks at. */
  views: string;
  pitfalls: string[];
  order: number;
}

export interface AuscultationSite {
  id: string;
  name: string;
  shortName: string;
  /** Surface location in words. */
  location: string;
  position: ChestPoint;
  positionFemale?: ChestPoint;
  valve: string;
  /** Why sound from that valve is loudest here. */
  why: string;
  listenFor: string[];
  technique: string;
  /** Heart sound ids audible at this site, best first. */
  soundIds: string[];
  order: number;
}

export type SoundEventKind = 'sound' | 'murmur' | 'click';

/**
 * One acoustic event inside the cardiac cycle. Timings are fractions of the
 * cycle with 0 at S1, which is what lets the audio, the waveform and the
 * systole/diastole timeline stay locked together.
 */
export interface SoundEvent {
  id: string;
  label: string;
  kind: SoundEventKind;
  /** Fraction of the cardiac cycle, 0 = S1. */
  start: number;
  end: number;
  /** Relative loudness, 0–1. */
  intensity: number;
  /** Centre frequency in Hz. */
  frequency: number;
  /** Filter bandwidth in Hz — wide for murmurs, narrow for heart sounds. */
  bandwidth: number;
  /** 0 = pure tone, 1 = pure noise. Murmurs are turbulent, so noisy. */
  noise: number;
  shape?: 'thump' | 'plateau' | 'crescendo' | 'decrescendo' | 'diamond';
  note: string;
}

export interface HeartSound {
  id: string;
  name: string;
  kind: 'normal' | 'extra-sound' | 'murmur';
  timing: 'none' | 'systolic' | 'diastolic' | 'continuous';
  grade?: string;
  pitch: 'low' | 'medium' | 'high';
  quality: string;
  description: string;
  mechanism: string;
  /** Auscultation site id where it is loudest. */
  bestHeardAt: string;
  radiation?: string;
  manoeuvres?: string[];
  associated: string[];
  /** The acoustic model, which both the synthesiser and the timeline read. */
  events: SoundEvent[];
  /** Heart rate the sound is modelled at. */
  rate: number;
  relatedDiseases: string[];
  references: string[];
}

/** A named surface landmark shown on the 3D chest. */
export interface SurfaceLandmark {
  id: string;
  name: string;
  short: string;
  position: ChestPoint;
  positionFemale?: ChestPoint;
  note: string;
  kind: 'bony' | 'space' | 'line' | 'organ';
}

/** A question in the clinical-examination challenge mode. */
export interface ExamChallenge {
  id: string;
  mode: 'leads' | 'auscultation' | 'rhythm';
  prompt: string;
  /** Lead id, auscultation site id or rhythm id, depending on mode. */
  targetId: string;
  successText: string;
  failText: string;
  hint: string;
  difficulty: 'core' | 'advanced';
  /** Distractor rhythm ids for multiple-choice rhythm questions. */
  options?: string[];
}

/* -------------------------------------------------------------- Research -- */

export type ResearchType =
  | 'original-research'
  | 'review'
  | 'case-report'
  | 'abstract'
  | 'poster'
  | 'audit';

/**
 * Where a piece of CIG research has got to. Only records the group has
 * actually produced belong in content/research.json — the Research section
 * shows CIG's own work and nothing else.
 */
export type ResearchStatus =
  | 'in-progress'
  | 'submitted'
  | 'under-review'
  | 'accepted'
  | 'presented'
  | 'published';

export interface ResearchItem {
  id: string;
  title: string;
  authors: string[];
  year: number;
  type: ResearchType;
  category: string;
  abstract: string;
  keyFindings: string[];
  tags: string[];
  doi: string | null;
  link: string | null;
  pdf: string | null;
  /** Publication status, shown on the record. */
  status?: ResearchStatus;
  /** Human-readable publication or presentation date, e.g. "March 2026". */
  publicationDate?: string | null;
  /** Journal, conference or venue the work appeared in. */
  venue?: string | null;
  /** The CIG team or supervisors behind the work, where it should be credited. */
  team?: string | null;
  /** True while the entry is demo content awaiting real CIG data. */
  placeholder?: boolean;
}

/* -------------------------------------------- Research section & idea form -- */

/** One of the commitments shown in the CIG Research introduction. */
export interface ResearchCommitment {
  id: string;
  title: string;
  text: string;
  icon: IconName;
}

/**
 * The Research Idea submission form.
 *
 * `endpoint` is the ONLY thing that needs connecting before publication. Leave
 * it null and the form composes the submission into the visitor's own email
 * client addressed to the CIG contact address — nothing is stored and the
 * interface says so. Set it to the URL of CIG's own form service (Formspree,
 * Google Forms, a Netlify function, …) and the form POSTs the submission there
 * instead. It is a plain public endpoint URL: never put an API key or any
 * other credential in this file, because it ships to the browser.
 */
export interface ResearchIdeaConfig {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  formTitle: string;
  formLede: string;
  submitLabel: string;
  disclaimer: string;
  confirmationTitle: string;
  confirmationBody: string;
  mailtoTitle: string;
  mailtoBody: string;
  /** Shown instead of the above when there is no address to open a mail client with. */
  mailtoTitleManual: string;
  mailtoBodyManual: string;
  errorTitle: string;
  errorBody: string;
  areas: string[];
  experienceOptions: string[];
  endpoint: string | null;
  emailSubjectPrefix: string;
}

export interface ResearchConfig {
  eyebrow: string;
  title: string;
  lede: string;
  commitment: ResearchCommitment[];
  published: {
    title: string;
    lede: string;
    emptyTitle: string;
    emptyDetail: string;
    emptyCta: string;
  };
  idea: ResearchIdeaConfig;
}

/* --------------------------------------------------------------- Journal -- */

/** One article in an issue of the CIG Journal. */
export interface JournalArticle {
  id: string;
  title: string;
  authors: string[];
  kind: string;
  summary: string;
  link?: string | null;
  pdf?: string | null;
}

export interface JournalIssue {
  id: string;
  title: string;
  date: string;
  summary: string;
  cover?: string | null;
  link?: string | null;
  pdf?: string | null;
  articles: JournalArticle[];
}

export interface JournalConfig {
  eyebrow: string;
  name: string;
  short: string;
  title: string;
  lede: string;
  about: string;
  issues: JournalIssue[];
  empty: { title: string; detail: string };
  sections: {
    id: string;
    title: string;
    text: string;
    icon: IconName;
    href: string;
    cta: string;
  }[];
  submissions: { title: string; text: string; placeholder?: boolean };
}

/* ------------------------------------------------------------- Key points -- */

export interface KeyPointTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface KeyPointSection {
  heading: string;
  body?: string;
  facts?: string[];
  table?: KeyPointTable;
}

export interface KeyPointTopic {
  id: string;
  title: string;
  summary: string;
  icon: IconName;
  category: string;
  sections: KeyPointSection[];
  pearls: string[];
  references: string[];
  related: { structures: string[]; diseases: string[] };
}

/* -------------------------------------------------------------- Glossary -- */

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  formula?: string;
  typicalValue?: string;
  relatedAnatomy: string[];
  relatedPhysiology: string[];
  relatedDiseases: string[];
}

/* ------------------------------------------------------------ References -- */

export interface Reference {
  id: string;
  citation: string;
  source: string;
  url: string;
  /** Verified against the publisher's site while building this platform. */
  verified: boolean;
}

/* ------------------------------------------------- Organisation & config -- */

export interface TimelineEntry {
  date: string;
  title: string;
  text: string;
}

export interface MissionPillar {
  id: string;
  title: string;
  text: string;
  icon: IconName;
}

export interface Activity {
  title: string;
  text: string;
  icon: IconName;
}

export interface NavEntry {
  href: string;
  label: string;
  short: string;
}

export interface OrgConfig {
  abbr: string;
  name: string;
  shortName: string;
  legalName: string;
  /** The host institution the group belongs to. */
  university: {
    name: string;
    short: string;
    faculty: string;
    placeholder: boolean;
  };
  /** Alternative text and caption for the official crest. */
  crest: { alt: string; caption: string };
  tagline: string;
  heroHeadline: { lead: string; accent: string; tail: string };
  heroSub: string;
  heroKicker: string;
  missionStatement: string;
  visionStatement: string;
  whoWeAre: string;
  joinCta: {
    eyebrow: string;
    title: string;
    body: string;
    primaryLabel: string;
    secondaryLabel: string;
    note: string;
  };
  learningHub: {
    name: string;
    short: string;
    eyebrow: string;
    lede: string;
    blurb: string;
  };
  /** Primary navigation, so the information architecture stays content-driven. */
  nav: NavEntry[];
  mission: MissionPillar[];
  activities: Activity[];
  timeline: TimelineEntry[];
  contact: {
    email: string;
    institution: string;
    address: string;
    placeholder: boolean;
  };
  socials: { label: string; icon: IconName; url: string }[];
  disclaimer: { title: string; body: string };
  stats: { value: string; label: string }[];
}

/* ------------------------------------------------------ Learning Hub ---- */

/** A card in the CIG Cardiovascular Learning Hub. */
export interface HubSection {
  id: string;
  title: string;
  text: string;
  href: string;
  icon: IconName;
  /** Which content count to display, e.g. "structures" or "diseases". */
  metric:
    | 'structures'
    | 'diseases'
    | 'animations'
    | 'keyPoints'
    | 'glossary'
    | 'references'
    | 'ecgRhythms'
    | 'auscultationSites'
    | 'clinicalCases';
  cta: string;
  /** Marks the flagship card, rendered full width at the head of the hub. */
  featured?: boolean;
}

/* ---------------------------------------------------------- Activities -- */

/** A scheduled CIG activity. Placeholder entries are flagged in the interface. */
export interface CigEvent {
  id: string;
  title: string;
  kind: string;
  icon: IconName;
  when: string;
  where: string;
  audience: string;
  text: string;
  placeholder?: boolean;
}

/* ============================================================================
   Clinical simulation — the Learning Hub's bedside module
   ----------------------------------------------------------------------------
   Everything the simulation does is described by data: which electrodes the
   learner must place and where they belong on the two-dimensional torso, which
   cases exist, what each case's ECG shows, what the learner is asked, and how
   the attempt is scored. No case, question or score is written into a
   component, so a cardiologist can review the whole library as JSON and a CMS
   can serve it later without any code change.
   ========================================================================== */

/** The twelve conventional surface leads, by their printed codes. */
export type LeadCode =
  | 'I'
  | 'II'
  | 'III'
  | 'aVR'
  | 'aVL'
  | 'aVF'
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6';

/**
 * A per-lead adjustment applied on top of the generic lead projection.
 *
 * The waveform engine synthesises one cardiac vector, and the projections in
 * src/lib/ecg/leads.ts turn that vector into a plausible tracing for each
 * lead. What a fixed projection cannot know is the *territory* of a case: an
 * inferior infarct elevates II, III and aVF and depresses I and aVL, while an
 * anterior one does the opposite. So the case states its own per-lead scaling
 * and the module applies it — which keeps the twelve-lead ECG coherent with
 * the case rather than generically shaped.
 *
 * Every value is a multiplier on that component's amplitude, so 0 removes the
 * component and a negative value inverts it.
 */
export interface LeadOverride {
  p?: number;
  q?: number;
  r?: number;
  s?: number;
  st?: number;
  t?: number;
}

/** A point on the two-dimensional torso, in the torso map's own view units. */
export type TorsoPoint = [number, number];

export type SimSex = ExamSex;

/** One electrode target on the flat torso used by the simulation. */
export interface TorsoElectrodeSite {
  /** Id in content/exam/leads.json — the clinical text lives there, not here. */
  leadId: string;
  code: string;
  group: 'limb' | 'precordial';
  order: number;
  male: TorsoPoint;
  female: TorsoPoint;
  /** Accepted radius around the target, in view units. */
  tolerance: number;
  /** Shown when the electrode is put down in the wrong place. */
  correction: string;
  /** One-line reminder shown while this electrode is the active task. */
  cue: string;
}

/** One auscultation target on the same torso. */
export interface TorsoAuscultationSite {
  /** Id in content/exam/auscultation.json. */
  siteId: string;
  male: TorsoPoint;
  female: TorsoPoint;
  tolerance: number;
}

/**
 * The flat torso the simulation draws. The artwork itself is generated in
 * code — as the anatomy and thorax models are — but every position the learner
 * is judged against is data.
 */
export interface TorsoMap {
  id: string;
  /** SVG view box the coordinates below are expressed in. */
  width: number;
  height: number;
  electrodes: TorsoElectrodeSite[];
  auscultation: TorsoAuscultationSite[];
}

/** How hard the learner has asked the simulation to be. */
export type SimLevelId = 'beginner' | 'intermediate' | 'advanced' | 'simulation';

/** A stage of the bedside workflow. */
export type SimStage =
  | 'brief'
  | 'examination'
  | 'electrodes'
  | 'acquire'
  | 'auscultation'
  | 'interpret'
  | 'score';

/** What a question is testing, which is also what it scores against. */
export type SimQuestionKind =
  | 'rhythm'
  | 'systematic'
  | 'interpretation'
  | 'action';

export interface SimLevel {
  id: SimLevelId;
  label: string;
  tagline: string;
  blurb: string;
  /** Stages the learner works through at this level, in order. */
  stages: SimStage[];
  /** Question kinds asked at this level. */
  questionKinds: SimQuestionKind[];
  /** Multiplier on every electrode tolerance — generous for beginners. */
  toleranceScale: number;
  /** Draws the target outlines on the torso before the electrode is placed. */
  showPlacementGuides: boolean;
  /** Reveals the case's presenting complaint and vitals before the ECG. */
  showVitalsUpfront: boolean;
}

export interface SimOption {
  id: string;
  text: string;
  correct?: boolean;
  /** Why this option is right or wrong — shown after the answer. */
  feedback: string;
}

export interface SimQuestion {
  id: string;
  kind: SimQuestionKind;
  /** The systematic step this question belongs to, e.g. "Rate" or "ST segment". */
  step?: string;
  prompt: string;
  options: SimOption[];
  explanation: string;
  /** Feature of the beat to shade on the ECG while this question is answered. */
  highlight?: EcgFeatureId;
  /** Leads worth looking at for this question. */
  leads?: LeadCode[];
}

/** The systematic read-out shown in the feedback panel. */
export interface SimEcgReading {
  rate: string;
  rhythm: string;
  pWaves: string;
  prInterval: string;
  qrs: string;
  axis: string;
  stSegment: string;
  tWaves: string;
  /** The findings that actually matter, in the order they should be noticed. */
  keyFindings: string[];
  /** Leads carrying the important abnormality. */
  keyLeads: LeadCode[];
  /** Feature of the beat the feedback panel shades. */
  highlight: EcgFeatureId;
  /** Per-lead amplitude adjustments that make the tracing territory-specific. */
  leadOverrides?: Partial<Record<LeadCode, LeadOverride>>;
}

/** What the learner hears when they auscultate this patient. */
export interface SimAuscultationFinding {
  /** Auscultation area id. */
  siteId: string;
  /** Heart sound id from content/exam/heart-sounds.json. */
  soundId: string;
  note: string;
}

/**
 * One fictional teaching case. Everything in it must agree: the complaint, the
 * observations, the waveform parameters, the auscultation findings and the
 * expected interpretation all describe the same patient.
 */
export interface ClinicalCase {
  id: string;
  title: string;
  /** Which levels this case is offered at. */
  levels: SimLevelId[];
  difficulty: 'core' | 'intermediate' | 'advanced';
  patient: {
    age: number;
    sex: SimSex;
    /** How the patient is described at the bedside, e.g. "62-year-old man". */
    descriptor: string;
    setting: string;
  };
  presentingComplaint: string;
  history: string[];
  symptoms: string[];
  examinationFindings: string[];
  vitals: PatientVitals;
  /** The rhythm whose waveform parameters generate this case's tracing. */
  ecgRhythmId: string;
  ecg: SimEcgReading;
  /** "ECG findings consistent with…" — never a bare diagnosis from the ECG. */
  interpretation: string;
  auscultation: SimAuscultationFinding[];
  questions: SimQuestion[];
  explanation: string;
  learningObjectives: string[];
  /** What the ECG cannot tell you on its own. */
  clinicalContext: string;
  relatedDiseases: string[];
  relatedKeyPoints: string[];
  references: string[];
}

/** One scored section of an attempt. */
export interface SimScoreSection {
  id: 'placement' | 'analysis' | 'reasoning';
  label: string;
  max: number;
  description: string;
}

export interface SimScoringConfig {
  sections: SimScoreSection[];
  /** Marks lost per misplaced electrode. */
  placementPenalty: number;
  /** Marks lost per landmark hint the learner asked for. */
  hintPenalty: number;
  /** Performance bands, best first; `min` is a fraction of the total. */
  bands: { min: number; label: string; note: string }[];
}

/** Module-level copy and the difficulty ladder, both editable as content. */
export interface SimulationConfig {
  eyebrow: string;
  title: string;
  lede: string;
  /** The card that leads into the module from the Learning Hub. */
  cardTitle: string;
  cardText: string;
  cardCta: string;
  /** Shown on the room, above everything else. */
  safetyNote: string;
  /** Labelling for the synthesised heart sounds. */
  audioNote: string;
  levels: SimLevel[];
  stageLabels: { id: SimStage; label: string; task: string }[];
}

/* ----------------------------------------------------------------- Icons -- */

export type IconName =
  | 'activity'
  | 'anatomy'
  | 'bed'
  | 'monitor'
  | 'mute'
  | 'sound'
  | 'torso'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'beaker'
  | 'book'
  | 'brain'
  | 'calendar'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'compass'
  | 'crosshair'
  | 'download'
  | 'ecg'
  | 'external'
  | 'eye'
  | 'eye-off'
  | 'filter'
  | 'flask'
  | 'focus'
  | 'globe'
  | 'graduation'
  | 'grid'
  | 'heart'
  | 'info'
  | 'layers'
  | 'lightbulb'
  | 'link'
  | 'list'
  | 'lungs'
  | 'mail'
  | 'megaphone'
  | 'menu'
  | 'microscope'
  | 'network'
  | 'pause'
  | 'people'
  | 'play'
  | 'pulse'
  | 'refresh'
  | 'restart'
  | 'search'
  | 'shield'
  | 'skip-back'
  | 'skip-forward'
  | 'sparkles'
  | 'stethoscope'
  | 'syringe'
  | 'target'
  | 'trending'
  | 'valve'
  | 'vessel'
  | 'warning'
  | 'wave';
