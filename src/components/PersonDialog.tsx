import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Search, SearchX, Sparkles, UserPlus, UserRoundMinus } from "lucide-react";
import { toast } from "sonner";
import { deptOf, personById, propose, ruleSummary, scoreCandidate, tribeOf } from "../lib/scoring";
import { useStore, useUI } from "../lib/store";
import type { Role, ScoreParts, ScoredCandidate } from "../lib/types";
import { cn, firstName, initials, toneFor } from "../lib/utils";
import { Badge, Button, Dialog, DialogContent, DialogHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "./ui";
import { LevelBadge, MetaLine, SkillRow } from "./bits";

const DELAYS = ["d1", "d2", "d3", "d4", "d5", "d6"];

function scoreColor(score: number) {
  if (score >= 75) return "text-primary";
  if (score >= 55) return "text-accent";
  return "text-muted-foreground";
}

function ScoreDial({ score }: { score: number }) {
  return (
    <div className="w-12 shrink-0 text-center">
      <p className={cn("font-mono text-lg font-bold leading-none tabular-nums", scoreColor(score))}>{score}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">match</p>
    </div>
  );
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
  person,
  score,
  parts,
  reasons,
  relaxed,
  index,
  isCurrent,
  onAssign,
}: {
  person: ScoredCandidate["person"];
  score: number;
  parts?: ScoreParts;
  reasons?: string[];
  relaxed?: string[];
  index: number;
  isCurrent: boolean;
  onAssign: (targetId: string) => void;
}) {
  const { state } = useStore();
  const tribe = tribeOf(state, person);
  const dept = deptOf(state, person);
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
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: toneFor(person.name).bg, color: toneFor(person.name).fg }}
        >
          {initials(person.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold">{person.name}</span>
            <LevelBadge level={person.level} />
            {relaxed && relaxed.length > 0 && (
              <Badge variant="gold" className="hidden md:inline-flex">
                <AlertTriangle className="h-3 w-3" /> rules bent
              </Badge>
            )}
          </div>
          <MetaLine location={person.location} detail={`${tribe.name} · ${dept.name}`} className="mt-0.5" />
        </div>
        {parts && <PartBars parts={parts} />}
        <ScoreDial score={score} />
        <div className="w-[74px] shrink-0 text-right">
          {isCurrent ? (
            <Badge variant="success">Current</Badge>
          ) : (
            <Button size="xs" variant="soft" onClick={() => onAssign(person.id)}>
              <UserPlus className="h-3 w-3" /> Assign
            </Button>
          )}
        </div>
      </div>
      {reasons && reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 pl-8">
          {reasons.slice(0, 4).map((r) => (
            <span key={r} className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
              {r}
            </span>
          ))}
          {relaxed?.map((r) => (
            <span key={r} className="rounded bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-bold text-accent">
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleTab({ personId, role }: { personId: string; role: Role }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState("");
  const person = personById(state, personId)!;
  const dept = deptOf(state, person);

  const currentId = role === "mentor" ? person.mentorId : person.reviewerId;
  const current = personById(state, currentId ?? null);

  const { top, relaxedAll, items } = useMemo(() => propose(state, person, role), [state, person, role]);

  /** Manual search spans every flagged candidate, scored by the live rules — constraints don't block a human choice. */
  const searchResults = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return state.people
      .filter((c) => c.id !== person.id && (role === "mentor" ? c.isMentor : c.isReviewer))
      .map((c) => {
        const s = scoreCandidate(state, person, c, role, items);
        return { person: c, ...s };
      })
      .filter((r) => {
        const dept2 = deptOf(state, r.person);
        const tribe2 = tribeOf(state, r.person);
        return [r.person.name, r.person.location, dept2.name, tribe2.name, ...r.person.skills].some((s) =>
          s.toLowerCase().includes(needle),
        );
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [q, state, person, role, items]);

  const assign = (targetId: string | null) => {
    dispatch({ type: "assign", personId: person.id, role, targetId });
    const target = personById(state, targetId ?? "");
    if (target) {
      toast.success(`${target.name} is now ${person.name}'s ${role}`, {
        description: `Scored ${scoreCandidate(state, person, target, role, items).score} under ${dept.name} rules.`,
      });
    } else {
      toast.warning(`${firstName(person.name)}'s ${role} was cleared`);
    }
    setQ("");
  };

  const searching = q.trim().length > 0;
  const suggestedBelow = searching ? top.filter((c) => !searchResults.some((r) => r.person.id === c.person.id)).slice(0, 3) : [];

  return (
    <div>
      <div className="mx-5 mb-3 mt-4 flex items-center gap-2.5 rounded-lg border border-line bg-secondary/40 px-3 py-2.5">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Current {role}
        </span>
        {current ? (
          <>
            <span className="mx-1 h-3 w-px bg-line" />
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ backgroundColor: toneFor(current.name).bg, color: toneFor(current.name).fg }}
            >
              {initials(current.name)}
            </div>
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
          <span className="text-[13px] text-muted-foreground">Unassigned — search or pick a suggestion below</span>
        )}
      </div>

      {/* search-first */}
      <div className="mx-5 mb-3">
        <div className="flex h-10 items-center gap-2.5 rounded-lg border border-border bg-card px-3 transition-all focus-within:border-ring focus-within:shadow-[0_0_0_3px_rgb(124_58_237_/_0.12)]">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${role}s by name, skill, tribe, city…`}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="cursor-pointer rounded px-1 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {relaxedAll && !searching && top.length > 0 && (
        <div className="anim-fade-in mx-5 mb-3 flex items-start gap-2 rounded-lg border border-accent/25 bg-accent-soft/60 px-3 py-2.5 text-xs font-semibold text-accent">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          No one satisfies every {dept.name} rule right now — showing the closest matches with rules relaxed.
        </div>
      )}

      <div key={`${role}-${person.id}-${searching ? "s" : "a"}`} className="max-h-[300px] space-y-2 overflow-y-auto px-5 pb-2">
        {searching ? (
          <>
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Search results <span className="font-mono text-muted-foreground/70">{searchResults.length}</span>
            </p>
            {searchResults.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                <SearchX className="h-5 w-5 text-muted-foreground/60" />
                <p className="text-sm font-semibold">No {role} matches “{q.trim()}”</p>
                <p className="text-xs text-muted-foreground">Only people activated as {role}s are searchable.</p>
              </div>
            )}
            {searchResults.map((r, i) => (
              <CandidateRow
                key={r.person.id}
                person={r.person}
                score={r.score}
                parts={r.parts}
                reasons={r.reasons}
                index={i}
                isCurrent={r.person.id === currentId}
                onAssign={assign}
              />
            ))}
            {suggestedBelow.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> AI top picks
                </p>
                {suggestedBelow.map((c, i) => (
                  <CandidateRow
                    key={c.person.id}
                    person={c.person}
                    score={c.score}
                    parts={c.parts}
                    reasons={c.reasons}
                    relaxed={c.relaxed}
                    index={i}
                    isCurrent={c.person.id === currentId}
                    onAssign={assign}
                  />
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Suggested by AI · ranked by {dept.name} rules
            </p>
            {top.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nobody holds the {role} flag yet. Activate {role}s in <b className="text-foreground">Mentors &amp; Reviewers</b>.
              </p>
            )}
            {top.map((c, i) => (
              <CandidateRow
                key={c.person.id}
                person={c.person}
                score={c.score}
                parts={c.parts}
                reasons={c.reasons}
                relaxed={c.relaxed}
                index={i}
                isCurrent={c.person.id === currentId}
                onAssign={assign}
              />
            ))}
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line px-5 py-3 text-[11.5px] text-muted-foreground">
        <Sparkles className="anim-sparkle h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">
          <b className="text-foreground">{dept.name}</b> · {role} rules — {ruleSummary(items, role)}
        </span>
        <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/60" />
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

  return (
    <Dialog open onOpenChange={(o) => !o && closePerson()}>
      <DialogContent wide>
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold"
              style={{
                backgroundColor: toneFor(person.name).bg,
                color: toneFor(person.name).fg,
                boxShadow: `0 0 0 2px #fcfbfe, 0 0 0 3.5px ${toneFor(person.name).fg}40`,
              }}
            >
              {initials(person.name)}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight">{person.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <LevelBadge level={person.level} />
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: dept.color }}>
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
