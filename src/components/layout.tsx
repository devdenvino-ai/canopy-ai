import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  GraduationCap,
  Network,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { attentionList, coverage, deptOf, tribeOf } from "../lib/scoring";
import { useStore, useUI, type Page } from "../lib/store";
import { cn } from "../lib/utils";
import { Avatar, Badge, Popover, PopoverContent, PopoverTrigger, Separator, Tip } from "./ui";
import { CoverageRing } from "./bits";

/* ─────────────────────────── brand ─────────────────────────── */

function BrandMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-soft shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 3.2 4.4 7.8l7.6 4.6 7.6-4.6L12 3.2Z" fill="#a78bfa" />
        <path d="m4.4 12 7.6 4.6L19.6 12" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m4.4 16.2 7.6 4.6 7.6-4.6" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ─────────────────────────── sidebar ─────────────────────────── */

const NAV: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Organization", icon: Network },
  { id: "members", label: "Members", icon: Users },
  { id: "relationships", label: "Relationships", icon: Share2 },
  { id: "mentors", label: "Mentors & Reviewers", icon: GraduationCap },
  { id: "rules", label: "Proposal rules", icon: SlidersHorizontal },
];

export function Sidebar() {
  const { state, dispatch } = useStore();
  const { page, setPage, setRulesDeptId } = useUI();
  const attention = attentionList(state).length;

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col border-r border-black/20 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <BrandMark />
        <div className="leading-tight">
          <p className="font-display text-[17px] font-bold tracking-tight text-white">Canopy</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-muted">Mentorship ops</p>
        </div>
      </div>

      <nav className="space-y-1 px-3">
        {NAV.map((item) => {
          const active = page === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={cn(
                "relative flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-semibold transition-all duration-150",
                active
                  ? "bg-sidebar-soft text-white"
                  : "text-sidebar-muted hover:bg-white/[0.045] hover:text-sidebar-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#a78bfa] transition-all duration-200",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon className={cn("h-4 w-4 transition-colors", active ? "text-[#a78bfa]" : "")} />
              {item.label}
              {item.id === "overview" && attention > 0 && (
                <span className="ml-auto rounded-full bg-accent px-1.5 py-px font-mono text-[10px] font-bold text-accent-foreground">
                  {attention}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-7 px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-muted/80">Departments</p>
      </div>
      <div className="mt-2 space-y-1 px-3">
        {state.departments.map((d) => {
          const cov = coverage(state, "mentor", d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setRulesDeptId(d.id);
                setPage("rules");
              }}
              className="group w-full cursor-pointer rounded-md px-3 py-2 text-left transition-colors hover:bg-white/[0.045]"
              title={`Open ${d.name} rules`}
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="flex-1 truncate text-[13px] font-medium text-sidebar-foreground/90 group-hover:text-white">
                  {d.name}
                </span>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-sidebar-muted">
                  {cov.pct}%
                </span>
              </span>
              <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${cov.pct}%`, backgroundColor: d.color }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto space-y-2 border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a78bfa] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#a78bfa]" />
          </span>
          <p className="text-[11px] font-medium text-sidebar-muted">Autosaved · rules engine live</p>
        </div>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "reset" });
            toast.info("Demo data restored");
          }}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-sidebar-muted transition-colors hover:bg-white/[0.045] hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
        </button>
      </div>
    </aside>
  );
}

/* ─────────────────────────── global search ─────────────────────────── */

function GlobalSearch() {
  const { state } = useStore();
  const { openPerson } = useUI();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const needle = q.trim().toLowerCase();
  const results = needle
    ? state.people
        .filter((p) => {
          const tribe = tribeOf(state, p);
          const dept = deptOf(state, p);
          return [p.name, p.location, tribe.name, dept.name, ...p.skills].some((s) =>
            s.toLowerCase().includes(needle),
          );
        })
        .slice(0, 7)
    : [];

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
        else setTimeout(() => inputRef.current?.focus(), 30);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-60 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-muted-foreground transition-all duration-150 hover:border-input hover:shadow-sm lg:w-72"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Find a person…</span>
          <kbd className="rounded border border-border bg-secondary px-1.5 py-px font-mono text-[10px] font-bold">/</kbd>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, skill, tribe, location…"
            className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {!needle && (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">
              Search across <b className="text-foreground">{state.people.length} people</b> — try{" "}
              <button type="button" className="cursor-pointer font-semibold text-primary hover:underline" onClick={() => setQ("React")}>
                React
              </button>{" "}
              or{" "}
              <button type="button" className="cursor-pointer font-semibold text-primary hover:underline" onClick={() => setQ("Berlin")}>
                Berlin
              </button>
              .
            </p>
          )}
          {needle && results.length === 0 && (
            <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">No one matches “{q}”.</p>
          )}
          {results.map((p) => {
            const tribe = tribeOf(state, p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  openPerson(p.id);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-primary-soft/70"
              >
                <Avatar name={p.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{p.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {tribe.name} · {deptOf(state, p).name} · L{p.level}
                  </span>
                </span>
                {(!p.mentorId && p.level < 5) || !p.reviewerId ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" title="Has open assignments" />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─────────────────────────── topbar ─────────────────────────── */

const TITLES: Record<Page, { title: string; sub: string }> = {
  overview: {
    title: "Organization",
    sub: "Departments → tribes → people, with every mentor and reviewer link in sight.",
  },
  members: {
    title: "Members",
    sub: "Everyone across tribes — filter, search, and close coverage gaps.",
  },
  relationships: {
    title: "Relationships",
    sub: "Every mentor → mentee and reviewer → member link, with room to add more.",
  },
  mentors: {
    title: "Mentors & Reviewers",
    sub: "Capacity, load, and who is ready to step up next.",
  },
  rules: {
    title: "Proposal rules",
    sub: "The AI follows these when suggesting mentors — tune them per department.",
  },
};

export function Topbar() {
  const { state } = useStore();
  const { page, setPage } = useUI();
  const t = TITLES[page];
  const cov = coverage(state, "mentor");
  const attention = attentionList(state).length;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold tracking-tight">{t.title}</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{t.sub}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <GlobalSearch />
          <Separator orientation="vertical" className="hidden h-7 w-px bg-line md:block" />
          <Tip label={`Mentor coverage · ${cov.covered}/${cov.eligible} members covered`}>
            <button
              type="button"
              onClick={() => setPage("overview")}
              className="hidden cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-secondary/70 md:flex"
            >
              <CoverageRing pct={cov.pct} size={34} stroke={4} />
              <span className="text-left leading-tight">
                <span className="block font-mono text-[11px] font-bold tabular-nums">{cov.pct}%</span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  coverage
                </span>
              </span>
            </button>
          </Tip>
          {attention > 0 && (
            <button
              type="button"
              onClick={() => setPage("overview")}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-accent/30 bg-accent-soft px-3 text-[13px] font-bold text-accent transition-all duration-150 hover:border-accent/60 hover:shadow-sm"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {attention} to assign
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function OrgCrumb() {
  const { state } = useStore();
  const mentors = state.people.filter((p) => p.isMentor).length;
  const reviewers = state.people.filter((p) => p.isReviewer).length;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted-foreground">
      <Badge variant="dark">{state.departments.length} departments</Badge>
      <span className="text-border">→</span>
      <Badge variant="neutral">{state.tribes.length} tribes</Badge>
      <span className="text-border">→</span>
      <Badge variant="neutral">{state.people.length} people</Badge>
      <span className="text-border">·</span>
      <span>
        <b className="text-primary">{mentors} mentors</b> and <b className="text-primary">{reviewers} reviewers</b> active
      </span>
    </div>
  );
}
