import React, { useEffect, useState } from "react";
import { Check, MapPin, Pencil } from "lucide-react";
import type { Level, Person, Role } from "../lib/types";
import { cn, firstName, toneFor } from "../lib/utils";
import { Avatar, Badge } from "./ui";

/* ─────────────────────────── Level ─────────────────────────── */

const LEVEL_STYLE: Record<Level, string> = {
  1: "bg-secondary text-muted-foreground",
  2: "bg-[#e0e8ec] text-[#42606e]",
  3: "bg-[#d9e5e8] text-[#205e63]",
  4: "bg-primary-soft text-primary",
  5: "bg-primary text-primary-foreground",
};

export function LevelBadge({ level, className }: { level: Level; className?: string }) {
  return (
    <span
      title={`Level ${level}`}
      className={cn(
        "inline-flex h-5 min-w-8 items-center justify-center rounded px-1.5 font-mono text-[10.5px] font-bold",
        LEVEL_STYLE[level],
        className,
      )}
    >
      L{level}
    </span>
  );
}

/* ─────────────────────────── Skills ─────────────────────────── */

export function SkillTag({ skill, className }: { skill: string; className?: string }) {
  const tone = toneFor(skill);
  return (
    <span
      className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {skill}
    </span>
  );
}

export function SkillRow({ skills, max = 3 }: { skills: string[]; max?: number }) {
  const shown = skills.slice(0, max);
  const rest = skills.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((s) => (
        <SkillTag key={s} skill={s} />
      ))}
      {rest > 0 && (
        <span className="font-mono text-[10.5px] font-bold text-muted-foreground" title={skills.slice(max).join(", ")}>
          +{rest}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────── Relation chip ─────────────────────────── */

export function RelationChip({
  assigned,
  role,
  onClick,
}: {
  assigned: Person | undefined;
  role: Role;
  onClick: () => void;
}) {
  if (!assigned) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-accent/60 bg-accent-soft/50 px-2 py-1 text-[11px] font-bold text-accent transition-all hover:border-accent hover:bg-accent-soft hover:shadow-sm"
      >
        <span className="pulse-gold inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        Assign {role}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-transparent py-0.5 pl-0.5 pr-1.5 transition-all hover:border-line hover:bg-secondary"
      title={`Change ${role}`}
    >
      <Avatar name={assigned.name} size="xs" />
      <span className="text-xs font-semibold text-foreground/85">{firstName(assigned.name)}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

/* ─────────────────────────── Status ─────────────────────────── */

export function StatusBadge({ issues }: { issues: Role[] }) {
  if (issues.length === 0) {
    return (
      <Badge variant="default">
        <Check className="h-3 w-3" /> Covered
      </Badge>
    );
  }
  if (issues.length > 1) {
    return <Badge variant="danger">Needs both</Badge>;
  }
  return <Badge variant="gold">Needs {issues[0]}</Badge>;
}

export function MetaLine({
  location,
  detail,
  className,
}: {
  location?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11.5px] text-muted-foreground", className)}>
      {location && (
        <>
          <MapPin className="h-3 w-3" /> {location}
        </>
      )}
      {location && detail && <span className="text-border">•</span>}
      {detail}
    </span>
  );
}

/* ─────────────────────────── Coverage ring ─────────────────────────── */

export function CoverageRing({
  pct,
  size = 44,
  stroke = 5,
  className,
  showLabel = true,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(pct), 90);
    return () => clearTimeout(t);
  }, [pct]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = pct >= 90 ? "#15594b" : pct >= 70 ? "#b45309" : "#b23a48";
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8e1" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      {showLabel && (
        <span className="absolute font-mono text-[10px] font-bold tabular-nums" style={{ color }}>
          {pct}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────── Stat tile ─────────────────────────── */

export function StatTile({
  label,
  value,
  sub,
  icon,
  delayClass,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  delayClass?: string;
  accent?: "gold" | "green" | "danger";
}) {
  return (
    <div
      className={cn(
        "anim-fade-up group relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-lift transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop",
        delayClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground/70 transition-transform duration-200 group-hover:scale-110">{icon}</span>}
      </div>
      <p className="mt-1.5 font-display text-[26px] font-bold leading-none tracking-tight tabular-nums">{value}</p>
      {sub && (
        <p
          className={cn(
            "mt-1.5 text-xs font-semibold",
            accent === "gold" ? "text-accent" : accent === "danger" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
