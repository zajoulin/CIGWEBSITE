/* ==========================================================================
   CIG — Content access layer
   --------------------------------------------------------------------------
   Every component reads content through this module. It provides typed
   collections, O(1) lookup maps, derived structures (the leadership hierarchy)
   and the search index — so no component ever touches raw data.
   ========================================================================== */

import { rawContent } from '../data/content.generated';
import type {
  AnatomicalStructure,
  AuscultationSite,
  CigEvent,
  ClinicalCase,
  HubSection,
  AnatomyCategory,
  AnatomyCategoryDef,
  AnatomyGroupDef,
  Disease,
  DiseaseAnimation,
  DiseaseCategoryDef,
  EcgCategoryDef,
  EcgCategoryId,
  EcgLead,
  EcgRhythm,
  ExamChallenge,
  GlossaryTerm,
  HeartSound,
  KeyPointTopic,
  OrgConfig,
  Person,
  Reference,
  ResearchItem,
  ResearchConfig,
  JournalConfig,
  SimLevel,
  SimLevelId,
  SimScoringConfig,
  SimulationConfig,
  SurfaceLandmark,
  Team,
  TorsoMap,
} from './types';

export const org: OrgConfig = rawContent.org;
export const people: Person[] = rawContent.people;
export const teams: Team[] = rawContent.teams;
export const references: Reference[] = rawContent.references;
export const anatomyGroups: AnatomyGroupDef[] = rawContent.anatomyGroups;
export const anatomyCategories: AnatomyCategoryDef[] = rawContent.anatomyCategories;
export const structures: AnatomicalStructure[] = rawContent.structures;
export const diseaseCategories: DiseaseCategoryDef[] = rawContent.diseaseCategories;
export const diseases: Disease[] = rawContent.diseases;
export const animations: DiseaseAnimation[] = rawContent.animations;
export const keyPoints: KeyPointTopic[] = rawContent.keyPoints;
export const glossary: GlossaryTerm[] = rawContent.glossary;
export const research: ResearchItem[] = rawContent.research;
export const researchConfig: ResearchConfig = rawContent.researchConfig;
export const journal: JournalConfig = rawContent.journal;
export const hubSections: HubSection[] = rawContent.hub;
export const events: CigEvent[] = rawContent.events;

/* ------------------------------------- ECG & clinical examination ------- */

export const ecgCategories: EcgCategoryDef[] = rawContent.ecgCategories;
export const ecgRhythms: EcgRhythm[] = rawContent.ecgRhythms;
export const ecgLeads: EcgLead[] = [...rawContent.ecgLeads].sort((a, b) => a.order - b.order);
export const auscultationSites: AuscultationSite[] = [...rawContent.auscultationSites].sort(
  (a, b) => a.order - b.order,
);
export const heartSounds: HeartSound[] = rawContent.heartSounds;
export const surfaceLandmarks: SurfaceLandmark[] = rawContent.surfaceLandmarks;
export const examChallenges: ExamChallenge[] = rawContent.examChallenges;

/* ------------------------------------------------- Clinical simulation -- */

export const simulationConfig: SimulationConfig = rawContent.simulationConfig;
export const torsoMap: TorsoMap = rawContent.torsoMap;
export const simScoring: SimScoringConfig = rawContent.simScoring;
export const clinicalCases: ClinicalCase[] = rawContent.clinicalCases;

/* ------------------------------------------------------------- Lookups -- */

const index = <T extends { id: string }>(items: T[]): Map<string, T> =>
  new Map(items.map((i) => [i.id, i]));

export const personById = index(people);
export const teamById = index(teams);
export const structureById = index(structures);
export const diseaseById = index(diseases);
export const keyPointById = index(keyPoints);
export const animationById = index(animations);
export const referenceById = index(references);
export const glossaryById = index(glossary);
export const anatomyCategoryById = index(anatomyCategories);
export const diseaseCategoryById = index(diseaseCategories);
export const ecgRhythmById = index(ecgRhythms);
export const ecgCategoryById = index(ecgCategories);
export const ecgLeadById = index(ecgLeads);
export const auscultationSiteById = index(auscultationSites);
export const heartSoundById = index(heartSounds);
export const surfaceLandmarkById = index(surfaceLandmarks);
export const clinicalCaseById = index(clinicalCases);
export const simLevelById = index(simulationConfig.levels);

/** Torso electrode targets, in the order they should be placed. */
export const torsoElectrodes = [...torsoMap.electrodes].sort((a, b) => a.order - b.order);
export const torsoElectrodeByLead = new Map(torsoMap.electrodes.map((e) => [e.leadId, e]));
export const torsoAuscultationBySite = new Map(
  torsoMap.auscultation.map((a) => [a.siteId, a]),
);

/** Every case offered at a given difficulty level. */
export const casesForLevel = (levelId: SimLevelId): ClinicalCase[] =>
  clinicalCases.filter((c) => c.levels.includes(levelId));

/**
 * Picks a case at random from the validated library for this level, never
 * repeating the one just completed while an alternative exists.
 *
 * Randomisation selects *among reviewed cases*. It never generates waveform
 * parameters, vitals or findings, because a randomly assembled ECG would not
 * be guaranteed to correspond to a real clinical picture.
 */
export const randomCaseForLevel = (
  levelId: SimLevelId,
  excludeId?: string | null,
): ClinicalCase | null => {
  const pool = casesForLevel(levelId);
  if (!pool.length) return null;
  const choices = pool.length > 1 && excludeId ? pool.filter((c) => c.id !== excludeId) : pool;
  const list = choices.length ? choices : pool;
  return list[Math.floor(Math.random() * list.length)];
};

export const simLevels: SimLevel[] = simulationConfig.levels;

/** Rhythms grouped by category, in the order the categories are declared. */
export const ecgRhythmsByCategory = (categoryId: EcgCategoryId): EcgRhythm[] =>
  ecgRhythms.filter((r) => r.categoryId === categoryId);

/** Every heart sound audible at one auscultation site, best first. */
export const soundsAtSite = (siteId: string): HeartSound[] => {
  const site = auscultationSiteById.get(siteId);
  if (!site) return [];
  return site.soundIds
    .map((id) => heartSoundById.get(id))
    .filter((s): s is HeartSound => Boolean(s));
};

export const challengesFor = (mode: ExamChallenge['mode']): ExamChallenge[] =>
  examChallenges.filter((c) => c.mode === mode);

/** Structures keyed by the 3D mesh name they map to. */
export const structureByMesh = new Map(structures.map((s) => [s.meshName, s]));

/* -------------------------------------------------- Derived collections -- */

export const president = people.find((p) => p.role === 'president') ?? null;
export const vicePresidents = people.filter((p) => p.role === 'vice-president');

export interface TeamWithPeople {
  team: Team;
  head: Person | null;
  members: Person[];
}

/** The leadership hierarchy: president → vice presidents → team heads → members. */
export const teamsWithPeople: TeamWithPeople[] = teams.map((team) => ({
  team,
  head: personById.get(team.headId) ?? null,
  members: team.memberIds
    .map((id) => personById.get(id))
    .filter((p): p is Person => Boolean(p)),
}));

export const teamHeads: Person[] = teamsWithPeople
  .map((t) => t.head)
  .filter((p): p is Person => Boolean(p));

export const structuresByCategory = (category: AnatomyCategory): AnatomicalStructure[] =>
  structures.filter((s) => s.category === category);

export const diseasesByCategory = (categoryId: string): Disease[] =>
  diseases.filter((d) => d.categoryId === categoryId);

export const featuredDiseases: Disease[] = diseases.filter((d) => d.featured);

export const resolveReferences = (ids: string[]): Reference[] =>
  ids.map((id) => referenceById.get(id)).filter((r): r is Reference => Boolean(r));

export const teamOf = (person: Person): Team | null =>
  person.teamId ? (teamById.get(person.teamId) ?? null) : null;

/** Research categories and types present in the data, for filter controls. */
export const researchCategories: string[] = Array.from(
  new Set(research.map((r) => r.category)),
).sort();

export const researchYears: number[] = Array.from(new Set(research.map((r) => r.year))).sort(
  (a, b) => b - a,
);

export const researchTags: string[] = Array.from(
  new Set(research.flatMap((r) => r.tags)),
).sort();

export const keyPointCategories: string[] = Array.from(
  new Set(keyPoints.map((k) => k.category)),
).sort();

/* --------------------------------------------------------- Search index -- */

export type SearchKind =
  | 'structure'
  | 'disease'
  | 'keypoint'
  | 'glossary'
  | 'research'
  | 'ecg'
  | 'exam'
  | 'case';

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  /** Lower-cased haystack of everything worth matching against. */
  haystack: string;
  color?: string;
}

const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildIndex = (): SearchEntry[] => {
  const out: SearchEntry[] = [];

  for (const s of structures) {
    out.push({
      id: s.id,
      kind: 'structure',
      title: s.name,
      subtitle: anatomyCategoryById.get(s.category)?.label ?? 'Anatomy',
      color: s.color,
      haystack: norm(
        [
          s.name,
          s.abbr ?? '',
          s.latin ?? '',
          s.synonyms.join(' '),
          s.summary,
          s.keyPoints.join(' '),
          s.pathology.map((p) => p.name).join(' '),
          s.physiology.concepts.join(' '),
          s.clinical.conditions.join(' '),
        ].join(' '),
      ),
    });
  }

  for (const d of diseases) {
    out.push({
      id: d.id,
      kind: 'disease',
      title: d.name,
      subtitle: diseaseCategoryById.get(d.categoryId)?.label ?? 'Disease',
      haystack: norm(
        [
          d.name,
          d.abbr ?? '',
          d.tagline,
          d.overview,
          d.keyTakeaways.join(' '),
          d.clinical.symptoms.join(' '),
          d.clinical.signs.join(' '),
          d.complications.join(' '),
        ].join(' '),
      ),
    });
  }

  for (const k of keyPoints) {
    out.push({
      id: k.id,
      kind: 'keypoint',
      title: k.title,
      subtitle: k.category,
      haystack: norm(
        [k.title, k.summary, k.category, k.pearls.join(' '), k.sections.map((s) => s.heading).join(' ')].join(' '),
      ),
    });
  }

  for (const g of glossary) {
    out.push({
      id: g.id,
      kind: 'glossary',
      title: g.term,
      subtitle: 'Glossary',
      haystack: norm([g.term, g.definition, g.formula ?? '', g.typicalValue ?? ''].join(' ')),
    });
  }

  for (const r of ecgRhythms) {
    out.push({
      id: r.id,
      kind: 'ecg',
      title: r.name,
      subtitle: ecgCategoryById.get(r.categoryId)?.label ?? 'ECG',
      haystack: norm(
        [
          r.name,
          r.abbr ?? '',
          r.tagline,
          r.summary,
          r.mechanism,
          r.recognition.join(' '),
          r.causes.join(' '),
        ].join(' '),
      ),
    });
  }

  for (const l of ecgLeads) {
    out.push({
      id: l.id,
      kind: 'exam',
      title: `${l.code} — ${l.name}`,
      subtitle: 'ECG lead placement',
      color: l.color,
      haystack: norm([l.code, l.name, l.landmark, l.howToFind, l.why, l.views].join(' ')),
    });
  }

  for (const s of auscultationSites) {
    out.push({
      id: s.id,
      kind: 'exam',
      title: s.name,
      subtitle: 'Auscultation area',
      haystack: norm(
        [s.name, s.shortName, s.location, s.valve, s.why, s.listenFor.join(' ')].join(' '),
      ),
    });
  }

  for (const h of heartSounds) {
    out.push({
      id: h.id,
      kind: 'exam',
      title: h.name,
      subtitle: h.kind === 'murmur' ? 'Murmur' : 'Heart sound',
      haystack: norm(
        [h.name, h.quality, h.description, h.mechanism, h.associated.join(' ')].join(' '),
      ),
    });
  }

  for (const c of clinicalCases) {
    out.push({
      id: c.id,
      kind: 'case',
      title: c.title,
      subtitle: 'Clinical simulation case',
      haystack: norm(
        [
          c.title,
          c.presentingComplaint,
          c.interpretation,
          c.patient.descriptor,
          c.symptoms.join(' '),
          c.ecg.keyFindings.join(' '),
          c.learningObjectives.join(' '),
        ].join(' '),
      ),
    });
  }

  for (const r of research) {
    out.push({
      id: r.id,
      kind: 'research',
      title: r.title,
      subtitle: r.category,
      haystack: norm([r.title, r.authors.join(' '), r.abstract, r.tags.join(' '), r.category].join(' ')),
    });
  }

  return out;
};

export const searchIndex: SearchEntry[] = buildIndex();

export interface SearchOptions {
  kinds?: SearchKind[];
  limit?: number;
}

/**
 * Ranked substring search. Scores exact title matches highest, then title
 * prefix, then title substring, then body matches — and requires every query
 * token to appear somewhere, so multi-word queries narrow rather than widen.
 */
export const search = (query: string, options: SearchOptions = {}): SearchEntry[] => {
  const q = norm(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  const kinds = options.kinds;
  const limit = options.limit ?? 12;

  const scored: { entry: SearchEntry; score: number }[] = [];

  for (const entry of searchIndex) {
    if (kinds && !kinds.includes(entry.kind)) continue;
    if (!tokens.every((t) => entry.haystack.includes(t))) continue;

    const title = norm(entry.title);
    let score = 1;
    if (title === q) score = 100;
    else if (title.startsWith(q)) score = 80;
    else if (title.includes(q)) score = 60;
    else if (tokens.every((t) => title.includes(t))) score = 40;
    else if (entry.haystack.includes(q)) score = 20;

    // Prefer anatomy and disease results when scores tie.
    if (entry.kind === 'structure') score += 3;
    else if (entry.kind === 'disease') score += 2;

    // Shorter titles are usually the more specific match.
    score += Math.max(0, 20 - title.length) / 20;

    scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
  return scored.slice(0, limit).map((s) => s.entry);
};

/* ---------------------------------------------------------- Statistics -- */

export const contentStats = {
  structures: structures.length,
  diseases: diseases.length,
  animations: animations.length,
  ecgRhythms: ecgRhythms.length,
  ecgLeads: ecgLeads.length,
  auscultationSites: auscultationSites.length,
  heartSounds: heartSounds.length,
  clinicalCases: clinicalCases.length,
  keyPoints: keyPoints.length,
  glossary: glossary.length,
  teams: teams.length,
  people: people.length,
  research: research.length,
  references: references.length,
  events: events.length,
};
