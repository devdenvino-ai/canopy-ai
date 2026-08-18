import { useMemo, useState } from "react";
import { ArrowRight, Search, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { deptOf, loadOf, maxAssignsOf, menteesOf, personById, tribeOf } from "../lib/scoring";
import { useStore, useUI } from "../lib/store";
import type { Person, Role } from "../lib/types";
import { cn, firstName, initials, toneFor } from "../lib/utils";
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Seg } from "../components/ui";
import { LevelBadge } from "../components/bits";

function MiniAvatar({ name, size = "h-7 w-7 text-[10px]" }: { name: string; size?: string }) {
  const t = toneFor(name);
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", size)}
      style={{ backgroundColor: t.bg, color: t.fg }}
    >
      {initials(name)}
    </span>
  );
}

function PickMenteeDialog({
  holder,
  role,
  open,
  onClose,
}: {
  holder: Person;
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  const candidates = useMemo(
    () =>
      state.people
        .filter((p) => p.id !== holder.id)
        .filter((p) => (role === "mentor" ? p.mentorId !== holder.id : p.reviewerId !== holder.id))
        .filter((p) => {
          if (!needle) return true;
          const dept = deptOf(state, p);
          return [p.name, p.location, dept.name, tribeOf(state, p).name, ...p.skills].some((s) =>
            s.toLowerCase().includes(needle),
          );
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state, holder.id, role, needle],
  );

  const pick = (member: Person) => {
    const prev = personById(state, (role === "mentor" ? member.mentorId : member.reviewerId) ?? null);
    dispatch({ type: "assign", personId: member.id, role, targetId: holder.id });
    toast.success(`${holder.name} is now ${member.name}'s ${role}`, {
      description: prev ? `Replaced ${prev.name}.` : undefined,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <MiniAvatar name={holder.name} size="h-8 w-8 text-[11px]" />
            Add to {holder.name.split(" ")[0]}'s {role === "mentor" ? "mentees" : "reviews"}
          </DialogTitle>
          <DialogDescription>Pick a member — this assigns {firstName(holder.name)} as their {role}.</DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-2">
          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 focus-within:border-ring">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search members…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto px-5 pb-5">
          {candidates.map((m) => {
            const current = personById(state, (role === "mentor" ? m.mentorId : m.reviewerId) ?? null);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => pick(m)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-all hover:border-line hover:bg-secondary/60"
              >
                <MiniAvatar name={m.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] font-bold">
                    {m.name} <LevelBadge level={m.level} />
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {tribeOf(state, m).name} · {m.location}
                  </span>
                </span>
                {current ? (
                  <Badge variant="gold">has {firstName(current.name)}</Badge>
                ) : (
                  <Badge variant="neutral">open</Badge>
                )}
              </button>
            );
          })}
          {candidates.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No members match.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HolderRow({ holder, role, index }: { holder: Person; role: Role; index: number }) {
  const { state, dispatch } = useStore();
  const { openPerson } = useUI();
  const [pickerOpen, setPickerOpen] = useState(false);
  const dept = deptOf(state, holder);
  const tribe = tribeOf(state, holder);
  const mentees = menteesOf(state, holder.id, role);
  const cap = maxAssignsOf(state, holder, role);
  const load = loadOf(state, holder.id, role);
  const full = load >= cap;
  const delays = ["d1", "d2", "d3", "d4", "d5", "d6"];

  const remove = (member: Person) => {
    dispatch({ type: "assign", personId: member.id, role, targetId: null });
    toast.warning(`${member.name} no longer has ${holder.name.split(" ")[0]} as ${role}`, {
      description: "They will reappear in the attention queue.",
    });
  };

  return (
    <Card
      className={cn(
        "anim-fade-up overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop",
        delays[index % delays.length],
      )}
    >
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        {/* holder */}
        <div className="flex w-full shrink-0 items-center gap-3 md:w-[240px]">
          <MiniAvatar name={holder.name} size="h-10 w-10 text-xs" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{holder.name}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dept.color }} />
              {tribe.name} · <LevelBadge level={holder.level} className="h-4" />
            </p>
          </div>
          <span
            className={cn(
              "ml-auto shrink-0 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-bold tabular-nums",
              full ? "bg-destructive-soft text-destructive" : "bg-secondary text-muted-foreground",
            )}
          >
            {load}/{cap}
          </span>
        </div>

        <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 md:block" />

        {/* mentees */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {mentees.length === 0 && (
            <span className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">
              No {role === "mentor" ? "mentees" : "reviews"} yet — extra capacity for AI proposals
            </span>
          )}
          {mentees.map((m) => (
            <span
              key={m.id}
              className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-secondary/50 py-1 pl-1 pr-1.5 transition-all hover:border-border hover:bg-secondary"
            >
              <button type="button" className="flex cursor-pointer items-center gap-1.5" onClick={() => openPerson(m.id, role)}>
                <MiniAvatar name={m.name} size="h-5 w-5 text-[8px]" />
                <span className="text-xs font-bold">{firstName(m.name)}</span>
                <span className="font-mono text-[9.5px] font-bold text-muted-foreground">L{m.level}</span>
              </button>
              <button
                type="button"
                onClick={() => remove(m)}
                title={`Remove ${role} link`}
                className="grid h-4 w-4 cursor-pointer place-items-center rounded-full text-muted-foreground/60 transition-all hover:bg-destructive-soft hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={full}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-[11px] font-bold transition-all",
              full
                ? "cursor-not-allowed border-border text-muted-foreground/50"
                : "border-primary/40 text-primary hover:border-primary hover:bg-primary-soft",
            )}
          >
            <UserPlus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>
      {pickerOpen && <PickMenteeDialog holder={holder} role={role} open={pickerOpen} onClose={() => setPickerOpen(false)} />}
    </Card>
  );
}

export function RelationshipsPage() {
  const { state } = useStore();
  const [role, setRole] = useState<Role>("mentor");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "open">("all");

  const holders = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.people
      .filter((p) => (role === "mentor" ? p.isMentor : p.isReviewer))
      .map((p) => ({ person: p, mentees: menteesOf(state, p.id, role) }))
      .filter(({ person, mentees }) => {
        if (filter === "active" && mentees.length === 0) return false;
        if (filter === "open" && mentees.length > 0) return false;
        if (!needle) return true;
        return (
          person.name.toLowerCase().includes(needle) ||
          mentees.some((m) => m.name.toLowerCase().includes(needle)) ||
          deptOf(state, person).name.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.mentees.length - a.mentees.length || a.person.name.localeCompare(b.person.name));
  }, [state, role, q, filter]);

  const totalLinks = holders.reduce((s, h) => s + h.mentees.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Seg
          value={role}
          onChange={setRole}
          options={[
            { value: "mentor", label: "Mentor → mentees" },
            { value: "reviewer", label: "Reviewer → members" },
          ]}
        />
        <Seg
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "With links" },
            { value: "open", label: "Open capacity" },
          ]}
        />
        <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 focus-within:border-ring">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${role}s or their people…`}
            className="w-44 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
          {totalLinks} {role === "mentor" ? "mentorship" : "review"} links · {holders.length} {role}s
        </span>
      </div>

      <div className="space-y-2.5">
        {holders.map((h, i) => (
          <HolderRow key={`${role}-${h.person.id}`} holder={h.person} role={role} index={i} />
        ))}
        {holders.length === 0 && (
          <Card className="anim-fade-up p-10 text-center">
            <Users className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-bold">Nothing matches</p>
            <p className="text-xs text-muted-foreground">
              {q ? "Try another search." : `Activate ${role}s in Mentors & Reviewers to build ${role === "mentor" ? "mentorship" : "review"} links.`}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
