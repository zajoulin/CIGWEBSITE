import type {
  AnatomicalStructure,
  AuscultationSite,
  CigEvent,
  ClinicalCase,
  HubSection,
  AnatomyCategoryDef,
  AnatomyGroupDef,
  Disease,
  DiseaseAnimation,
  DiseaseCategoryDef,
  EcgCategoryDef,
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
  SimulationConfig,
  SimScoringConfig,
  SurfaceLandmark,
  Team,
  TorsoMap,
} from './types';

/** The shape of the compiled content bundle produced by scripts/gen-content.mjs. */
export interface ContentBundle {
  ecgCategories: EcgCategoryDef[];
  ecgRhythms: EcgRhythm[];
  ecgLeads: EcgLead[];
  auscultationSites: AuscultationSite[];
  heartSounds: HeartSound[];
  surfaceLandmarks: SurfaceLandmark[];
  examChallenges: ExamChallenge[];
  simulationConfig: SimulationConfig;
  torsoMap: TorsoMap;
  clinicalCases: ClinicalCase[];
  simScoring: SimScoringConfig;
  org: OrgConfig;
  people: Person[];
  teams: Team[];
  references: Reference[];
  anatomyGroups: AnatomyGroupDef[];
  anatomyCategories: AnatomyCategoryDef[];
  structures: AnatomicalStructure[];
  diseaseCategories: DiseaseCategoryDef[];
  diseases: Disease[];
  animations: DiseaseAnimation[];
  keyPoints: KeyPointTopic[];
  glossary: GlossaryTerm[];
  research: ResearchItem[];
  researchConfig: ResearchConfig;
  journal: JournalConfig;
  hub: HubSection[];
  events: CigEvent[];
}
