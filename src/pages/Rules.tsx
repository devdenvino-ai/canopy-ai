import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Copy, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { coverage, personIssues, propose, ruleSummary, tribeOf } from "../lib/scoring";
import { useStore, useUI } from "../lib/store";
import type { Role, RuleItem, RuleMetric } from "../lib/types";
import { cn, initials, toneFor } from "../lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Seg,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Stepper,
  Switch,
} from "../components/ui";
import { LevelBadge } from "../components/bits";

/* ─────────────────────────── rule templates ─────────────────────────── */

interface Template {
  key: string;
  label: string;
  kind: "score" | "constraint";
  desc: string;
  make: () => RuleMetric;
}

const TEMPLATES: Template[] = [
  { key: "w-skill", label: "Weight · skill overlap", kind: "score", desc: "Shared skills ÷ member's skills", make: () => ({ type: "score", factor: "skill", weight: 20 }) },
  { key: "w-location", label: "Weight · same location", kind: "score", desc: "100% when they share a city", make: () => ({ type: "score", factor: "location", weight: 15 }) },
  { key: "w-level", label: "Weight · level headroom", kind: "score", desc: "Peaks just above the required gap", make: () => ({ type: "score", factor: "level", weight: 20 }) },
  { key: "w-capacity", label: "Weight · open capacity", kind: "score", desc: "Favors people with fewer mentees", make: () => ({ type: "score", factor: "capacity", weight: 20 }) },
  { key: "c-gap", label: "Minimum level gap", kind: "constraint", desc: "Candidate must sit N levels above", make: () => ({ type: "min-level-gap", gap: 1 }) },
  { key: "c-dept", label: "Same department only", kind: "constraint", desc: "Rejects cross-department candidates", make: () => ({ type: "same-department" }) },
  { key: "c-cap", label: "Max assignments cap", kind: "constraint", desc: "Skips anyone already at capacity", make: () => ({ type: "max-assigns", max: 4 }) },
  { key: "c-skill", label: "Minimum shared skills", kind: "constraint", desc: "Requires N skills in common", make: () => ({ type: "min-shared-skills", min: 1 }) },
];

function metricLabel(item: RuleItem): { title: string; kind: "score" | "constraint" } {
  const m = item.metric;
  switch (m.type) {
    case "score":
      return {
        title: { skill: "Skill overlap", location: "Same location", level: "Level headroom", capacity: "Open capacity" }[m.factor],
        kind: "score",
      };
    case "min-level-gap":
      return { title: "Minimum level gap", kind: "constraint" };
    case "same-department":
      return { title: "Same department only", kind: "constraint" };
    case "max-assigns":
      return { title: "Max assignments", kind: "constraint" };
    case "min-shared-skills":
      return { title: "Minimum shared skills", kind: "constraint" };
  }
}

/* ─────────────────────────── rule row editor ─────────────────────────── */

function RuleRow({ item, role, deptId, index }: { item: RuleItem; role: Role; deptId: string; index: number }) {
  const { dispatch } = useStore();
  const [confirming, setConfirming] = useState(false);
  const meta = metricLabel(item);
  const m = item.metric;

  const patch = (metric: RuleMetric) => dispatch({ type: "update-rule", deptId, role, ruleId: item.id, patch: { metric } });

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 2600);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <div
      className={cn(
        "anim-fade-up group flex items-center gap-3 rounded-lg border border-line bg-card px-3.5 py-3 transition-all duration-200 hover:border-border hover:shadow-lift",
        ["d1", "d2", "d3", "d4", "d5", "d6"][index % 6],
        !item.enabled && "opacity-55",
      )}
    >
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-extrabold uppercase",
          meta.kind === "score" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent",
        )}
      >
        {meta.kind === "score" ? "W" : "C"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13.5px] font-bold">{meta.title}</p>
          <Badge variant={meta.kind === "score" ? "default" : "gold"}>
            {meta.kind === "score" ? "scoring" : "hard gate"}
          </Badge>
        </div>

        {/* inline param editor */}
        <div className="mt-1.5 flex items-center gap-3">
          {m.type === "score" && (
            <>
              <div className="w-40">
                <Slider value={[m.weight]} step={5} onValueChange={(v) => patch({ ...m, weight: v[0] })} />
              </div>
              <span className="font-mono text-xs font-bold tabular-nums text-primary">{m.weight} pts</span>
            </>
          )}
          {m.type === "min-level-gap" && (
            <Seg
              size="sm"
              value={String(m.gap) as "0" | "1" | "2" | "3"}
              onChange={(v) => patch({ ...m, gap: Number(v) })}
              options={[
                { value: "0", label: "Any" },
                { value: "1", label: "+1" },
                { value: "2", label: "+2" },
                { value: "3", label: "+3" },
              ]}
            />
          )}
          {m.type === "max-assigns" && (
            <Stepper value={m.max} min={1} max={10} onChange={(v) => patch({ ...m, max: v })} />
          )}
          {m.type === "min-shared-skills" && (
            <Stepper value={m.min} min={1} max={4} onChange={(v) => patch({ ...m, min: v })} />
          )}
          {m.type === "same-department" && (
            <span className="text-xs font-medium text-muted-foreground">Binary gate — enable or disable</span>
          )}
        </div>
      </div>

      <Switch
        checked={item.enabled}
        onCheckedChange={(on) => dispatch({ type: "update-rule", deptId, role, ruleId: item.id, patch: { enabled: on } })}
      />
      {confirming ? (
        <Button
          size="xs"
          variant="destructive"
          onClick={() => {
            dispatch({ type: "remove-rule", deptId, role, ruleId: item.id });
            toast.warning(`Removed “${meta.title}” rule`);
          }}
        >
          Confirm
        </Button>
      ) : (
        <Button size="iconXs" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/* ─────────────────────────── page ─────────────────────────── */

export function RulesPage() {
  const { state, dispatch } = useStore();
  const { rulesDeptId, setRulesDeptId } = useUI();
  const deptId = rulesDeptId ?? state.departments[0].id;
  const dept = state.departments.find((d) => d.id === deptId) ?? state.departments[0];
  const [role, setRole] = useState<Role>("mentor");
  const [railQ, setRailQ] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const items = dept.rules[role];

  const filteredDepts = useMemo(() => {
    const needle = railQ.trim().toLowerCase();
    return state.departments.filter((d) => !needle || d.name.toLowerCase().includes(needle));
  }, [state.departments, railQ]);

  const deptMembers = useMemo(() => {
    const tribeIds = new Set(state.tribes.filter((t) => t.departmentId === dept.id).map((t) => t.id));
    return state.people.filter((p) => tribeIds.has(p.tribeId)).sort((a, b) => a.name.localeCompare(b.name));
  }, [state, dept.id]);

  useEffect(() => {
    if (!previewId || !deptMembers.some((p) => p.id === previewId)) {
      const withGap = deptMembers.find((p) => personIssues(p).includes(role));
      setPreviewId(withGap?.id ?? deptMembers[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept.id, role, deptMembers.length]);

  const previewPerson = deptMembers.find((p) => p.id === previewId) ?? deptMembers[0];
  const proposal = previewPerson ? propose(state, previewPerson, role) : null;

  const addRule = (tpl: Template) => {
    dispatch({ type: "add-rule", deptId: dept.id, role, metric: tpl.make() });
    toast.success(`Added “${tpl.label.replace("Weight · ", "").replace(/^./, (c) => c.toLowerCase())}” rule`, {
      description: `${dept.name} · ${role} proposals update instantly.`,
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* ── department rail ── */}
      <Card className="anim-fade-up flex h-fit max-h-[calc(100vh-140px)] flex-col overflow-hidden lg:sticky lg:top-4">
        <div className="border-b border-line p-3">
          <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 focus-within:border-ring">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={railQ}
              onChange={(e) => setRailQ(e.target.value)}
              placeholder="Find a department…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {filteredDepts.map((d) => {
            const cov = coverage(state, "mentor", d.id);
            const count = d.rules[role].length;
            const active = d.id === dept.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setRulesDeptId(d.id)}
                className={cn(
                  "group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2.5 text-left transition-all duration-150",
                  active ? "border-primary/40 bg-primary-soft/60 shadow-sm" : "border-transparent hover:bg-secondary/70",
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[13px] font-bold", active && "text-primary")}>{d.name}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    {count} {role} rules · {cov.pct}% covered
                  </span>
                </span>
                <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform", active && "translate-x-0.5 text-primary")} />
              </button>
            );
          })}
          {filteredDepts.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No departments match “{railQ}”.</p>
          )}
        </div>
        <div className="border-t border-line px-3 py-2.5 text-[10.5px] font-semibold text-muted-foreground">
          {state.departments.length} departments · rules are per-department
        </div>
      </Card>

      {/* ── editor + preview ── */}
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dept.color }} />
            <h2 className="font-display text-lg font-bold tracking-tight">{dept.name}</h2>
            <Badge variant="neutral">{ruleSummary(items, role)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  <Copy className="h-3.5 w-3.5" /> Copy from…
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-60 p-2">
                <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Replace {role} rules with
                </p>
                {state.departments
                  .filter((d) => d.id !== dept.id)
                  .map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        dispatch({ type: "copy-rules", fromDeptId: d.id, toDeptId: dept.id, role });
                        toast.success(`Copied ${role} rules from ${d.name}`);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-semibold transition-colors hover:bg-secondary"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </button>
                  ))}
              </PopoverContent>
            </Popover>
            <Seg
              value={role}
              onChange={setRole}
              options={[
                { value: "mentor", label: "Mentor" },
                { value: "reviewer", label: "Reviewer" },
              ]}
            />
          </div>
        </div>

        <Card className="anim-fade-up d1 overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle>Rule stack</CardTitle>
              <CardDescription>
                Scoring weights rank candidates; hard gates filter them. Disabled rules are ignored, removed rules are gone —
                proposals recompute instantly.
              </CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" /> Add rule
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  New {role} rule for {dept.name}
                </p>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => addRule(t)}
                    className="flex w-full cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded text-[9px] font-extrabold uppercase",
                        t.kind === "score" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent",
                      )}
                    >
                      {t.kind === "score" ? "W" : "C"}
                    </span>
                    <span>
                      <span className="block text-[13px] font-bold leading-tight">{t.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{t.desc}</span>
                    </span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.length === 0 && (
              <div className="rounded-lg border border-dashed border-border py-8 text-center">
                <p className="text-sm font-bold">No rules — every flagged candidate scores equally</p>
                <p className="text-xs text-muted-foreground">Add a weight or a gate to shape proposals.</p>
              </div>
            )}
            {items.map((item, i) => (
              <RuleRow key={item.id} item={item} role={role} deptId={dept.id} index={i} />
            ))}
          </CardContent>
        </Card>

        {/* ── live preview ── */}
        <Card className="anim-fade-up d2 overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle>Live proposal preview</CardTitle>
              <CardDescription>Exactly what a lead sees when assigning — re-ranks as you tune the stack.</CardDescription>
            </div>
            <Badge variant="dark" className="mt-0.5 shrink-0 font-mono font-semibold normal-case tracking-normal">
              {ruleSummary(items, role)}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Propose for</span>
              <Select value={previewPerson?.id ?? ""} onValueChange={setPreviewId}>
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Pick a member" />
                </SelectTrigger>
                <SelectContent>
                  {deptMembers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · L{p.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {previewPerson && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: toneFor(previewPerson.name).bg, color: toneFor(previewPerson.name).fg }}
                  >
                    {initials(previewPerson.name)}
                  </span>
                  <LevelBadge level={previewPerson.level} />
                  <span className="text-xs text-muted-foreground">{previewPerson.location}</span>
                </span>
              )}
            </div>

            {proposal && proposal.relaxedAll && proposal.results.length > 0 && (
              <div className="anim-fade-in mb-3 rounded-lg border border-accent/25 bg-accent-soft/60 px-3 py-2 text-xs font-semibold text-accent">
                Nobody meets every rule right now — closest matches shown with rules relaxed.
              </div>
            )}

            <div key={`${dept.id}-${role}-${previewId}`} className="space-y-2">
              {!previewPerson && <p className="py-8 text-center text-sm text-muted-foreground">No members in this department.</p>}
              {previewPerson && proposal && proposal.results.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No one holds the {role} flag yet — activate {role}s in <b className="text-foreground">Mentors &amp; Reviewers</b>.
                </p>
              )}
              {previewPerson &&
                proposal?.results.slice(0, 4).map((c, i) => (
                  <div
                    key={c.person.id}
                    className={cn(
                      "anim-fade-up flex items-center gap-3 rounded-lg border border-line bg-card p-3 transition-all hover:shadow-lift",
                      ["d1", "d2", "d3", "d4"][i % 4],
                    )}
                  >
                    <span className="w-5 text-center font-mono text-[11px] font-bold text-muted-foreground/70">{i + 1}</span>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{ backgroundColor: toneFor(c.person.name).bg, color: toneFor(c.person.name).fg }}
                    >
                      {initials(c.person.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold">{c.person.name}</span>
                        <LevelBadge level={c.person.level} />
                        {c.relaxed.length > 0 && <Badge variant="gold">relaxed</Badge>}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {tribeOf(state, c.person).name} · {c.person.location} · load {c.load}/{c.max}
                      </p>
                    </div>
                    <div className="hidden flex-wrap justify-end gap-1 sm:flex sm:max-w-[220px]">
                      {c.reasons.slice(0, 2).map((r) => (
                        <span key={r} className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                          {r}
                        </span>
                      ))}
                    </div>
                    <div className="w-12 text-center">
                      <p
                        className={cn(
                          "font-mono text-lg font-bold leading-none tabular-nums",
                          c.score >= 75 ? "text-primary" : c.score >= 55 ? "text-accent" : "text-muted-foreground",
                        )}
                      >
                        {c.score}
                      </p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">match</p>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5 text-[11.5px] text-muted-foreground">
              <Sparkles className="anim-sparkle h-3.5 w-3.5 shrink-0 text-primary" />
              {items.filter((i) => i.enabled).length} active rules · gates relax automatically when nobody qualifies
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
