import { useEffect, useMemo, useRef, useState } from "react";
import { deptById, personById, personIssues, peopleInTribe } from "../lib/scoring";
import { useStore, useUI } from "../lib/store";
import type { Department, Person } from "../lib/types";
import { cn } from "../lib/utils";

/*
 * Vertical hierarchy graph with mentorship chains:
 *
 *        ┌ Department ┐
 *        Tribe   Tribe   Tribe
 *        Mentor1  …       …
 *         ↳ Mentor2
 *            ↳ Member
 *
 * Within a tribe column, a member sits beneath their mentor, indented and
 * joined by a chain connector — so chains read top-down as
 * Mentor 1 → Mentor 2 → Member. Mentors held outside the tribe are drawn
 * as curves; reviewer links are dashed amber curves.
 */

const PAD = 16;
const DEPT_W = 196;
const DEPT_H = 58;
const TRIBE_Y = 118;
const TRIBE_H = 42;
const MEMBER_Y0 = 196;
const ROW_H = 46;
const NODE_H = 40;
const NODE_W = 240;
const COL_GAP = 44;
const INDENT = 16;
const MAX_DEPTH = 3;

type MemberNode = { id: string; x: number; y: number; w: number; depth: number };
type TribeCol = { tribeId: string; name: string; colX: number; memberNodes: MemberNode[] };
type ChainEdge = { key: string; d: string; parentId: string; childId: string };

function truncateText(s: string, max: number) {
  return s.length > max ? s.slice(0, Math.max(1, max - 1)).trimEnd() + "…" : s;
}

export function DeptGraph({ dept }: { dept: Department }) {
  const { state } = useStore();
  const { openPerson } = useUI();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; person: Person } | null>(null);

  const mentorOf = (p: Person) => personById(state, p.mentorId ?? null);
  const reviewerOf = (p: Person) => personById(state, p.reviewerId ?? null);

  const layout = useMemo(() => {
    const tribes = state.tribes.filter((t) => t.departmentId === dept.id);
    const cols: TribeCol[] = tribes.map((t, ti) => {
      const ppl = peopleInTribe(state, t.id);
      const ids = new Set(ppl.map((p) => p.id));
      const children = new Map<string, Person[]>();
      ppl.forEach((p) => {
        if (p.mentorId && ids.has(p.mentorId)) {
          const arr = children.get(p.mentorId) ?? [];
          arr.push(p);
          children.set(p.mentorId, arr);
        }
      });
      const sortFn = (a: Person, b: Person) => b.level - a.level || a.name.localeCompare(b.name);
      const roots = ppl.filter((p) => !p.mentorId || !ids.has(p.mentorId)).sort(sortFn);
      const order: { id: string; depth: number }[] = [];
      const seen = new Set<string>();
      const visit = (p: Person, depth: number) => {
        if (seen.has(p.id)) return;
        seen.add(p.id);
        order.push({ id: p.id, depth: Math.min(depth, MAX_DEPTH) });
        (children.get(p.id) ?? []).sort(sortFn).forEach((c) => visit(c, depth + 1));
      };
      roots.forEach((r) => visit(r, 0));
      ppl.forEach((p) => {
        if (!seen.has(p.id)) order.push({ id: p.id, depth: 0 });
      });

      const colX = PAD + ti * (NODE_W + COL_GAP);
      const memberNodes = order.map((o, i) => {
        const d = Math.min(o.depth, MAX_DEPTH);
        return { id: o.id, x: colX + d * INDENT, y: MEMBER_Y0 + i * ROW_H, w: NODE_W - d * INDENT, depth: d };
      });
      return { tribeId: t.id, name: t.name, colX, memberNodes };
    });

    const maxRows = Math.max(0, ...cols.map((c) => c.memberNodes.length));
    const H = MEMBER_Y0 + maxRows * ROW_H + 26;
    const W = Math.max(PAD * 2 + DEPT_W, PAD * 2 + cols.length * (NODE_W + COL_GAP) - COL_GAP);

    const memberNodes = cols.flatMap((c) => c.memberNodes);
    const nodeById = new Map(memberNodes.map((n) => [n.id, n]));
    const tribeX = (i: number, n: number) => PAD + (i * (W - PAD * 2 - (NODE_W - 24))) / Math.max(1, n - 1);
    const tribeNodes = cols.map((c, i) => ({ id: c.tribeId, name: c.name, x: tribeX(i, cols.length), y: TRIBE_Y }));
    const deptX = (W - DEPT_W) / 2;
    const deptY = 22;

    const byName = (a: MemberNode, b: MemberNode) => {
      const pa = personById(state, a.id);
      const pb = personById(state, b.id);
      return (pa?.name ?? "").localeCompare(pb?.name ?? "");
    };

    return { cols, tribeNodes, memberNodes, nodeById, deptX, deptY, W, H, byName };
  }, [state, dept.id]);

  const { W, H, nodeById } = layout;

  /* hover context: ancestors up the chain + direct mentees/reviewees */
  const hoverUp = useMemo(() => {
    const s = new Set<string>();
    if (!hoverId) return s;
    let cur = personById(state, hoverId);
    while (cur?.mentorId) {
      s.add(cur.mentorId);
      cur = personById(state, cur.mentorId);
    }
    return s;
  }, [hoverId, state]);

  const related = useMemo(() => {
    if (!hoverId) return null;
    const s = new Set<string>([hoverId, ...hoverUp]);
    state.people.forEach((p) => {
      if (p.mentorId === hoverId || p.reviewerId === hoverId) s.add(p.id);
    });
    const m = personById(state, hoverId)?.mentorId;
    const r = personById(state, hoverId)?.reviewerId;
    if (m) s.add(m);
    if (r) s.add(r);
    return s;
  }, [hoverId, hoverUp, state]);

  /* chain connectors inside tribe columns (mentor → mentee) */
  const chainEdges = useMemo(() => {
    const edges: ChainEdge[] = [];
    layout.cols.forEach((c) => {
      c.memberNodes.forEach((n) => {
        if (n.depth === 0) return;
        const p = personById(state, n.id);
        const parent = p ? nodeById.get(p.mentorId ?? "") : undefined;
        if (!p || !parent) return;
        const x1 = parent.x + parent.w / 2;
        const y1 = parent.y + NODE_H;
        const x2 = n.x + 20;
        const y2 = n.y - 1;
        edges.push({
          key: `${n.id}-chain`,
          d: `M ${x1} ${y1} C ${x1} ${y1 + 12}, ${x2} ${y2 - 12}, ${x2} ${y2}`,
          parentId: p.mentorId ?? "",
          childId: n.id,
        });
      });
    });
    return edges;
  }, [layout, state, nodeById]);

  /* cross-tribe mentor curves + all reviewer curves */
  const memberLinks = useMemo(() => {
    const rows: { key: string; d: string; kind: "mentor" | "reviewer"; from: string; to: string }[] = [];
    layout.memberNodes.forEach((n) => {
      const p = personById(state, n.id);
      if (!p) return;
      const m = mentorOf(p);
      const r = reviewerOf(p);
      const mNode = m ? nodeById.get(m.id) : undefined;
      const rNode = r ? nodeById.get(r.id) : undefined;
      if (m && mNode && m.tribeId !== p.tribeId)
        rows.push({ key: `${p.id}-m`, d: curve(n, mNode, "mentor"), kind: "mentor", from: p.id, to: m.id });
      if (r && rNode)
        rows.push({ key: `${p.id}-r`, d: curve(n, rNode, "reviewer"), kind: "reviewer", from: p.id, to: r.id });
    });
    return rows;

    function curve(n: MemberNode, t: MemberNode, kind: "mentor" | "reviewer") {
      const x1 = n.x;
      const y1 = n.y + (kind === "mentor" ? 14 : 27);
      const x2 = t.x;
      const y2 = t.y + (kind === "mentor" ? 14 : 27);
      const left = Math.min(x1, x2);
      const off = kind === "mentor" ? 26 : 12;
      const cx = Math.max(PAD - 6, left - off - (y2 - y1 === 0 ? 8 : 0));
      return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    }
  }, [layout, state, nodeById]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (e: React.MouseEvent, person: Person) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const flip = e.clientX - box.left > box.width * 0.6;
    setTip({
      x: Math.min(e.clientX - box.left + (flip ? -16 : 16), Math.max(8, box.width - 252)),
      y: Math.min(Math.max(8, e.clientY - box.top + 14), Math.max(8, box.height - 130)),
      person,
    });
  };

  const showTip = (e: React.MouseEvent, id: string) => {
    const p = personById(state, id);
    setHoverId(id);
    if (p) onMove(e, p);
  };
  const hideTip = () => {
    setHoverId(null);
    setTip(null);
  };

  const deptLead = personById(state, dept.leadId);
  const tipMentor = tip ? mentorOf(tip.person) : undefined;
  const tipMentor1 = tipMentor ? mentorOf(tipMentor) : undefined;
  const tipReviewer = tip ? reviewerOf(tip.person) : undefined;

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ minHeight: 300 }}>
        {/* dept → tribe edges */}
        {layout.tribeNodes.map((t, i) => (
          <path
            key={`dt-${t.id}`}
            d={`M ${layout.deptX + DEPT_W / 2} ${layout.deptY + DEPT_H} C ${layout.deptX + DEPT_W / 2} ${TRIBE_Y - 18}, ${t.x + (NODE_W - 24) / 2} ${TRIBE_Y - 18}, ${t.x + (NODE_W - 24) / 2} ${TRIBE_Y}`}
            fill="none"
            stroke="#ddd8e8"
            strokeWidth={1.5}
            strokeDasharray="1 0"
            pathLength={1}
            className="anim-draw-line"
            style={{ animationDelay: `${i * 0.05}s` }}
          />
        ))}

        {/* tribe bands + tribe → chain-root edges */}
        {layout.cols.map((c) => {
          const count = c.memberNodes.length;
          const bandH = Math.max(ROW_H, count * ROW_H + 6);
          const roots = c.memberNodes.filter((n) => n.depth === 0);
          return (
            <g key={`band-${c.tribeId}`}>
              <rect x={c.colX - 10} y={MEMBER_Y0 - 14} width={NODE_W + 20} height={bandH} rx={14} fill="#7c3aed" opacity={0.045} />
              {roots.map((r, ri) => (
                <path
                  key={`tm-${c.tribeId}-${r.id}`}
                  d={`M ${layout.tribeNodes.find((t) => t.id === c.tribeId)!.x + (NODE_W - 24) / 2} ${TRIBE_Y + TRIBE_H} C ${layout.tribeNodes.find((t) => t.id === c.tribeId)!.x + (NODE_W - 24) / 2} ${MEMBER_Y0 - 22}, ${r.x + r.w / 2} ${r.y - 20}, ${r.x + r.w / 2} ${r.y}`}
                  fill="none"
                  stroke="#ddd8e8"
                  strokeWidth={1.5}
                  pathLength={1}
                  className="anim-draw-line"
                  style={{ animationDelay: `${0.1 + ri * 0.03}s` }}
                />
              ))}
            </g>
          );
        })}

        {/* mentorship chain connectors */}
        {chainEdges.map((e, i) => {
          const active = related !== null && (hoverUp.has(e.childId) || e.parentId === hoverId);
          const dim = related !== null && !active;
          return (
            <path
              key={e.key}
              d={e.d}
              fill="none"
              stroke={active ? "#7c3aed" : "#a78bfa"}
              strokeWidth={active ? 2.2 : 1.4}
              opacity={dim ? 0.12 : active ? 1 : 0.6}
              pathLength={1}
              className="anim-draw-line"
              style={{ animationDelay: `${0.2 + i * 0.02}s`, transition: "opacity .18s, stroke-width .18s" }}
            />
          );
        })}

        {/* reviewer (dashed amber) + cross-tribe mentor curves */}
        {memberLinks.map((l) => {
          const active = related !== null && (l.from === hoverId || l.to === hoverId);
          const dim = related !== null && !active;
          return (
            <path
              key={l.key}
              d={l.d}
              fill="none"
              stroke={l.kind === "mentor" ? "#7c3aed" : "#b45309"}
              strokeWidth={active ? 2.4 : 1.7}
              strokeDasharray={l.kind === "mentor" ? undefined : "5 5"}
              opacity={dim ? 0.12 : active ? 1 : 0.7}
              pathLength={1}
              className="anim-draw-line"
              style={{ animationDelay: "0.3s", transition: "opacity .18s, stroke-width .18s" }}
            />
          );
        })}

        {/* department node */}
        <g
          className="anim-node-in cursor-default"
          onMouseLeave={hideTip}
        >
          <rect x={layout.deptX} y={layout.deptY} width={DEPT_W} height={DEPT_H} rx={12} fill="#191227" />
          <text x={layout.deptX + 16} y={layout.deptY + 25} fontSize={13} fontWeight={700} fill="#f3eefc" fontFamily="Bricolage Grotesque, sans-serif">
            {truncateText(dept.name, 22)}
          </text>
          <text x={layout.deptX + 16} y={layout.deptY + 43} fontSize={10} fill="#9d94bd" fontFamily="JetBrains Mono, monospace">
            {layout.cols.length} tribes · lead {deptLead ? truncateText(deptLead.name.split(" ")[0], 12) : "—"}
          </text>
        </g>

        {/* tribe nodes */}
        {layout.tribeNodes.map((t, i) => (
          <g key={t.id} className="anim-node-in cursor-default" style={{ animationDelay: `${0.06 + i * 0.04}s` }}>
            <rect x={t.x} y={t.y} width={NODE_W - 24} height={TRIBE_H} rx={10} fill="#ece9f3" stroke="#ddd8e8" />
            <text x={t.x + 14} y={t.y + 18} fontSize={11.5} fontWeight={700} fill="#201a2e">
              {truncateText(t.name, 18)}
            </text>
            <text x={t.x + 14} y={t.y + 33} fontSize={9.5} fill="#6a6480" fontFamily="JetBrains Mono, monospace">
              {layout.cols.find((c) => c.tribeId === t.id)?.memberNodes.length ?? 0} members
            </text>
          </g>
        ))}

        {/* member nodes */}
        {layout.memberNodes.map((n, i) => {
          const p = personById(state, n.id);
          if (!p) return null;
          const issues = personIssues(p);
          const m = mentorOf(p);
          const r = reviewerOf(p);
          const dim = related !== null && !related.has(n.id);
          const isRoot = n.depth === 0;
          return (
            <g
              key={n.id}
              className="anim-node-in cursor-pointer"
              style={{ animationDelay: `${0.12 + i * 0.018}s`, opacity: dim ? 0.25 : 1, transition: "opacity .18s" }}
              onMouseMove={(e) => showTip(e, n.id)}
              onMouseLeave={hideTip}
              onClick={() => openPerson(n.id)}
            >
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={NODE_H}
                rx={9}
                fill={hoverId === n.id ? "#f3eefc" : "#fcfbfe"}
                stroke={hoverId === n.id ? "#7c3aed" : isRoot ? "#cbbcf0" : "#ddd8e8"}
                strokeWidth={isRoot ? 1.4 : 1}
              />
              <rect
                x={n.x}
                y={n.y}
                width={4}
                height={NODE_H}
                rx={2}
                fill={issues.length ? "#b45309" : isRoot ? "#7c3aed" : "#a78bfa"}
                opacity={issues.length ? 1 : 0.75}
              />
              <circle cx={n.x + 22} cy={n.y + NODE_H / 2} r={9} fill={issues.length ? "#f7e8d4" : "#ece4fa"} />
              <text x={n.x + 22} y={n.y + NODE_H / 2 + 3} fontSize={8} fontWeight={800} textAnchor="middle" fill={issues.length ? "#b45309" : "#5b21b6"}>
                L{p.level}
              </text>
              <text x={n.x + 38} y={n.y + 17} fontSize={11} fontWeight={700} fill="#201a2e">
                {truncateText(p.name, Math.max(10, Math.floor((n.w - 78) / 6.1)))}
              </text>
              <text x={n.x + 38} y={n.y + 31} fontSize={9} fill="#6a6480" fontFamily="JetBrains Mono, monospace">
                {n.depth > 0 && m ? truncateText(`↳ via ${m.name.split(" ")[0]}`, 24) : truncateText(p.location, 20)}
              </text>
              <g transform={`translate(${n.x + n.w - 44}, 0)`}>
                {m && (
                  <>
                    <rect x={0} y={n.y + 8} width={15} height={13} rx={4} fill="#ece4fa" />
                    <text x={7.5} y={n.y + 18} fontSize={8} fontWeight={800} fill="#5b21b6" textAnchor="middle">
                      M
                    </text>
                  </>
                )}
                {r && (
                  <>
                    <rect x={19} y={n.y + 8} width={15} height={13} rx={4} fill="#f7e8d4" />
                    <text x={26.5} y={n.y + 18} fontSize={8} fontWeight={800} fill="#b45309" textAnchor="middle">
                      R
                    </text>
                  </>
                )}
              </g>
            </g>
          );
        })}
      </svg>

      {/* hover card */}
      {tip && (
        <div
          className="anim-pop-in pointer-events-none absolute z-10 w-60 rounded-lg border border-border bg-popover p-3 shadow-pop"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="truncate text-[13px] font-bold">{tip.person.name}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            L{tip.person.level} · {tip.person.location}
          </p>
          <div className="mt-2 space-y-1 border-t border-line pt-2 text-[11px]">
            <p className="truncate">
              {tipMentor ? (
                <>
                  <span className="font-bold text-primary">Mentor 2</span> · {tipMentor.name}
                </>
              ) : (
                <span className="font-semibold text-accent">No mentor yet</span>
              )}
            </p>
            {tipMentor && (
              <p className="truncate">
                {tipMentor1 ? (
                  <>
                    <span className="font-bold text-primary">Mentor 1</span> · {tipMentor1.name}
                  </>
                ) : (
                  <span className="text-muted-foreground">Mentor 1 · none — {tipMentor.name.split(" ")[0]} is a chain root</span>
                )}
              </p>
            )}
            <p className="truncate">
              {tipReviewer ? (
                <>
                  <span className="font-bold text-accent">Reviewer</span> · {tipReviewer.name}
                </>
              ) : (
                <span className="font-semibold text-accent">No reviewer yet</span>
              )}
            </p>
          </div>
          <p className="mt-2 text-[10px] font-semibold text-primary">Click to assign →</p>
        </div>
      )}

      <p className="mt-2 px-1 text-[11px] font-medium leading-relaxed text-muted-foreground">
        Chains read top-down — <b className="text-foreground">Mentor 1 → Mentor 2 → member</b>, indented under each
        mentor. Curves reaching left are mentors held in another tribe; dashed amber curves are reviewer links.
      </p>
    </div>
  );
}
