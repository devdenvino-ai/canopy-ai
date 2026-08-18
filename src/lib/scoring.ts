import type {
  AppState,
  Department,
  Person,
  Role,
  RuleSet,
  ScoredCandidate,
} from "./types";

/* ─────────────────────────── lookups ─────────────────────────── */

export function tribeOf(state: AppState, person: Person) {
  return state.tribes.find((t) => t.id === person.tribeId)!;
}

export function deptOf(state: AppState, person: Person): Department {
  const tribe = tribeOf(state, person);
  return state.departments.find((d) => d.id === tribe.departmentId)!;
}

export function personById(state: AppState, id: string | null): Person | undefined {
  return id ? state.people.find((p) => p.id === id) : undefined;
}

/** How many people currently point at `personId` for the given role. */
export function loadOf(state: AppState, personId: string, role: Role): number {
  return state.people.filter((p) =>
    role === "mentor" ? p.mentorId === personId : p.reviewerId === personId,
  ).length;
}

export function menteesOf(state: AppState, personId: string, role: Role): Person[] {
  return state.people.filter((p) =>
    role === "mentor" ? p.mentorId === personId : p.reviewerId === personId,
  );
}

/** Level 5 members are considered self-sufficient and exempt from needing a mentor. */
export function isExempt(person: Person): boolean {
  return person.level === 5;
}

export function personIssues(person: Person): Role[] {
  const needs: Role[] = [];
  if (!isExempt(person) && !person.mentorId) needs.push("mentor");
  if (!person.reviewerId) needs.push("reviewer");
  return needs;
}

export function attentionList(state: AppState): { person: Person; needs: Role[] }[] {
  return state.people
    .map((person) => ({ person, needs: personIssues(person) }))
    .filter((x) => x.needs.length > 0)
    .sort((a, b) => b.needs.length - a.needs.length || a.person.name.localeCompare(b.person.name));
}

/* ─────────────────────────── coverage ─────────────────────────── */

export function coverage(
  state: AppState,
  role: Role,
  deptId?: string | null,
): { covered: number; eligible: number; pct: number } {
  let pool = state.people;
  if (deptId) {
    const tribeIds = new Set(state.tribes.filter((t) => t.departmentId === deptId).map((t) => t.id));
    pool = pool.filter((p) => tribeIds.has(p.tribeId));
  }
  const eligible = role === "mentor" ? pool.filter((p) => !isExempt(p)) : pool;
  const covered = eligible.filter((p) =>
    role === "mentor" ? !!p.mentorId : !!p.reviewerId,
  ).length;
  return {
    covered,
    eligible: eligible.length,
    pct: eligible.length ? Math.round((covered / eligible.length) * 100) : 100,
  };
}

/* ─────────────────────────── the proposal engine ─────────────────────────── */

export function ruleSummary(rules: RuleSet, role: Role): string {
  const gap =
    rules.minLevelGap === 0 ? "Any level" : `Min +${rules.minLevelGap} level${rules.minLevelGap > 1 ? "s" : ""}`;
  const dept = rules.sameDepartment ? "Same department" : "Cross-department OK";
  const cap = `Max ${rules.maxAssigns} ${role === "mentor" ? "mentees" : "members"}`;
  return `${gap} · ${dept} · ${cap}`;
}

export interface ProposalResult {
  results: ScoredCandidate[];
  rules: RuleSet;
  relaxedAll: boolean;
}

export function propose(state: AppState, mentee: Person, role: Role): ProposalResult {
  const dept = deptOf(state, mentee);
  const rules = dept.rules[role];
  const menteeDeptId = dept.id;
  const flagged = role === "mentor" ? "isMentor" : "isReviewer";

  const pool = state.people.filter((c) => {
    if (c.id === mentee.id || !c[flagged]) return false;
    // avoid a direct two-person loop
    if (role === "mentor" && c.mentorId === mentee.id) return false;
    return true;
  });

  const evaluate = (c: Person, relax: boolean): ScoredCandidate | null => {
    const gap = c.level - mentee.level;
    const cDeptId = deptOf(state, c).id;
    const load = loadOf(state, c.id, role);

    const violations: string[] = [];
    if (gap < rules.minLevelGap)
      violations.push(`+${gap} gap, rule wants +${rules.minLevelGap}`);
    if (rules.sameDepartment && cDeptId !== menteeDeptId)
      violations.push("Outside department");
    if (load >= rules.maxAssigns) violations.push(`At capacity ${load}/${rules.maxAssigns}`);
    if (!relax && violations.length > 0) return null;

    const shared = mentee.skills.filter((s) => c.skills.includes(s)).length;
    const skill = mentee.skills.length ? shared / mentee.skills.length : 0;
    const location = c.location === mentee.location ? 1 : 0;
    const idealTop = rules.minLevelGap + 1;
    const level =
      gap < rules.minLevelGap
        ? Math.max(0, 1 - (rules.minLevelGap - gap) * 0.35)
        : gap <= idealTop
          ? 1
          : Math.max(0.2, 1 - (gap - idealTop) * 0.25);
    const capacity = Math.max(0, 1 - load / rules.maxAssigns);

    const w = rules.weights;
    const wSum = w.skill + w.location + w.level + w.capacity || 1;
    const score = Math.round(
      ((w.skill * skill + w.location * location + w.level * level + w.capacity * capacity) /
        wSum) *
        100,
    );

    const reasons: string[] = [];
    if (shared > 0) reasons.push(`${shared} shared skill${shared > 1 ? "s" : ""}`);
    else reasons.push("No shared skills");
    if (location === 1) reasons.push(`Same location · ${c.location}`);
    if (gap > 0) reasons.push(`+${gap} level${gap > 1 ? "s" : ""}`);
    else reasons.push("Peer level");
    reasons.push(`Load ${load}/${rules.maxAssigns}`);

    return { person: c, score, parts: { skill, location, level, capacity }, reasons, relaxed: violations, load, max: rules.maxAssigns };
  };

  const strict = pool.flatMap((c) => {
    const r = evaluate(c, false);
    return r ? [r] : [];
  });

  if (strict.length > 0) {
    strict.sort((a, b) => b.score - a.score);
    return { results: strict.slice(0, 6), rules, relaxedAll: false };
  }

  const loose = pool.flatMap((c) => {
    const r = evaluate(c, true);
    return r ? [r] : [];
  });
  loose.sort((a, b) => b.score - a.score);
  return { results: loose.slice(0, 6), rules, relaxedAll: true };
}

/** Senior folks who could be activated as mentors — a gentle AI nudge for leads. */
export function mentorSuggestions(state: AppState, deptId?: string | null): Person[] {
  let pool = state.people.filter((p) => p.level >= 4 && !p.isMentor);
  if (deptId) {
    const tribeIds = new Set(state.tribes.filter((t) => t.departmentId === deptId).map((t) => t.id));
    pool = pool.filter((p) => tribeIds.has(p.tribeId));
  }
  return pool
    .map((p) => ({ p, load: loadOf(state, p.id, "reviewer") }))
    .sort((a, b) => b.p.level - a.p.level || a.load - b.load)
    .slice(0, 3)
    .map((x) => x.p);
}
