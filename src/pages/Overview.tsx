import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { attentionList, coverage, deptOf, personById, personIssues, tribeOf } from "../lib/scoring";
import { useStore, useUI } from "../lib/store";
import type { Person, Role, Tribe } from "../lib/types";
import { cn, firstName, timeAgo } from "../lib/utils";
import { Avatar, Badge, Button, Card, CardContent, Seg, Tip } from "../components/ui";
import { CoverageRing, LevelBadge, RelationChip, SkillRow, StatTile, StatusBadge } from "../components/bits";
import { OrgCrumb } from "../components/layout";

const EXPAND_EASE = [0.16, 1, 0.3, 1] as const;

function Expandable({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="body"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: EXPAND_EASE }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MemberRow({ person, index }: { person: Person; index: number }) {
  const { state } = useStore();
  const { openPerson } = useUI();
  const issues = personIssues(person);
  const mentor = personById(state, person.mentorId ?? null);
  const reviewer = personById(state, person.reviewerId ?? null);
  const delays = ["d1", "d2", "d3", "d4", "d5", "d6"];

  return (
    <div
      className={cn(
        "anim-fade-up group flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition-all duration-150 hover:border-line hover:bg-card hover:shadow-sm",
        delays[index % delays.length],
      )}
    >
      <Avatar name={person.name} size="sm" />
      <div className="flex min-w-0 flex-1 items-center gap-2 basis-44">
        <button
          type="button"
          onClick={() => openPerson(person.id)}
          className="max-w-[180px] cursor-pointer truncate text-left text-[13.5px] font-bold transition-colors hover:text-primary"
          title={`${person.name} — manage mentor & reviewer`}
        >
          {person.name}
        </button>
        <LevelBadge level={person.level} />
      </div>
      <div className="hidden w-[210px] shrink-0 xl:block">
        <SkillRow skills={person.skills} max={2} />
      </div>
      <span className="hidden w-24 shrink-0 truncate text-xs font-medium text-muted-foreground lg:block">
        {person.location}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <RelationChip assigned={mentor} role="mentor" onClick={() => openPerson(person.id, "mentor")} />
        <RelationChip assigned={reviewer} role="reviewer" onClick={() => openPerson(person.id, "reviewer")} />
      </div>
      <div className="hidden w-[96px] shrink-0 justify-end md:flex">
        <StatusBadge issues={issues} />
      </div>
    </div>
  );
}

function TribeBranch({
  tribe,
  visible,
  open,
  onToggle,
  forceOpen,
}: {
  tribe: Tribe;
  visible: Person[];
  open: boolean;
  onToggle: () => void;
  forceOpen: boolean;
}) {
  const { state } = useStore();
  const members = useMemo(() => state.people.filter((p) => p.tribeId === tribe.id), [state.people, tribe.id]);
  const gaps = members.filter((p) => personIssues(p).length > 0).length;
  const mentorCount = members.filter((p) => p.isMentor).length;
  const lead = personById(state, tribe.leadId);
  const show = forceOpen || open;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary/60"
      >
        <ChevronRight
          className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200", show && "rotate-90")}
        />
        <span className="text-[13.5px] font-bold">{tribe.name}</span>
        {lead && <span className="hidden truncate text-[11.5px] text-muted-foreground sm:block">Lead · {firstName(lead.name)}</span>}
        <span className="ml-auto flex items-center gap-1.5">
          {mentorCount > 0 && (
            <Badge variant="neutral" className="hidden sm:inline-flex">
              {mentorCount} mentor{mentorCount > 1 ? "s" : ""}
            </Badge>
          )}
          {gaps > 0 ? (
            <Badge variant="gold">{gaps} gap{gaps > 1 ? "s" : ""}</Badge>
          ) : (
            <Badge variant="default" className="hidden sm:inline-flex">
              <CheckCircle2 className="h-3 w-3" /> covered
            </Badge>
          )}
          <span className="w-8 text-right font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
            {members.length}
          </span>
        </span>
      </button>
      <Expandable open={show}>
        <div className="relative ml-[15px] space-y-0.5 border-l-2 border-line/70 py-0.5 pl-2.5">
          {visible.map((p, i) => (
            <MemberRow key={p.id} person={p} index={i} />
          ))}
        </div>
      </Expandable>
    </div>
  );
}

export function OverviewPage() {
  const { state } = useStore();
  const { openPerson } = useUI();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(state.departments.map((d) => [d.id, true])),
  );
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "gaps">("all");

  const attention = attentionList(state);
  const covM = coverage(state, "mentor");
  const covR = coverage(state, "reviewer");
  const mentors = state.people.filter((p) => p.isMentor);
  const avgLoad = mentors.length ? (state.people.filter((p) => p.mentorId).length / mentors.length).toFixed(1) : "0";
  const mentorGaps = attention.filter((a) => a.needs.includes("mentor")).length;
  const reviewerGaps = attention.filter((a) => a.needs.includes("reviewer")).length;

  const needle = q.trim().toLowerCase();
  const filtering = mode === "gaps" || needle.length > 0;

  const matches = (p: Person) => {
    if (mode === "gaps" && personIssues(p).length === 0) return false;
    if (!needle) return true;
    const tribe = tribeOf(state, p);
    return [p.name, p.location, tribe.name, ...p.skills].some((s) => s.toLowerCase().includes(needle));
  };

  const tree = useMemo(
    () =>
      state.departments.map((d) => {
        const deptTribes = state.tribes
          .filter((t) => t.departmentId === d.id)
          .map((t) => ({ tribe: t, members: state.people.filter((p) => p.tribeId === t.id && matches(p)) }))
          .filter((t) => !filtering || t.members.length > 0);
        const allMembers = state.people.filter((p) => state.tribes.some((t) => t.id === p.tribeId && t.departmentId === d.id));
        const gaps = allMembers.filter((p) => personIssues(p).length > 0).length;
        return { dept: d, tribes: deptTribes, memberCount: allMembers.length, gaps, cov: coverage(state, "mentor", d.id) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, q, mode],
  );

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  const allIds = [...state.departments.map((d) => d.id), ...state.tribes.map((t) => t.id)];

  return (
    <div className="space-y-5">
      <OrgCrumb />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="People"
          value={state.people.length}
          sub={`${state.departments.length} departments · ${state.tribes.length} tribes`}
          icon={<Users className="h-4 w-4" />}
          delayClass="d1"
        />
        <StatTile
          label="Active mentors"
          value={mentors.length}
          sub={`avg load ${avgLoad} mentees`}
          icon={<GraduationCap className="h-4 w-4" />}
          delayClass="d2"
        />
        <StatTile
          label="Mentor coverage"
          value={`${covM.pct}%`}
          sub={`${covM.covered} of ${covM.eligible} covered · reviewers ${covR.pct}%`}
          icon={<ShieldCheck className="h-4 w-4" />}
          delayClass="d3"
        />
        <StatTile
          label="Open assignments"
          value={attention.length}
          sub={`${mentorGaps} mentor · ${reviewerGaps} reviewer`}
          icon={<AlertCircle className="h-4 w-4" />}
          accent="gold"
          delayClass="d4"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── hierarchy tree ── */}
        <Card className="anim-fade-up d2 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3.5">
            <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 transition-colors focus-within:border-ring">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter people, skills…"
                className="w-36 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70 sm:w-44"
              />
            </div>
            <Seg
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: "all", label: "Everyone" },
                { value: "gaps", label: `Needs attention${attention.length ? ` · ${attention.length}` : ""}` },
              ]}
            />
            <div className="ml-auto flex items-center gap-1">
              <Button size="xs" variant="ghost" onClick={() => setExpanded(Object.fromEntries(allIds.map((id) => [id, true])))}>
                Expand all
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setExpanded(Object.fromEntries(allIds.map((id) => [id, false])))}>
                Collapse all
              </Button>
            </div>
          </div>

          <div className="space-y-1 p-2.5">
            {tree.map(({ dept, tribes, memberCount, gaps, cov }) => {
              const open = filtering || !!expanded[dept.id];
              return (
                <div key={dept.id}>
                  <button
                    type="button"
                    onClick={() => toggle(dept.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-secondary/60"
                  >
                    <ChevronRight
                      className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-90")}
                    />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[4px]" style={{ backgroundColor: dept.color }} />
                    <span className="font-display text-[15px] font-bold tracking-tight">{dept.name}</span>
                    <span className="ml-auto flex items-center gap-2.5">
                      {gaps > 0 && <Badge variant="gold">{gaps} open</Badge>}
                      <span className="hidden font-mono text-[11px] font-bold tabular-nums text-muted-foreground sm:block">
                        {memberCount} people
                      </span>
                      <Tip label={`Mentor coverage ${cov.pct}% · ${cov.covered}/${cov.eligible}`}>
                        <span className="cursor-help">
                          <CoverageRing pct={cov.pct} size={30} stroke={4} showLabel={false} />
                        </span>
                      </Tip>
                    </span>
                  </button>
                  <Expandable open={open}>
                    <div className="relative ml-[19px] space-y-0.5 border-l-2 border-line pl-2.5 pb-1">
                      {tribes.length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No people match the current filter.</p>
                      )}
                      {tribes.map(({ tribe, members: visibleMembers }) => (
                        <TribeBranch
                          key={tribe.id}
                          tribe={tribe}
                          visible={visibleMembers}
                          open={!!expanded[tribe.id]}
                          onToggle={() => toggle(tribe.id)}
                          forceOpen={filtering}
                        />
                      ))}
                    </div>
                  </Expandable>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── right rail ── */}
        <div className="space-y-5">
          <Card className="anim-fade-up d3 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line p-4 pb-3">
              <h3 className="font-display text-[15px] font-bold tracking-tight">Needs attention</h3>
              {attention.length > 0 ? (
                <Badge variant="gold">{attention.length}</Badge>
              ) : (
                <Badge variant="default">
                  <CheckCircle2 className="h-3 w-3" /> clear
                </Badge>
              )}
            </div>
            <CardContent className="max-h-[340px] space-y-1 overflow-y-auto p-2.5">
              {attention.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </span>
                  <p className="text-sm font-bold">Everyone is covered</p>
                  <p className="max-w-[200px] text-xs text-muted-foreground">
                    Every member has a mentor and a reviewer. Nice canopy.
                  </p>
                </div>
              )}
              {attention.map(({ person, needs }) => (
                <div
                  key={person.id}
                  className="flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 transition-all hover:border-line hover:bg-secondary/40"
                >
                  <Avatar name={person.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => openPerson(person.id, needs[0])}
                      className="block max-w-full cursor-pointer truncate text-left text-[13px] font-bold hover:text-primary"
                    >
                      {person.name}
                    </button>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {tribeOf(state, person).name} · {deptOf(state, person).name}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {needs.map((r: Role) => (
                      <Button
                        key={r}
                        size="xs"
                        variant={r === "mentor" ? "gold" : "outline"}
                        onClick={() => openPerson(person.id, r)}
                      >
                        {r === "mentor" ? "Mentor" : "Reviewer"}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="anim-fade-up d4 overflow-hidden">
            <div className="border-b border-line p-4 pb-3">
              <h3 className="font-display text-[15px] font-bold tracking-tight">Recent activity</h3>
            </div>
            <CardContent className="max-h-[260px] space-y-2.5 overflow-y-auto p-4">
              {state.activity.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
              {state.activity.map((a) => (
                <div key={a.id} className="anim-fade-in flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      a.tone === "success" ? "bg-primary" : a.tone === "warn" ? "bg-accent" : "bg-[#9d8fd0]",
                    )}
                  />
                  <p className="min-w-0 flex-1 text-xs leading-relaxed text-foreground/85">{a.text}</p>
                  <span className="shrink-0 font-mono text-[10px] font-semibold text-muted-foreground/80">{timeAgo(a.ts)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
