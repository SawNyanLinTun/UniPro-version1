
export interface Internship {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'remote' | 'hybrid' | 'onsite';
  duration: string;
  category: string;
  description: string;
  stipend: string;
  tags: string[];
  postedDate: string;
  deadline: string;
  requirements?: string[];
  skills?: string[];
}

export enum InternshipCategory {
  SOFTWARE = 'Software Development',
  DESIGN = 'Design',
  MARKETING = 'Marketing',
  DATA_SCIENCE = 'Data Science',
  BUSINESS = 'Business',
  FINANCE = 'Finance'
}

export type ApplicationStatus = 'applied' | 'under_review' | 'interview' | 'accepted' | 'rejected';

export interface Application {
  id: string;
  internshipId: string;
  role: string;
  company: string;
  status: ApplicationStatus;
  appliedDate: string;
}

/** Job listing returned by GET /jobs — shape is compatible with Internship. */
export type Job = Internship;

/** Canonical skill identifier from the backend taxonomy (e.g. "react", "docker"). */
export type SkillId = string;

export interface Skill {
  id: SkillId;
  name: string;
}

export interface StudentProfile {
  id: string;
  fullName: string;
  university: string;
  degree?: string;
  graduationYear?: number;
  gpa?: number | null;
  skills: SkillId[];
  cvFileName?: string;
}

/**
 * Multi-KPI scores returned by the matching backend.
 * All values are ratios in [0, 1]; the UI renders them as percentages.
 */
export interface KpiScores {
  /** Hard Skill Coverage Ratio: |required ∩ candidate| / |required| */
  hscr: number;
  /** Skill Gap Index: 1 - HSCR */
  sgi: number;
  /** Semantic Skill Set Alignment: embedding cosine similarity */
  sssa: number;
}

export interface MatchResult extends KpiScores {
  jobId: string;
  company: string;
  role: string;
  matchedSkills: SkillId[];
  missingSkills: SkillId[];
}

/** Result of POST /cv/extract on the FastAPI backend. */
export interface CvExtractResult {
  skills: SkillId[];
  gpa: number | null;
  education: string[];
  experience: string[];
}

/** Scholarship Ledger track categories. */
export type ScholarshipTrack = 'web_development' | 'accounting' | 'engineering';

/** On-chain style alumni record (hashed identity; frontend mock for now). */
export interface ScholarshipAlumni {
  id: string;
  track: ScholarshipTrack;
  /** Masked display name for UI (e.g. "S****k T."). */
  maskedName: string;
  /** SHA-256-style hash of the real student name. */
  nameHash: string;
  /** Short company label shown in UI. */
  companyLabel: string;
  /** SHA-256-style hash of company name. */
  companyHash: string;
  scholarshipYear: number;
  role: string;
  /** Skill tags used for demo CV coverage scoring. */
  skills: SkillId[];
  /** Alumni radar baseline (0–100 per axis). */
  radar: CvRadarScores;
}

/** Six-axis CV coverage scores for radar compare (0–100). */
export interface CvRadarScores {
  technicalSkills: number;
  experienceDepth: number;
  projects: number;
  softSkills: number;
  academicStrength: number;
  toolsStack: number;
}

export interface TokenWallet {
  balance: number;
}
