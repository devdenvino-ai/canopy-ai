import { useMemo, useRef, useState } from "react";
import { GraduationCap, ShieldCheck } from "lucide-react";
import type { Department, Person, Tribe } from "../lib/types";
import { useStore, useUI } from "../lib/store";
import { initials, toneFor } from "../lib/utils";
import { personIssues, personById } from "../lib/scoring";

export type GraphDir = "horizontal" | "vertical";

const ell = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

interface TipState {
  x: number;
  y: number;
  person: Person;
}

interface NodeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cy: number;
}

/** Layouts both directions. Horizontal: dept left → tribes middle → members right. */
function computeLayout(
  dept: Department,
  tribes: Tribe[],
  byTribe: Record<string, Person[]>,
  dir: GraphDir,
) {
  if (dir === "vertical") {
    const colW = 252;
    const W = Math.max(760, tribes.length * colW + 16);
    const maxRows = Math.max(1, ...tribes.map((t) => byTribe[t.id]?.length ?? 0));
    const H = 190 + maxRows * 46 + 40;
    const deptX = W / 2 - 80;
    const tribeNodes: NodeRect[] = tribes.map((t, i) => ({
      id: t.id,
      x: 16 + i * colW,
      y: 122,
      w: colW - 28,
      h: 48,
      cy: 146,
    }));
    const memberNodes: NodeRect[] = tribes.flatMap((t, ti) =>
      (byTribe[t.id] ?? []).map((p, ri) => ({
        id: p.id,
        x: 16 + ti * colW + 12,
        y: 196 + ri * 46,
        w: colW - 52,
        h: 40,
        cy: 216 + ri * 46,
      })),
    );
    return { W, H, dept: { x: deptX, y: 26, w: 160, h: 68, cy: 60 }, tribeNodes, memberNodes, dir };
  }

  // horizontal
  const W = 768;
  const ROW = 46;
  const GAP = 18;
  const PAD = 22;
  const bands = tribes.map((t) => ({ tribe: t, h: Math.max((byTribe[t.id]?.length ?? 0) * ROW + 20, 68) }));
  const H = Math.max(340, bands.reduce((s, b) => s + b.h, 0) + GAP * (bands.length - 1) + PAD * 2);
  const deptY = H / 2 - 38;
  let cursor = PAD;
  const tribeNodes: NodeRect[] = [];
  const memberNodes: NodeRect[] = [];
  bands.forEach((b) => {
    tribeNodes.push({ id: b.tribe.id, x: 238, y: cursor + b.h / 2 - 24, w: 192, h: 48, cy: cursor + b.h / 2 });
    (byTribe[b.tribe.id] ?? []).forEach((p, i) => {
      memberNodes.push({ id: p.id, x: 478, y: cursor + 10 + i * ROW, w: 278, h: 40, cy: cursor + 30 + i * ROW });
    });
    cursor += b.h + GAP;
  });
  return { W, H, dept: { x: 8, y: deptY, w: 176, h: 76, cy: H / 2 }, tribeNodes, memberNodes, dir };
}

export function DeptGraph({ dept, dir = "horizontal" }: { dept: Department; dir?: GraphDir }) {
  const { state } = useStore();
  const { openPerson } = useUI();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  const tribes = useMemo(() => state.tribes.filter((t) => t.departmentId === dept.id), [state.tribes, dept.id]);
  const byTribe = useMemo(() => {
    const map: Record<string, Person[]> = {};
    tribes.forEach((t) => {
      map[t.id] = state.people.filter((p) => p.tribeId === t.id).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
    });
    return map;
  }, [state.people, tribes]);

  const layout = useMemo(() => computeLayout(dept, tribes, byTribe, dir), [dept, tribes, byTribe, dir]);
  const { W, H } = layout;
  const horizontal = dir === "horizontal";

  const nodeById = useMemo(() => {
    const m = new Map<string, NodeRect>();
    layout.tribeNodes.forEach((n) => m.set(n.id, n));
    layout.memberNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [layout]);

  const onMove = (e: React.MouseEvent, person: Person) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      x: Math.min(Math.max(8, e.clientX - rect.left + 14), W - 232),
      y: Math.min(Math.max(8, e.clientY - rect.top + 12), H - 118),
      person,
    });
    setHoverId(person.id);
  };
  const clear = () => {
    setTip(null);
    setHoverId(null);
  };

  const mentorOf = (p: Person) => personById(state, p.mentorId ?? null);
  const reviewerOf = (p: Person) => personById(state, p.reviewerId ?? null);

  const related = (p: Person): Set<string> => {
    const s = new Set<string>([p.id]);
    if (p.mentorId) s.add(p.mentorId);
    if (p.reviewerId) s.add(p.reviewerId);
    state.people.forEach((o) => {
      if (o.mentorId === p.id || o.reviewerId === p.id) s.add(o.id);
    });
    return s;
  };
  const activeSet = useMemo(() => {
    if (!hoverId) return null;
    const hp = state.people.find((p) => p.id === hoverId);
    return hp ? related(hp) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverId, state.people]);

  const dim = (id: string) => (activeSet ? (activeSet.has(id) ? 1 : 0.22) : 1);

  const linkPath = (from: NodeRect, to: NodeRect, kind: "mentor" | "reviewer") => {
    const isTribeTarget = layout.tribeNodes.some((t) => t.id === to.id);
    if (horizontal) {
      if (isTribeTarget) {
        // curve from member's left edge to the tribe node's right edge
        return `M ${from.x} ${from.cy} C ${from.x - 96} ${from.cy}, ${to.x + to.w + 56} ${to.cy}, ${to.x + to.w} ${to.cy}`;
      }
      const bend = kind === "mentor" ? 78 : 116;
      return `M ${from.x} ${from.cy} C ${from.x - bend} ${from.cy}, ${to.x - bend} ${to.cy}, ${to.x} ${to.cy}`;
    }
    const x1 = from.x;
    const y1 = from.cy - from.h / 2;
    const x2 = to.x;
    const y2 = isTribeTarget ? to.y + to.h : to.cy - to.h / 2;
    return `M ${x1} ${y1} C ${x1} ${y1 - (kind === "mentor" ? 30 : 46)}, ${x2} ${y2 + (kind === "mentor" ? 30 : 46)}, ${x2} ${y2}`;
  };

  const hierarchyPath = (x1: number, y1: number, x2: number, y2: number) => {
    if (horizontal) {
      const dx = Math.min(56, (x2 - x1) / 2);
      return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    }
      const dy = Math.min(44, (y2 - y1) / 2);
      return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
  };

  const memberLinks = useMemo(() => {
    const rows: { key: string; d: string; kind: "mentor" | "reviewer"; from: string; to: string }[] = [];
    layout.memberNodes.forEach((n) => {
      const p = personById(state, n.id);
      if (!p) return;
      const m = mentorOf(p);
      const r = reviewerOf(p);
      const mNode = m ? nodeById.get(m.id) : undefined;
      const rNode = r ? nodeById.get(r.id) : undefined;
      if (m && mNode) rows.push({ key: `${p.id}-m`, d: linkPath(n, mNode, "mentor"), kind: "mentor", from: p.id, to: m.id });
      if (r && rNode) rows.push({ key: `${p.id}-r`, d: linkPath(n, rNode, "reviewer"), kind: "reviewer", from: p.id, to: r.id });
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, state.people, nodeById]);

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ minHeight: 300 }}>
        {/* hierarchy edges */}
        {layout.tribeNodes.map((t, i) => (
          <path
            key={`dt-${t.id}`}
            d={hierarchyPath(
              horizontal ? layout.dept.x + layout.dept.w : layout.dept.x + layout.dept.w / 2,
              horizontal ? layout.dept.cy : layout.dept.y + layout.dept.h,
              horizontal ? t.x : t.x + t.w / 2,
              horizontal ? t.cy : t.y,
            )}
            fill="none"
            stroke="#ddd8e8"
            strokeWidth={1.5}
            strokeDasharray={1}
            pathLength={1}
            className="anim-draw-line"
            style={{ animationDelay: `${i * 70}ms` }}
          />
        ))}
        {layout.memberNodes.map((n, i) => {
          const p = personById(state, n.id);
          const tNode = p ? layout.tribeNodes.find((t) => t.id === p.tribeId) : undefined;
          if (!tNode) return null;
          return (
            <path
              key={`tm-${n.id}`}
              d={hierarchyPath(
                horizontal ? tNode.x + tNode.w : tNode.x + tNode.w / 2,
                horizontal ? tNode.cy : tNode.y + tNode.h,
                horizontal ? n.x : n.x,
                horizontal ? n.cy : n.cy - n.h / 2,
              )}
              fill="none"
              stroke="#ddd8e8"
              strokeWidth={1.2}
              strokeDasharray={1}
              pathLength={1}
              className="anim-draw-line"
              style={{ animationDelay: `${120 + Math.min(i, 12) * 40}ms` }}
            />
          );
        })}

        {/* mentor / reviewer relationship links */}
        {memberLinks.map((l) => {
          const on = activeSet ? activeSet.has(l.from) && activeSet.has(l.to) : true;
          return (
            <path
              key={l.key}
              d={l.d}
              fill="none"
              stroke={l.kind === "mentor" ? "#5b21b6" : "#b45309"}
              strokeWidth={hoverId && on ? 2.2 : 1.6}
              strokeDasharray={l.kind === "reviewer" ? "5 4" : undefined}
              opacity={on ? (l.kind === "mentor" ? 0.8 : 0.75) : 0.08}
              style={{ transition: "opacity 0.2s ease, stroke-width 0.2s ease" }}
            />
          );
        })}

        {/* dept node */}
        <g className="anim-node-in">
          <rect x={layout.dept.x} y={layout.dept.y} width={layout.dept.w} height={layout.dept.h} rx={14} fill="#191227" />
          <circle cx={layout.dept.x + 24} cy={layout.dept.cy} r={5} fill={dept.color} className="anim-sparkle" style={{ transformOrigin: `${layout.dept.x + 24}px ${layout.dept.cy}px` }} />
          <text x={layout.dept.x + 40} y={layout.dept.cy - 4} fontSize={13} fontWeight={700} fill="#f3eefc" fontFamily="Bricolage Grotesque, sans-serif">
            {ell(dept.name, horizontal ? 15 : 17)}
          </text>
          <text x={layout.dept.x + 40} y={layout.dept.cy + 14} fontSize={10} fill="#9d94bd" fontFamily="JetBrains Mono, monospace">
            {tribes.length} tribes · {layout.memberNodes.length} people
          </text>
        </g>

        {/* tribe nodes */}
        {layout.tribeNodes.map((t, i) => {
          const tribe = tribes.find((x) => x.id === t.id)!;
          const lead = personById(state, tribe.leadId);
          const count = byTribe[tribe.id]?.length ?? 0;
          return (
            <g key={t.id} className="anim-node-in" style={{ animationDelay: `${i * 60}ms` }}>
              <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={11} fill="#ece9f3" stroke="#ddd8e8" />
              <circle cx={t.x + 18} cy={t.cy} r={4} fill={dept.color} />
              <text x={t.x + 30} y={t.cy - 2} fontSize={11.5} fontWeight={700} fill="#201a2e">
                {ell(tribe.name, 16)}
              </text>
              <text x={t.x + 30} y={t.cy + 13} fontSize={9} fill="#6a6480" fontFamily="JetBrains Mono, monospace">
                {count} ppl{lead ? ` · ${ell(lead.name.split(" ")[0], 10)}` : ""}
              </text>
            </g>
          );
        })}

        {/* member nodes */}
        {layout.memberNodes.map((n, i) => {
          const p = personById(state, n.id)!;
          const issues = personIssues(p);
          const mentor = mentorOf(p);
          const reviewer = reviewerOf(p);
          const tone = toneFor(p.name);
          const labelX = n.x + 44;
          return (
            <g
              key={n.id}
              className="anim-node-in cursor-pointer"
              style={{ animationDelay: `${140 + Math.min(i, 14) * 35}ms`, opacity: dim(n.id), transition: "opacity 0.2s ease" }}
              onMouseMove={(e) => onMove(e, p)}
              onMouseLeave={clear}
              onClick={() => openPerson(p.id, issues[0] ?? "mentor")}
            >
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={10}
                fill={hoverId === p.id ? "#f3eefc" : "#fcfbfe"}
                stroke={hoverId === p.id ? "#7c3aed" : "#ddd8e8"}
                strokeWidth={hoverId === p.id ? 1.5 : 1}
                style={{ transition: "fill 0.15s ease, stroke 0.15s ease" }}
              />
              <rect x={n.x} y={n.y + 6} width={4} height={n.h - 12} rx={2} fill={issues.length ? "#b45309" : "#5b21b6"} opacity={issues.length ? 1 : 0.45} />
              <circle cx={n.x + 24} cy={n.cy} r={11} fill={tone.bg} />
              <text x={n.x + 24} y={n.cy + 3.5} fontSize={8.5} fontWeight={800} fill={tone.fg} textAnchor="middle">
                {initials(p.name)}
              </text>
              <text x={labelX} y={n.cy - 2} fontSize={11} fontWeight={700} fill="#201a2e">
                {ell(p.name, 24)}
              </text>
              <text x={labelX} y={n.cy + 13} fontSize={9} fill="#6a6480" fontFamily="JetBrains Mono, monospace">
                L{p.level} · {ell(p.location, 14)}
              </text>
              {/* level + role chips */}
              <rect x={n.x + n.w - 56} y={n.cy - 8} width={17} height={15} rx={4} fill="#ece4fa" />
              <text x={n.x + n.w - 47.5} y={n.cy + 3} fontSize={8} fontWeight={800} fill="#5b21b6" textAnchor="middle">
                L{p.level}
              </text>
              {mentor && (
                <g opacity={activeSet && activeSet.has(mentor.id) ? 1 : 0.9}>
                  <rect x={n.x + n.w - 36} y={n.cy - 8} width={15} height={15} rx={4} fill="#ece4fa" />
                  <text x={n.x + n.w - 28.5} y={n.cy + 3.5} fontSize={8} fontWeight={800} fill="#5b21b6" textAnchor="middle">
                    M
                  </text>
                </g>
              )}
              {reviewer && (
                <g>
                  <rect x={n.x + n.w - 18} y={n.cy - 8} width={15} height={15} rx={4} fill="#f7e8d4" />
                  <text x={n.x + n.w - 10.5} y={n.cy + 3.5} fontSize={8} fontWeight={800} fill="#b45309" textAnchor="middle">
                    R
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-primary" />
          <span className="inline-block h-0 w-5 border-t-2 border-primary" /> mentor → mentee
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-accent" /> reviewer → member
        </span>
        <span className="ml-auto hidden font-mono text-[10px] sm:block">hover to trace · click to assign</span>
      </div>

      {/* tooltip */}
      {(() => {
        if (!tip) return null;
        const tm = mentorOf(tip.person);
        const tr = reviewerOf(tip.person);
        return (
        <div
          className="anim-pop-in pointer-events-none absolute z-20 w-[224px] rounded-lg border border-border bg-popover p-3 shadow-pop"
          style={{ left: tip.x, top: tip.y }}
        >
          <div className="flex items-center gap-2">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold"
              style={{ backgroundColor: toneFor(tip.person.name).bg, color: toneFor(tip.person.name).fg }}
            >
              {initials(tip.person.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold" title={tip.person.name}>
                {tip.person.name}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                L{tip.person.level} · {tip.person.location}
              </p>
            </div>
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <GraduationCap className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate">
                {tm ? (
                  <>
                    Mentor · <b className="text-foreground">{tm.name}</b>
                  </>
                ) : (
                  <b className="text-accent">No mentor yet</b>
                )}
              </span>
            </p>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-3 w-3 shrink-0 text-accent" />
              <span className="truncate">
                {tr ? (
                  <>
                    Reviewer · <b className="text-foreground">{tr.name}</b>
                  </>
                ) : (
                  <b className="text-accent">No reviewer yet</b>
                )}
              </span>
            </p>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
