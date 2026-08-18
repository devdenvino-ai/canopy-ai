export type Role = "mentor" | "reviewer";

export type Level = 1 | 2 | 3 | 4 | 5;

export type RuleFactor = "skill" | "location" | "level" | "capacity";

/**
 * Rules are fully dynamic: a department's policy for a role is an ordered list
 * of rule items. Scoring rules carry a weight; constraint rules are hard gates
 * (relaxed one at a time by the engine when nobody qualifies).
 */
export type RuleMetric =
  | { type: "score"; factor: RuleFactor; weight: number }
  | { type: "min-level-gap"; gap: number }
  | { type: "same-department" }
  | { type: "max-assigns"; max: number }
  | { type: "min-shared-skills"; min: number };

export interface RuleItem {
  id: string;
  enabled: boolean;
  metric: RuleMetric;
}

export type DepartmentRules = {
  mentor: RuleItem[];
  reviewer: RuleItem[];
};

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
