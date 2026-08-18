import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { personIssues, propose, ruleSummary, tribeOf } from "../lib/scoring";
import { useStore, useUI } from "../lib/store";
import type { Role, RuleSet } from "../lib/types";
import { cn } from "../lib/utils";
import {
  Avatar,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
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

const WEIGHTS: { key: keyof RuleSet["weights"]; label: string; hint: string }[] = [
  { key: "skill", label: "Skill overlap", hint: "shared skills ÷ member's skills" },
  { key: "location", label: "Same location", hint: "100% when they share a city" },
  { key: "level", label: "Level headroom", hint: "peaks just above the required gap" },
  { key: "capacity", label: "Open capacity", hint: "favors people with fewer mentees" },
];

export function RulesPage() {
  const { state, dispatch } = useStore();
  const { rulesDeptId, setRulesDeptId } = useUI();
  const deptId = rulesDeptId ?? state.departments[0].id;
  const dept = state.departments.find((d) => d.id === deptId) ?? state.departments[0];
  const [role, setRole] = useState<Role>("mentor");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const rules = dept.rules[role];
  const wSum = rules.weights.skill + rules.weights.location + rules.weights.level + rules.weights.capacity;

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

  const update = (patch: Partial<RuleSet>, msg?: string) => {
    const next: RuleSet = {
      ...rules,
      ...patch,
      weights: { ...rules.weights, ...(patch.weights ?? {}) },
    };
    dispatch({ type: "update-rules", deptId: dept.id, role, rules: next });
    if (msg) toast.success(msg, { description: `${dept.name} · ${role} rules apply to every new proposal instantly.` });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {state.departments.map((d) => {
            const active = d.id === dept.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setRulesDeptId(d.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-bold transition-all duration-150",
                  active
                    ? "border-foreground/70 bg-card shadow-lift"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-card",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </button>
            );
          })}
        </div>
        <Seg
          value={role}
          onChange={setRole}
          options={[
            { value: "mentor", label: "Mentor rules" },
            { value: "reviewer", label: "Reviewer rules" },
          ]}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* ── editor ── */}
        <Card className="anim-fade-up d1 self-start overflow-hidden">
          <CardHeader>
            <CardTitle>Scoring weights</CardTitle>
            <CardDescription>
              Relative importance when the AI ranks candidates. The engine normalizes them to 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {WEIGHTS.map((w) => {
              const val = rules.weights[w.key];
              const share = wSum > 0 ? Math.round((val / wSum) * 100) : 0;
              return (
                <div key={w.key}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <Label>{w.label}</Label>
                    <span className="font-mono text-xs font-bold tabular-nums text-primary">{share}%</span>
                  </div>
                  <Slider
                    value={[val]}
                    step={5}
                    onValueChange={(v) => update({ weights: { ...rules.weights, [w.key]: v[0] } })}
                    onValueCommit={() => toast.success(`${dept.name} · ${w.label.toLowerCase()} weight updated`)}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground/90">{w.hint}</p>
                </div>
              );
            })}

            <div className="space-y-4 border-t border-line pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Hard constraints</p>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Minimum level gap</Label>
                  <p className="text-[11px] text-muted-foreground">How far above the member a candidate must sit.</p>
                </div>
                <Seg
                  size="sm"
                  value={String(rules.minLevelGap) as "0" | "1" | "2" | "3"}
                  onChange={(v) =>
                    update({ minLevelGap: Number(v) }, `${dept.name} · minimum ${role} gap set to ${Number(v) === 0 ? "any level" : `+${v}`}`)
                  }
                  options={[
                    { value: "0", label: "Any" },
                    { value: "1", label: "+1" },
                    { value: "2", label: "+2" },
                    { value: "3", label: "+3" },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Same department only</Label>
                  <p className="text-[11px] text-muted-foreground">Reject candidates from other departments.</p>
                </div>
                <Switch
                  checked={rules.sameDepartment}
                  onCheckedChange={(on) =>
                    update({ sameDepartment: on }, `${dept.name} · ${on ? "restricted to" : "opened beyond"} the department`)
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Max {role === "mentor" ? "mentees" : "reviews"} per person</Label>
                  <p className="text-[11px] text-muted-foreground">Anyone at this cap is skipped.</p>
                </div>
                <Stepper
                  value={rules.maxAssigns}
                  min={1}
                  max={role === "mentor" ? 6 : 10}
                  onChange={(v) => update({ maxAssigns: v }, `${dept.name} · cap set to ${v}`)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── live preview ── */}
        <Card className="anim-fade-up d2 overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle>Live proposal preview</CardTitle>
              <CardDescription>Exactly what a lead would see when assigning — updates as you tune the rules.</CardDescription>
            </div>
            <Badge variant="dark" className="mt-0.5 shrink-0 font-mono font-semibold normal-case tracking-normal">
              {ruleSummary(rules, role)}
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
                  <Avatar name={previewPerson.name} size="sm" />
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
                  No one holds the {role} flag yet — activate mentors in <b className="text-foreground">Mentors &amp; Reviewers</b>.
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
                    <Avatar name={c.person.name} size="md" />
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
              Weight shares:{" "}
              {WEIGHTS.map((w, i) => (
                <span key={w.key} className="font-mono font-bold tabular-nums text-foreground/75">
                  {w.label.split(" ")[0]} {wSum > 0 ? Math.round((rules.weights[w.key] / wSum) * 100) : 0}
                  {i < WEIGHTS.length - 1 ? " · " : ""}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
