import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Sparkles, UserPlus, UserRoundMinus } from "lucide-react";
import { toast } from "sonner";
import { deptOf, personById, propose, ruleSummary, tribeOf } from "../lib/scoring";
import { useStore, useUI } from "../lib/store";
import type { Role, ScoreParts, ScoredCandidate } from "../lib/types";
import { cn, firstName } from "../lib/utils";
import { Avatar, Badge, Button, Dialog, DialogContent, DialogHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "./ui";
import { LevelBadge, MetaLine, SkillRow } from "./bits";

const DELAYS = ["d1", "d2", "d3", "d4", "d5", "d6"];

function scoreColor(score: number) {
  if (score >= 75) return "text-primary";
  if (score >= 55) return "text-accent";
  return "text-muted-foreground";
}

function PartBars({ parts }: { parts: ScoreParts }) {
  const defs: [string, number][] = [
    ["Skill match", parts.skill],
    ["Location", parts.location],
    ["Level gap", parts.level],
    ["Capacity", parts.capacity],
  ];
  return (
    <div className="hidden items-end gap-[3px] sm:flex" aria-hidden>
      {defs.map(([label, v]) => (
        <div key={label} className="group/bar relative flex h-7 w-3.5 items-end rounded-[3px] bg-secondary">
          <div
            className="w-full rounded-[3px] bg-primary/75 transition-all duration-500 ease-out group-hover/bar:bg-primary"
            style={{ height: `${Math.max(10, Math.round(v * 100))}%` }}
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-sidebar px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-sidebar-foreground opacity-0 shadow-pop transition-opacity duration-150 group-hover/bar:opacity-100">
            {label} {Math.round(v * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function CandidateRow({
  c,
  index,
  isCurrent,
  role,
  menteeName,
  onAssign,
}: {
  c: ScoredCandidate;
  index: number;
  isCurrent: boolean;
  role: Role;
  menteeName: string;
  onAssign: (targetId: string) => void;
}) {
  const { state } = useStore();
  const tribe = tribeOf(state, c.person);
  const dept = deptOf(state, c.person);
  return (
    <div
      className={cn(
        "anim-fade-up rounded-lg border p-3 transition-all duration-200 hover:-translate-y-px hover:shadow-lift",
        DELAYS[index % DELAYS.length],
        isCurrent ? "border-primary/50 bg-primary-soft/40" : "border-line bg-card",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-center font-mono text-[11px] font-bold text-muted-foreground/70">
          {index + 1}
        </span>
        <Avatar name={c.person.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold">{c.person.name}</span>
            <LevelBadge level={c.person.level} />
            {c.relaxed.length > 0 && (
              <Badge variant="gold" className="hidden md:inline-flex">
                <AlertTriangle className="h-3 w-3" /> rules bent
              </Badge>
            )}
          </div>
          <MetaLine location={c.person.location} detail={`${tribe.name} · ${dept.name}`} className="mt-0.5" />
        </div>
        <PartBars parts={c.parts} />
        <div className="w-12 shrink-0 text-center">
          <p className={cn("font-mono text-lg font-bold leading-none tabular-nums", scoreColor(c.score))}>
            {c.score}
          </p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">match</p>
        </div>
        <div className="w-[74px] shrink-0 text-right">
          {isCurrent ? (
            <Badge variant="success">Current</Badge>
          ) : (
            <Button size="xs" variant="soft" onClick={() => onAssign(c.person.id)}>
              <UserPlus className="h-3 w-3" /> Assign
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1 pl-8">
        {c.reasons.slice(0, 4).map((r) => (
          <span key={r} className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
            {r}
          </span>
        ))}
        {c.relaxed.map((r) => (
          <span key={r} className="rounded bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-bold text-accent">
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

function RoleTab({ personId, role }: { personId: string; role: Role }) {
  const { state, dispatch } = useStore();
  const person = personById(state, personId)!;
  const dept = deptOf(state, person);

  const currentId = role === "mentor" ? person.mentorId : person.reviewerId;
  const current = personById(state, currentId ?? null);

  const { results, rules, relaxedAll } = useMemo(() => propose(state, person, role), [state, person, role]);

  const assign = (targetId: string | null) => {
    dispatch({ type: "assign", personId: person.id, role, targetId });
    const target = personById(state, targetId ?? "");
    if (target) {
      toast.success(`${target.name} is now ${person.name}'s ${role}`, {
        description: `Matched under ${dept.name} ${role} rules.`,
      });
    } else {
      toast.warning(`${firstName(person.name)}'s ${role} was cleared`);
    }
  };

  return (
    <div>
      <div className="mx-5 mb-3 mt-4 flex items-center gap-2.5 rounded-lg border border-line bg-secondary/40 px-3 py-2.5">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Current {role}
        </span>
        {current ? (
          <>
            <span className="mx-1 h-3 w-px bg-line" />
            <Avatar name={current.name} size="sm" />
            <span className="text-[13px] font-bold">{current.name}</span>
            <LevelBadge level={current.level} />
            <Button
              size="xs"
              variant="ghost"
              className="ml-auto text-muted-foreground hover:text-destructive"
              onClick={() => assign(null)}
            >
              <UserRoundMinus className="h-3 w-3" /> Remove
            </Button>
          </>
        ) : (
          <span className="text-[13px] text-muted-foreground">Unassigned — pick a candidate below</span>
        )}
      </div>

      {relaxedAll && results.length > 0 && (
        <div className="anim-fade-in mx-5 mb-3 flex items-start gap-2 rounded-lg border border-accent/25 bg-accent-soft/60 px-3 py-2.5 text-xs font-semibold text-accent">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          No one satisfies every {dept.name} rule right now — showing the closest matches with rules relaxed.
        </div>
      )}

      <div key={`${role}-${person.id}`} className="max-h-[330px] space-y-2 overflow-y-auto px-5 pb-2">
        {results.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nobody holds the {role} flag yet. Activate mentors in{" "}
            <b className="text-foreground">Mentors &amp; Reviewers</b>.
          </p>
        )}
        {results.map((c, i) => (
          <CandidateRow
            key={c.person.id}
            c={c}
            index={i}
            isCurrent={c.person.id === currentId}
            role={role}
            menteeName={person.name}
            onAssign={assign}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line px-5 py-3 text-[11.5px] text-muted-foreground">
        <Sparkles className="anim-sparkle h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">
          <b className="text-foreground">{dept.name}</b> · {role} rules — {ruleSummary(rules, role)}
        </span>
      </div>
    </div>
  );
}

export function PersonDialog() {
  const { state } = useStore();
  const { personDialog, closePerson } = useUI();
  const [tab, setTab] = useState<Role>("mentor");

  useEffect(() => {
    if (personDialog) setTab(personDialog.role);
  }, [personDialog]);

  const person = personById(state, personDialog?.id ?? null);
  if (!personDialog || !person) return <Dialog open={false}>{null}</Dialog>;

  const tribe = tribeOf(state, person);
  const dept = deptOf(state, person);
  const open = true;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closePerson()}>
      <DialogContent wide>
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar name={person.name} size="xl" ring />
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight">{person.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <LevelBadge level={person.level} />
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: dept.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dept.color }} />
                  {dept.name}
                </span>
                <MetaLine location={person.location} detail={tribe.name} />
                {person.level === 5 && <Badge variant="neutral">L5 · mentor optional</Badge>}
              </div>
              <div className="mt-2">
                <SkillRow skills={person.skills} max={6} />
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Role)} className="px-5">
          <TabsList>
            <TabsTrigger value="mentor">Mentor</TabsTrigger>
            <TabsTrigger value="reviewer">Reviewer</TabsTrigger>
          </TabsList>
          <TabsContent value="mentor">
            <RoleTab personId={person.id} role="mentor" />
          </TabsContent>
          <TabsContent value="reviewer">
            <RoleTab personId={person.id} role="reviewer" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
