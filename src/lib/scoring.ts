import type {
  AppState,
  Department,
  Level,
  Person,
  Role,
  RuleFactor,
  RuleItem,
  ScoreParts,
  ScoredCandidate,
  Tribe,
} from "./types";

/* ─────────────────────────── lookups ─────────────────────────── */

export function personById(state: AppState, id: string | null): Person | undefined {
  return state.people.find((p) => p.id === id);
}

export function tribeOf(state: AppState, person: Person): Tribe {
  return state.tribes.find((t) => t.id === person.tribeId)!;
}

export function deptOf(state: AppState, person: Person): Department {
  const tribe = tribeOf(state, person);
  return state.departments.find((d) => d.id === tribe.departmentId)!;
}

export function deptById(state: AppState, id: string): Department | undefined {
  return state.departments.find((d) => d.id === id);
}

export function peopleInTribe(state: AppState, tribeId: string): Person[] {
  return state.people.filter((p) => p.tribeId === tribeId);
}

/* ─────────────────────────── coverage ─────────────────────────── */

/** L5 members are considered self-sufficient — a mentor is optional. */
export function personNeedsMentor(p: Person): boolean {
  return p.level < 5;
}

export function personIssues(p: Person): Role[] {
  const issues: Role[] = [];
  if (personNeedsMentor(p) && !p.mentorId) issues.push("mentor");
  if (!p.reviewerId) issues.push("reviewer");
  return issues;
}

export function coverage(state: AppState, role: Role, deptId?: string): { pct: number; covered: number; eligible: number } {
  let pool = state.people;
  if (deptId) {
    const tribeIds = new Set(state.tribes.filter((t) => t.departmentId === deptId).map((t) => t.id));
    pool = pool.filter((p) => tribeIds.has(p.tribeId));
  }
  let eligible = 0;
  let covered = 0;
  for (const p of pool) {
    if (role === "mentor") {
      if (!personNeedsMentor(p)) continue;
      eligible += 1;
      if (p.mentorId) covered += 1;
    } else {
      eligible += 1;
      if (p.reviewerId) covered += 1;
    }
  }
  return { pct: eligible === 0 ? 100 : Math.round((covered / eligible) * 100), covered, eligible };
}

export function attentionList(state: AppState): { person: Person; needs: Role[] }[] {
  return state.people
    .map((p) => ({ person: p, needs: personIssues(p) }))
    .filter((x) => x.needs.length > 0)
    .sort((a, b) => b.needs.length - a.needs.length || a.person.level - b.person.level);
}

/* ─────────────────────────── loads ─────────────────────────── */

export function loadOf(state: AppState, personId: string, role: Role): number {
  return state.people.filter((p) => (role === "mentor" ? p.mentorId === personId : p.reviewerId === personId)).length;
}

export function menteesOf(state: AppState, personId: string, role: Role): Person[] {
  return state.people.filter((p) => (role === "mentor" ? p.mentorId === personId : p.reviewerId === personId));
}

/** People who could plausibly be activated as mentors: senior, skilled, not already one. */
export function mentorSuggestions(state: AppState, limit = 4): Person[] {
  return state.people
    .filter((p) => !p.isMentor && p.level >= 4 && loadOf(state, p.id, "mentor") === 0)
    .sort((a, b) => b.level - a.level || b.skills.length - a.skills.length)
    .slice(0, limit);
}

/* ─────────────────────────── rule accessors ─────────────────────────── */

export function activeRules(items: RuleItem[]): RuleItem[] {
  return items.filter((i) => i.enabled);
}

export function weightOf(items: RuleItem[], factor: RuleFactor): number {
  return activeRules(items)
    .filter((i) => i.metric.type === "score" && i.metric.factor === factor)
    .reduce((s, i) => s + (i.metric.type === "score" ? i.metric.weight : 0), 0);
}

export function minGapOf(items: RuleItem[], role: Role): number {
  const gaps = activeRules(items)
    .filter((i) => i.metric.type === "min-level-gap")
    .map((i) => (i.metric.type === "min-level-gap" ? i.metric.gap : 0));
  return gaps.length ? Math.max(...gaps) : role === "mentor" ? 1 : 0;
}

export function sameDeptOf(items: RuleItem[]): boolean {
  return activeRules(items).some((i) => i.metric.type === "same-department");
}

export function maxAssignsOfItems(items: RuleItem[], role: Role): number {
  const caps = activeRules(items)
    .filter((i) => i.metric.type === "max-assigns")
    .map((i) => (i.metric.type === "max-assigns" ? i.metric.max : Infinity));
  return caps.length ? Math.min(...caps) : role === "mentor" ? 4 : 8;
}

export function minSharedOf(items: RuleItem[]): number {
  const mins = activeRules(items)
    .filter((i) => i.metric.type === "min-shared-skills")
    .map((i) => (i.metric.type === "min-shared-skills" ? i.metric.min : 0));
  return mins.length ? Math.max(...mins) : 0;
}

export function maxAssignsOf(state: AppState, person: Person, role: Role): number {
  return maxAssignsOfItems(deptOf(state, person).rules[role], role);
}

export function ruleSummary(items: RuleItem[], role: Role): string {
  const on = activeRules(items);
  if (on.length === 0) return "no rules active — everyone eligible scores equally";
  const parts: string[] = [];
  const wSum =
    weightOf(items, "skill") + weightOf(items, "location") + weightOf(items, "level") + weightOf(items, "capacity");
  const share = (f: RuleFactor) => (wSum > 0 ? Math.round((weightOf(items, f) / wSum) * 100) : 0);
  if (weightOf(items, "skill") > 0) parts.push(`skills ${share("skill")}`);
  if (weightOf(items, "location") > 0) parts.push(`location ${share("location")}`);
  if (weightOf(items, "level") > 0) parts.push(`level ${share("level")}`);
  if (weightOf(items, "capacity") > 0) parts.push(`capacity ${share("capacity")}`);
  if (sameDeptOf(items)) parts.push("same dept");
  if (on.some((i) => i.metric.type === "min-level-gap")) parts.push(`gap +${minGapOf(items, role)}`);
  if (on.some((i) => i.metric.type === "max-assigns")) parts.push(`cap ${maxAssignsOfItems(items, role)}`);
  if (on.some((i) => i.metric.type === "min-shared-skills")) parts.push(`≥${minSharedOf(items)} shared skill`);
  return parts.join(" · ");
}

/* ─────────────────────────── scoring core ─────────────────────────── */

function sharedSkills(member: Person, candidate: Person): number {
  return member.skills.filter((s) => candidate.skills.includes(s)).length;
}

/** Pure score — no constraints. Used for the AI ranking and manual search rows. */
export function scoreCandidate(
  state: AppState,
  member: Person,
  candidate: Person,
  role: Role,
  items: RuleItem[],
): { score: number; parts: ScoreParts; reasons: string[] } {
  const wSkill = weightOf(items, "skill");
  const wLoc = weightOf(items, "location");
  const wLvl = weightOf(items, "level");
  const wCap = weightOf(items, "capacity");
  const wSum = wSkill + wLoc + wLvl + wCap;

  const minGap = minGapOf(items, role);
  const maxA = maxAssignsOfItems(items, role);

  const shared = sharedSkills(member, candidate);
  const fSkill = member.skills.length ? shared / member.skills.length : 0;
  const fLoc = member.location === candidate.location ? 1 : 0;
  const gap = candidate.level - member.level;
  const fLvl = gap < 0 ? 0 : gap === minGap ? 1 : Math.max(0.55, 1 - (gap - minGap) * 0.18);
  const load = loadOf(state, candidate.id, role);
  const fCap = Math.max(0, 1 - load / maxA);

  const raw = (fSkill * wSkill + fLoc * wLoc + fLvl * wLvl + fCap * wCap) / (wSum || 1);

  const reasons: string[] = [];
  reasons.push(shared > 0 ? `${shared}/${member.skills.length} shared skills` : "no shared skills");
  reasons.push(fLoc === 1 ? "same city" : candidate.location);
  reasons.push(gap > 0 ? `+${gap} level${gap > 1 ? "s" : ""}` : "peer level");
  reasons.push(`${load}/${maxA} load`);

  return {
    score: Math.round(raw * 100),
    parts: { skill: fSkill, location: fLoc, level: fLvl, capacity: fCap },
    reasons,
  };
}

type ConstraintKey = "min-shared-skills" | "min-level-gap" | "same-department" | "max-assigns";

const RELAX_ORDER: ConstraintKey[] = ["min-shared-skills", "min-level-gap", "same-department", "max-assigns"];

const RELAX_LABEL: Record<ConstraintKey, string> = {
  "min-shared-skills": "skill floor waived",
  "min-level-gap": "level gap waived",
  "same-department": "same-dept waived",
  "max-assigns": "capacity cap waived",
};

export interface Proposal {
  results: ScoredCandidate[];
  top: ScoredCandidate[];
  items: RuleItem[];
  relaxedAll: boolean;
}

/**
 * AI proposal: rank every flagged candidate against the department's live rules.
 * Hard constraints gate eligibility; if nobody qualifies they are relaxed one at
 * a time (weakest first) and the relaxation is surfaced on each candidate.
 */
export function propose(state: AppState, member: Person, role: Role): Proposal {
  const dept = deptOf(state, member);
  const items = dept.rules[role];
  const on = activeRules(items);

  const sameDept = sameDeptOf(items);
  const minGap = minGapOf(items, role);
  const maxA = maxAssignsOfItems(items, role);
  const minShared = minSharedOf(items);

  const gates: ConstraintKey[] = [];
  if (on.some((i) => i.metric.type === "min-shared-skills")) gates.push("min-shared-skills");
  if (on.some((i) => i.metric.type === "min-level-gap")) gates.push("min-level-gap");
  if (sameDept) gates.push("same-department");
  if (on.some((i) => i.metric.type === "max-assigns")) gates.push("max-assigns");

  const relaxed = new Set<ConstraintKey>();
  const pool = state.people.filter((c) => c.id !== member.id && (role === "mentor" ? c.isMentor : c.isReviewer));

  const rank = (): ScoredCandidate[] =>
    pool
      .filter((c) => {
        if (!relaxed.has("same-department") && sameDept && deptOf(state, c).id !== dept.id) return false;
        if (!relaxed.has("min-level-gap") && c.level < member.level + minGap) return false;
        if (!relaxed.has("max-assigns") && loadOf(state, c.id, role) >= maxA) return false;
        if (!relaxed.has("min-shared-skills") && sharedSkills(member, c) < minShared) return false;
        return true;
      })
      .map((c) => {
        const s = scoreCandidate(state, member, c, role, items);
        return {
          person: c,
          score: s.score,
          parts: s.parts,
          reasons: s.reasons,
          relaxed: [...relaxed].map((k) => RELAX_LABEL[k]),
          load: loadOf(state, c.id, role),
          max: maxA,
        };
      })
      .sort((a, b) => b.score - a.score || a.load - b.load || a.person.name.localeCompare(b.person.name));

  let results = rank();
  const wasEmptyAtStart = results.length === 0;
  for (const key of RELAX_ORDER) {
    if (results.length > 0) break;
    if (!gates.includes(key)) continue;
    relaxed.add(key);
    results = rank();
  }

  return { results, top: results.slice(0, 6), items, relaxedAll: wasEmptyAtStart && relaxed.size > 0 };
}

/** Level ladder labels for tooltips. */
export const LEVEL_NAMES: Record<Level, string> = {
  1: "Junior",
  2: "Mid",
  3: "Senior",
  4: "Staff",
  5: "Principal",
};
