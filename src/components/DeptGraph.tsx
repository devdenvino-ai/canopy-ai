import { useMemo, useRef, useState } from "react";
import { useStore, useUI } from "../lib/store";
import { maxAssignsOf, personById, personIssues } from "../lib/scoring";
import type { Department, Person } from "../lib/types";
import { cn, initials, toneFor } from "../lib/utils";

const W = 1160;
const PADX = 16;
const DEPT_W = 152;
const DEPT_H = 54;
const NODE_H = 38;
const ROW_GAP = 6;

type NodeInfo = { x: number; y: number; w: number; h: number };

function fitName(name: string, max: number) {
  if (name.length * 6.1 <= max) return name;
  const n = Math.max(3, Math.floor((max - 12) / 6.1));
  return name.slice(0, n) + "…";
}

function fitLoc(loc: string) {
  return loc.length > 20 ? loc.slice(0, 19) + "…" : loc;
}

/** Vertical org graph: department on top → tribes in a row → member columns below. */
export function DeptGraph({ dept }: { dept: Department }) {
  const { state } = useStore();
  const { openPerson } = useUI();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tip, setTip] = useState<{ person: Person; x: number; y: number } | null>(null);

  const layout = useMemo(() => {
    const tribes = state.tribes.filter((t) => t.departmentId === dept.id);
    const byTribe = new Map<string, Person[]>();
    tribes.forEach((t) =>
      byTribe.set(
        t.id,
        state.people.filter((p) => p.tribeId === t.id).sort((a, b) => a.name.localeCompare(b.name)),
      ),
    );

    const cols = Math.max(1, tribes.length);
    const colW = (W - PADX * 2) / cols;
    const nodeW = Math.min(colW - 14, 236);
    const tribeW = Math.min(nodeW - 30, 200);

    const deptNode: NodeInfo = { x: PADX, y: 16, w: DEPT_W, h: DEPT_H };
    const tribeY = deptNode.y + DEPT_H + 46;

    const tribeNodes = tribes.map((t, i) => {
      const cx = PADX + colW * (i + 0.5);
      return {
        tribe: t,
        cx,
        x: cx - tribeW / 2,
        y: tribeY,
        w: tribeW,
        h: NODE_H,
        count: byTribe.get(t.id)?.length ?? 0,
      };
    });

    const memberTop = tribeY + NODE_H + 34;
    const memberNodes: (NodeInfo & { id: string })[] = [];
    const byId = new Map<string, NodeInfo>();
    let bottom = memberTop;

    tribes.forEach((t, i) => {
      const members = byTribe.get(t.id) ?? [];
      const x = PADX + colW * i + (colW - nodeW) / 2;
      members.forEach((p, j) => {
        const y = memberTop + j * (NODE_H + ROW_GAP);
        const info: NodeInfo = { x, y, w: nodeW, h: NODE_H };
        memberNodes.push({ ...info, id: p.id });
        byId.set(p.id, info);
        bottom = Math.max(bottom, y + NODE_H);
      });
    });

    return { deptNode, tribeNodes, memberNodes, byId, H: bottom + 40, total: memberNodes.length };
  }, [state, dept.id]);

  const { deptNode, tribeNodes, memberNodes, byId, H, total } = layout;

  const personOf = (id: string) => state.people.find((p) => p.id === id);
  const mentorOf = (p: Person) => personById(state, p.mentorId ?? null);
  const reviewerOf = (p: Person) => personById(state, p.reviewerId ?? null);

  /* ── edges ── */

  const deptEdges = tribeNodes.map((t) => {
    const x1 = deptNode.x + DEPT_W / 2;
    const y1 = deptNode.y + DEPT_H;
    const dy = (t.y - y1) / 2;
    return { key: t.tribe.id, d: `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${t.cx} ${t.y - dy}, ${t.cx} ${t.y}` };
  });

  const spines = tribeNodes
    .map((t) => {
      const members = memberNodes.filter((m) => personOf(m.id)?.tribeId === t.tribe.id);
      if (!members.length) return null;
      const lastY = members[members.length - 1].y + NODE_H / 2;
      return { key: t.tribe.id, d: `M ${t.cx} ${t.y + NODE_H} L ${t.cx} ${lastY}` };
    })
    .filter((s): s is { key: string; d: string } => s !== null);

  const memberLinks = useMemo(() => {
    const rows: { key: string; d: string; kind: "mentor" | "reviewer"; from: string; to: string }[] = [];
    memberNodes.forEach((n) => {
      const p = personOf(n.id);
      if (!p) return;
      const m = mentorOf(p);
      const r = reviewerOf(p);
      const mNode = m ? byId.get(m.id) : undefined;
      const rNode = r ? byId.get(r.id) : undefined;
      const curve = (a: NodeInfo, b: NodeInfo, mul: number) => {
        const y1 = a.y + NODE_H / 2;
        const y2 = b.y + NODE_H / 2;
        const bow = Math.min(96, 30 + Math.abs(y2 - y1) * 0.18 + Math.abs(b.x - a.x) * 0.1) * mul;
        return `M ${a.x} ${y1} C ${a.x - bow} ${y1}, ${b.x - bow} ${y2}, ${b.x} ${y2}`;
      };
      if (m && mNode) rows.push({ key: `${p.id}-m`, d: curve(n, mNode, 1), kind: "mentor", from: p.id, to: m.id });
      if (r && rNode) rows.push({ key: `${p.id}-r`, d: curve(n, rNode, 1.35), kind: "reviewer", from: p.id, to: r.id });
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, state.people]);

  /* ── hover tracing ── */

  const hoverSet = useMemo(() => {
    if (!hoverId) return null;
    const s = new Set<string>([hoverId]);
    memberLinks.forEach((l) => {
      if (l.from === hoverId || l.to === hoverId) {
        s.add(l.from);
        s.add(l.to);
      }
    });
    return s;
  }, [hoverId, memberLinks]);

  const dim = (id: string) => (hoverSet ? (hoverSet.has(id) ? 1 : 0.3) : 1);
  const linkState = (l: { from: string; to: string }) =>
    !hoverSet ? "idle" : l.from === hoverId || l.to === hoverId ? "hot" : "cold";

  const onNodeEnter = (id: string, e: React.MouseEvent) => {
    setHoverId(id);
    const p = personOf(id);
    if (!p || !svgRef.current) return;
    const box = svgRef.current.getBoundingClientRect();
    setTip({ person: p, x: e.clientX - box.left, y: e.clientY - box.top });
  };
  const onNodeLeave = () => {
    setHoverId(null);
    setTip(null);
  };

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ minHeight: 320 }}>
        {/* hierarchy: department → tribes */}
        {deptEdges.map((e, i) => (
          <path
            key={`de-${e.key}`}
            d={e.d}
            pathLength={1}
            fill="none"
            stroke="#d9d3e6"
            strokeWidth={1.6}
            className="anim-draw-line"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
        {/* tribe spines down the member columns */}
        {spines.map((s, i) => (
          <path
            key={`sp-${s.key}`}
            d={s.d}
            pathLength={1}
            fill="none"
            stroke="#e4e0ee"
            strokeWidth={1.6}
            className="anim-draw-line"
            style={{ animationDelay: `${140 + i * 50}ms` }}
          />
        ))}

        {/* mentor / reviewer links */}
        <g className="anim-fade-in" style={{ animationDelay: "260ms" }}>
          {memberLinks.map((l) => {
            const st = linkState(l);
            const color = l.kind === "mentor" ? "#7c3aed" : "#b45309";
            return (
              <path
                key={l.key}
                d={l.d}
                fill="none"
                stroke={color}
                strokeWidth={st === "hot" ? 2.4 : 1.6}
                strokeDasharray={l.kind === "reviewer" ? "5 4" : undefined}
                pointerEvents="none"
                style={{
                  transition: "opacity 0.18s ease, stroke-width 0.18s ease",
                  opacity: st === "cold" ? 0.1 : st === "hot" ? 0.95 : l.kind === "mentor" ? 0.5 : 0.45,
                }}
              />
            );
          })}
        </g>

        {/* department node */}
        <g className="anim-node-in">
          <rect x={deptNode.x} y={deptNode.y} width={DEPT_W} height={DEPT_H} rx={12} fill="#191227" />
          <text
            x={deptNode.x + 16}
            y={deptNode.y + 24}
            fontSize={12.5}
            fontWeight={700}
            fill="#f3eefc"
            fontFamily="Bricolage Grotesque, sans-serif"
          >
            {fitName(dept.name, DEPT_W - 34)}
          </text>
          <text x={deptNode.x + 16} y={deptNode.y + 41} fontSize={10} fill="#9d94bd" fontFamily="JetBrains Mono, monospace">
            {tribeNodes.length} tribes · {total} people
          </text>
        </g>

        {/* tribe nodes */}
        {tribeNodes.map((t, i) => (
          <g key={t.tribe.id} className="anim-node-in" style={{ animationDelay: `${80 + i * 45}ms` }}>
            <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={10} fill="#ece9f3" stroke="#ddd8e8" />
            <circle cx={t.x + 15} cy={t.y + NODE_H / 2} r={4} fill={dept.color} />
            <text x={t.x + 27} y={t.y + NODE_H / 2 - 1.5} fontSize={11.5} fontWeight={700} fill="#201a2e">
              {fitName(t.tribe.name, t.w - 44)}
            </text>
            <text
              x={t.x + 27}
              y={t.y + NODE_H / 2 + 12}
              fontSize={9}
              fill="#6a6480"
              fontFamily="JetBrains Mono, monospace"
            >
              {t.count} member{t.count === 1 ? "" : "s"}
            </text>
          </g>
        ))}

        {/* member nodes */}
        {memberNodes.map((n, i) => {
          const p = personOf(n.id);
          if (!p) return null;
          const issues = personIssues(p);
          const tone = toneFor(p.name);
          const hot = hoverId === p.id;
          return (
            <g
              key={p.id}
              className="anim-node-in cursor-pointer"
              style={{ animationDelay: `${160 + i * 22}ms`, opacity: dim(p.id), transition: "opacity 0.18s ease" }}
              onClick={() => openPerson(p.id)}
              onMouseEnter={(e) => onNodeEnter(p.id, e)}
              onMouseLeave={onNodeLeave}
            >
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={NODE_H}
                rx={10}
                fill={hot ? "#f3eefc" : "#fcfbfe"}
                stroke={hot ? "#7c3aed" : "#ddd8e8"}
                strokeWidth={hot ? 1.6 : 1}
              />
              <rect
                x={n.x}
                y={n.y}
                width={4}
                height={NODE_H}
                rx={2}
                fill={issues.length ? "#b45309" : "#5b21b6"}
                opacity={issues.length ? 1 : 0.45}
              />
              <circle cx={n.x + 24} cy={n.y + NODE_H / 2} r={11} fill={tone.bg} />
              <text
                x={n.x + 24}
                y={n.y + NODE_H / 2 + 3}
                fontSize={8.5}
                fontWeight={800}
                fill={tone.fg}
                textAnchor="middle"
              >
                {initials(p.name)}
              </text>
              <text x={n.x + 42} y={n.y + 16.5} fontSize={11} fontWeight={700} fill="#201a2e">
                {fitName(p.name, n.w - 108)}
              </text>
              <text x={n.x + 42} y={n.y + 30.5} fontSize={9} fill="#6a6480" fontFamily="JetBrains Mono, monospace">
                L{p.level} · {fitLoc(p.location)}
              </text>
              {p.isMentor && (
                <>
                  <rect x={n.x + n.w - 40} y={n.y + 9} width={14} height={13} rx={4} fill="#ece4fa" />
                  <text x={n.x + n.w - 33} y={n.y + 18.5} fontSize={8} fontWeight={800} fill="#5b21b6" textAnchor="middle">
                    M
                  </text>
                </>
              )}
              {p.isReviewer && (
                <>
                  <rect x={n.x + n.w - 22} y={n.y + 9} width={14} height={13} rx={4} fill="#f7e8d4" />
                  <text x={n.x + n.w - 15} y={n.y + 18.5} fontSize={8} fontWeight={800} fill="#b45309" textAnchor="middle">
                    R
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {(() => {
        if (!tip) return null;
        const tm = mentorOf(tip.person);
        const tr = reviewerOf(tip.person);
        const tribe = state.tribes.find((t) => t.id === tip.person.tribeId);
        const cap = maxAssignsOf(state, tip.person, "mentor");
        const left = Math.min(Math.max(12, tip.x + 16), W - 250);
        const top = Math.min(Math.max(8, tip.y - 12), Math.max(8, H - 150));
        return (
          <div
            className="pointer-events-none absolute z-10 w-60 rounded-lg border border-border bg-popover p-3 shadow-pop"
            style={{ left, top }}
          >
            <p className="truncate text-[13px] font-bold">{tip.person.name}</p>
            <p className="truncate font-mono text-[10.5px] text-muted-foreground">
              L{tip.person.level} · {tribe?.name ?? "—"} · {tip.person.location}
            </p>
            <div className="mt-2 space-y-1 text-[11.5px] font-medium text-muted-foreground">
              <p className="truncate">
                {tm ? (
                  <>
                    Mentor · <b className="text-foreground">{tm.name}</b>
                  </>
                ) : (
                  <b className="text-accent">No mentor yet</b>
                )}
              </p>
              <p className="truncate">
                {tr ? (
                  <>
                    Reviewer · <b className="text-foreground">{tr.name}</b>
                  </>
                ) : (
                  <b className="text-accent">No reviewer yet</b>
                )}
              </p>
              {tip.person.isMentor && (
                <p className="truncate text-primary">
                  Mentor pool · cap {cap}
                </p>
              )}
            </div>
            <p className="mt-2 border-t border-line pt-1.5 text-[10px] font-semibold text-muted-foreground/80">
              Click to manage assignments
            </p>
          </div>
        );
      })()}

      {/* legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-5 border-t-2 border-[#7c3aed]" /> mentor → mentee
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-5 border-t-2 border-dashed border-[#b45309]" /> reviewer → member
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full bg-accent" /> open assignment
        </span>
        <span className="ml-auto font-mono text-[10px] font-medium normal-case">
          hover to trace · click a member to assign
        </span>
      </div>
    </div>
  );
}
