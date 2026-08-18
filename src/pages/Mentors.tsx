import { useState } from "react";
import { Sparkles, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { deptOf, loadOf, maxAssignsOf, menteesOf, mentorSuggestions, tribeOf } from "../lib/scoring";
import { useStore } from "../lib/store";
import type { Person, Role } from "../lib/types";
import { cn } from "../lib/utils";
import { Avatar, Badge, Button, Card, Progress, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Tip } from "../components/ui";
import { LevelBadge, SkillRow } from "../components/bits";

function PersonCard({ person, role, index }: { person: Person; role: Role; index: number }) {
  const { state, dispatch } = useStore();
  const dept = deptOf(state, person);
  const tribe = tribeOf(state, person);
  const cap = maxAssignsOf(state, person, role);
  const load = loadOf(state, person.id, role);
  const mentees = menteesOf(state, person.id, role);
  const pct = Math.min(100, Math.round((load / cap) * 100));
  const full = load >= cap;
  const active = role === "mentor" ? person.isMentor : person.isReviewer;
  const delays = ["d1", "d2", "d3", "d4", "d5", "d6"];

  const toggle = (on: boolean) => {
    if (!on && load > 0) {
      toast.error(
        `${person.name} still carries ${load} ${role === "mentor" ? "mentee" : "review"}${load > 1 ? "s" : ""}`,
        { description: "Reassign them first, then deactivate." },
      );
      return;
    }
    dispatch({ type: "toggle-role", personId: person.id, role });
    toast[on ? "success" : "info"](
      on ? `${person.name} is now accepting ${role === "mentor" ? "mentees" : "reviews"}` : `${person.name} stepped back from ${role} duty`,
    );
  };

  return (
    <Card
      className={cn(
        "anim-fade-up flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop",
        delays[index % delays.length],
      )}
    >
      <div className="flex-1 p-4">
        <div className="flex items-start gap-3">
          <Avatar name={person.name} size="lg" ring />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold">{person.name}</span>
              <LevelBadge level={person.level} />
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dept.color }} />
              {tribe.name} · {dept.name} · {person.location}
            </p>
          </div>
          {full && <Badge variant="danger">Full</Badge>}
        </div>

        <div className="mt-3">
          <SkillRow skills={person.skills} max={4} />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {role === "mentor" ? "Mentee load" : "Review load"}
            </span>
            <span className={cn("font-mono text-[11.5px] font-bold tabular-nums", full ? "text-destructive" : "text-foreground/80")}>
              {load}/{cap}
            </span>
          </div>
          <Progress value={pct} tone={full ? "danger" : pct >= 75 ? "gold" : "default"} />
        </div>

        <div className="mt-3.5 flex min-h-7 flex-wrap items-center gap-1.5">
          {mentees.length === 0 ? (
            <span className="text-xs text-muted-foreground/80">
              No active {role === "mentor" ? "mentees" : "reviews"} yet
            </span>
          ) : (
            mentees.map((m) => (
              <Tip key={m.id} label={`${m.name} · L${m.level}`}>
                <span className="cursor-default transition-transform hover:-translate-y-0.5">
                  <Avatar name={m.name} size="sm" />
                </span>
              </Tip>
            ))
          )}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line bg-secondary/30 px-4 py-2.5">
        <span className="text-xs font-semibold text-muted-foreground">
          {role === "mentor" ? "Accepting mentees" : "Accepting reviews"}
        </span>
        <Switch checked={active} onCheckedChange={toggle} />
      </div>
    </Card>
  );
}

export function MentorsPage() {
  const { state, dispatch } = useStore();
  const [role, setRole] = useState<Role>("mentor");

  const list = state.people
    .filter((p) => (role === "mentor" ? p.isMentor : p.isReviewer))
    .sort((a, b) => loadOf(state, b.id, role) - loadOf(state, a.id, role) || b.level - a.level);

  const mentorsCount = state.people.filter((p) => p.isMentor).length;
  const reviewersCount = state.people.filter((p) => p.isReviewer).length;
  const suggestions = role === "mentor" ? mentorSuggestions(state) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
          <TabsList>
            <TabsTrigger value="mentor">
              Mentors <Badge variant="neutral">{mentorsCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reviewer">
              Reviewers <Badge variant="neutral">{reviewersCount}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs font-medium text-muted-foreground">
          Caps come from each department's rules — adjust them under <b className="text-foreground">Proposal rules</b>.
        </p>
      </div>

      {suggestions.length > 0 && (
        <Card className="anim-fade-up overflow-hidden border-primary/25">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft">
              <Sparkles className="anim-sparkle h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">AI suggests activating these mentors</p>
              <p className="text-xs text-muted-foreground">
                Senior level, relevant skills, and room in their week — strong candidates to grow the mentor pool.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {suggestions.map((p) => (
                <Tip key={p.id} label={`L${p.level} · ${p.skills.slice(0, 3).join(", ")} · ${p.location}`}>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: "toggle-role", personId: p.id, role: "mentor" });
                      toast.success(`${p.name} activated as a mentor`, {
                        description: "They will now appear in AI proposals.",
                      });
                    }}
                    className="group flex cursor-pointer items-center gap-2 rounded-full border border-primary/25 bg-card py-1 pl-1 pr-3 transition-all duration-150 hover:border-primary/60 hover:shadow-lift"
                  >
                    <Avatar name={p.name} size="sm" />
                    <span className="text-xs font-bold">{p.name.split(" ")[0]}</span>
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <UserPlus className="h-3 w-3" />
                    </span>
                  </button>
                </Tip>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Tabs value={role} className="w-full">
        <TabsContent value="mentor" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((p, i) => (
              <PersonCard key={p.id} person={p} role="mentor" index={i} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="reviewer" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((p, i) => (
              <PersonCard key={p.id} person={p} role="reviewer" index={i} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {list.length === 0 && (
        <Card className="anim-fade-up p-10 text-center">
          <Users className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-bold">No {role}s yet</p>
          <p className="text-xs text-muted-foreground">Activate people with the switch on their card.</p>
        </Card>
      )}
    </div>
  );
}
