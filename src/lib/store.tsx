import React, { createContext, useContext, useEffect, useReducer, useState } from "react";
import { SEED_VERSION, seedState } from "./data";
import type { AppState, Person, Role, RuleItem, RuleMetric } from "./types";

const STORAGE_KEY = "canopy.state.v1";

export type Action =
  | { type: "assign"; personId: string; role: Role; targetId: string | null }
  | { type: "toggle-role"; personId: string; role: Role }
  | { type: "add-rule"; deptId: string; role: Role; metric: RuleMetric }
  | { type: "update-rule"; deptId: string; role: Role; ruleId: string; patch: Partial<Pick<RuleItem, "enabled">> & { metric?: RuleMetric } }
  | { type: "remove-rule"; deptId: string; role: Role; ruleId: string }
  | { type: "copy-rules"; fromDeptId: string; toDeptId: string; role: Role }
  | { type: "reset" };

let actSeq = 0;
function actId() {
  actSeq += 1;
  return `act-${Date.now()}-${actSeq}`;
}

let ruleSeq = 0;
function newRuleId() {
  ruleSeq += 1;
  return `rule-${Date.now()}-${ruleSeq}`;
}

function log(state: AppState, text: string, tone: "success" | "info" | "warn"): AppState["activity"] {
  return [{ id: actId(), ts: Date.now(), text, tone }, ...state.activity].slice(0, 14);
}

function mapDept(state: AppState, deptId: string, fn: (d: AppState["departments"][number]) => AppState["departments"][number]): AppState {
  return { ...state, departments: state.departments.map((d) => (d.id === deptId ? fn(d) : d)) };
}

function withRules(state: AppState, deptId: string, role: Role, fn: (items: RuleItem[]) => RuleItem[]): AppState {
  return mapDept(state, deptId, (d) => ({ ...d, rules: { ...d.rules, [role]: fn(d.rules[role]) } }));
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "assign": {
      const person = state.people.find((p) => p.id === action.personId);
      if (!person) return state;
      const target = action.targetId ? state.people.find((p) => p.id === action.targetId) : undefined;
      const people = state.people.map((p) =>
        p.id === action.personId
          ? { ...p, [action.role === "mentor" ? "mentorId" : "reviewerId"]: action.targetId }
          : p,
      );
      const text = target
        ? `${target.name} assigned as ${action.role} of ${person.name}`
        : `${person.name}'s ${action.role} was cleared`;
      return { ...state, people, activity: log(state, text, target ? "success" : "warn") };
    }
    case "toggle-role": {
      const person = state.people.find((p) => p.id === action.personId);
      if (!person) return state;
      const key = action.role === "mentor" ? "isMentor" : "isReviewer";
      const nowOn = !person[key];
      const people = state.people.map((p) => (p.id === action.personId ? { ...p, [key]: nowOn } : p));
      const text = `${person.name} ${nowOn ? "activated" : "deactivated"} as ${
        action.role === "mentor" ? "a mentor" : "a reviewer"
      }`;
      return { ...state, people, activity: log(state, text, nowOn ? "success" : "info") };
    }
    case "add-rule": {
      const dept = state.departments.find((d) => d.id === action.deptId);
      if (!dept) return state;
      const next = withRules(state, action.deptId, action.role, (items) => [
        ...items,
        { id: newRuleId(), enabled: true, metric: action.metric },
      ]);
      return { ...next, activity: log(state, `${dept.name} added a ${action.role} rule`, "info") };
    }
    case "update-rule": {
      return withRules(state, action.deptId, action.role, (items) =>
        items.map((i) =>
          i.id === action.ruleId
            ? { ...i, enabled: action.patch.enabled ?? i.enabled, metric: action.patch.metric ?? i.metric }
            : i,
        ),
      );
    }
    case "remove-rule": {
      const dept = state.departments.find((d) => d.id === action.deptId);
      const next = withRules(state, action.deptId, action.role, (items) => items.filter((i) => i.id !== action.ruleId));
      if (!dept) return next;
      return { ...next, activity: log(state, `${dept.name} removed a ${action.role} rule`, "warn") };
    }
    case "copy-rules": {
      const from = state.departments.find((d) => d.id === action.fromDeptId);
      const to = state.departments.find((d) => d.id === action.toDeptId);
      if (!from || !to) return state;
      const cloned = from.rules[action.role].map((i) => ({ ...i, id: newRuleId() }));
      const next = withRules(state, action.toDeptId, action.role, () => cloned);
      return { ...next, activity: log(state, `${to.name} copied ${action.role} rules from ${from.name}`, "info") };
    }
    case "reset": {
      const fresh = seedState();
      return { ...fresh, activity: log(fresh, "Demo data restored", "info") };
    }
    default:
      return state;
  }
}

function init(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.version === SEED_VERSION) return parsed;
    }
  } catch {
    /* fall through to seed */
  }
  return seedState();
}

/* ─────────────────────────── contexts ─────────────────────────── */

const StoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export type Page = "overview" | "members" | "relationships" | "mentors" | "rules";

const UIContext = createContext<{
  page: Page;
  setPage: (p: Page) => void;
  personDialog: { id: string; role: Role } | null;
  openPerson: (id: string, role?: Role) => void;
  closePerson: () => void;
  rulesDeptId: string | null;
  setRulesDeptId: (id: string | null) => void;
} | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [page, setPage] = useState<Page>("overview");
  const [personDialog, setPersonDialog] = useState<{ id: string; role: Role } | null>(null);
  const [rulesDeptId, setRulesDeptId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — fine */
    }
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      <UIContext.Provider
        value={{
          page,
          setPage,
          personDialog,
          openPerson: (id: string, role: Role = "mentor") => setPersonDialog({ id, role }),
          closePerson: () => setPersonDialog(null),
          rulesDeptId,
          setRulesDeptId,
        }}
      >
        {children}
      </UIContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI outside provider");
  return ctx;
}

export function usePerson(id: string | null): Person | undefined {
  const { state } = useStore();
  return state.people.find((p) => p.id === id);
}
