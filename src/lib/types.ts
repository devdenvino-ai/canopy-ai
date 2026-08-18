export type Role = "mentor" | "reviewer";

export type Level = 1 | 2 | 3 | 4 | 5;

/** A department's proposal policy for one role. Weights are relative; constraints are hard unless relaxed. */
export interface RuleSet {
  weights: {
    skill: number;
    location: number;
    level: number;
    capacity: number;
  };
  /** Candidate must be at least this many levels above the member. */
  minLevelGap: number;
  /** Candidate must belong to the same department. */
  sameDepartment: boolean;
  /** Max people one mentor/reviewer may carry. */
  maxAssigns: number;
}

export interface DepartmentRules {
  mentor: RuleSet;
  reviewer: RuleSet;
}

export interface Department {
  id: string;
  name: string;
  color: string;
  leadId: string;
  rules: DepartmentRules;
}

export interface Tribe {
  id: string;
  name: string;
  departmentId: string;
  leadId: string;
}

export interface Person {
  id: string;
  name: string;
  tribeId: string;
  level: Level;
  location: string;
  skills: string[];
  isMentor: boolean;
  isReviewer: boolean;
  mentorId: string | null;
  reviewerId: string | null;
}

export interface Activity {
  id: string;
  ts: number;
  text: string;
  tone: "success" | "info" | "warn";
}

export interface AppState {
  version: number;
  departments: Department[];
  tribes: Tribe[];
  people: Person[];
  activity: Activity[];
}

export interface ScoreParts {
  skill: number;
  location: number;
  level: number;
  capacity: number;
}

export interface ScoredCandidate {
  person: Person;
  score: number;
  parts: ScoreParts;
  reasons: string[];
  relaxed: string[];
  load: number;
  max: number;
}
