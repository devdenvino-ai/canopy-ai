import { useMemo, useState } from "react";
import { personById, personIssues, peopleInTribe } from "../lib/scoring";
import { useStore, useUI } from "../lib/store";
import type { Department, Person } from "../lib/types";
import { cn, initials, toneFor } from "../lib/utils";

const DEPT_X = 18;
const TRIB_X = 252;
const MEM_X = 474;
const NODE_W = 196;
const NODE_H = 46;
const ROW_H = 58;
const PAD = 22;

interface NodePos {
  x: number;
  y: number;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function DeptGraph({ dept }: { dept: Department }) {
  const { state } = useStore();
  const { openPerson } = useUI();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const layout = useMemo(() => {
    const tribes = state.tribes.filter((t) => t.departmentId === dept.id);
    const pos = new Map<string, NodePos>();
    const tribePos = new Map<string, NodePos>();
    const tribeSizes = new Map<string, number>();
    let y = PAD;
    const rows: { tribeId: string; person: Person; y: number }[] = [];

    for (const t of tribes) {
      const members = peopleInTribe(state, t.id).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
      tribeSizes.set(t.id, members.length);
      if (members.length === 0) {
        tribePos.set(t.id, { x: TRIB_X, y: y + NODE_H / 2 });
        y += ROW_H;
        continue;
      }
      const startY = y;
      for (const m of members) {
        pos.set(m.id, { x: MEM_X, y });
        rows.push({ tribeId: t.id, person: m, y });
        y += ROW_H;
      }
      tribePos.set(t.id, { x: TRIB_X, y: (startY + y - ROW_H) / 2 + NODE_H / 2 });
    }

    const height = Math.max(y + PAD, 260);
    const deptY = height / 2 - NODE_H / 2;
    return { tribes, pos, tribePos, tribeSizes, rows, height, deptY, width: MEM_X + NODE_W + 132 };
  }, [state, dept.id]);

  const hoverPerson = hoverId ? personById(state, hoverId) : undefined;
  const related = useMemo(() => {
    if (!hoverPerson) return null;
    const set = new Set<string>([hoverPerson.id]);
    if (hoverPerson.mentorId) set.add(hoverPerson.mentorId);
    if (hoverPerson.reviewerId) set.add(hoverPerson.reviewerId);
    for (const p of state.people) {
      if (p.mentorId === hoverPerson.id || p.reviewerId === hoverPerson.id) set.add(p.id);
    }
    return set;
  }, [hoverPerson, state.people]);

  const dimmed = (id: string) => related !== null && !related.has(id);

  const mentorEdges = layout.rows
    .filter((r) => r.person.mentorId && layout.pos.has(r.person.mentorId))
    .map((r) => ({ from: layout.pos.get(r.person.mentorId!)!, to: layout.pos.get(r.person.id)!, id: `m-${r.person.id}` }));
  const reviewerEdges = layout.rows
    .filter((r) => r.person.reviewerId && layout.pos.has(r.person.reviewerId))
    .map((r) => ({ from: layout.pos.get(r.person.reviewerId!)!, to: layout.pos.get(r.person.id)!, id: `r-${r.person.id}` }));

  const edgeActive = (personId: string) =>
    related !== null && (related.has(personId) || personId === hoverId);

  const bulgePath = (a: NodePos, b: NodePos, bulge: number) => {
    const x = MEM_X + NODE_W;
    const y1 = a.y + NODE_H / 2;
    const y2 = b.y + NODE_H / 2;
    return `M ${x} ${y1} C ${x + bulge} ${y1}, ${x + bulge} ${y2}, ${x + 6} ${y2}`;
  };

  return (
    <div className="relative">
      {/* legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-border" /> hierarchy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-primary" /> mentor → mentee
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-5 border-t-2 border-dashed border-accent" /> reviewer → member
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 rounded-full bg-accent" /> needs attention
        </span>
        <span className="ml-auto hidden font-mono text-[10px] text-muted-foreground/70 sm:block">
          click a member to assign
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-card/60">
        <div className="relative min-w-fit" style={{ height: layout.height }}>
          <svg width={layout.width} height={layout.height} className="block">
            {/* hierarchy edges */}
            {layout.tribes.map((t) => {
              const tp = layout.tribePos.get(t.id)!;
              return (
                <path
                  key={`h-${t.id}`}
                  d={`M ${DEPT_X + 148} ${layout.deptY + NODE_H / 2} C ${DEPT_X + 190} ${layout.deptY + NODE_H / 2}, ${TRIB_X - 44} ${tp.y}, ${TRIB_X - 4} ${tp.y}`}
                  stroke="#ddd8e8"
                  strokeWidth={1.5}
                  fill="none"
                />
              );
            })}
            {layout.rows.map((r) => {
              const tp = layout.tribePos.get(r.tribeId)!;
              return (
                <path
                  key={`t-${r.person.id}`}
                  d={`M ${TRIB_X + NODE_W - 24} ${tp.y} C ${TRIB_X + NODE_W + 16} ${tp.y}, ${MEM_X - 40} ${r.y + NODE_H / 2}, ${MEM_X - 4} ${r.y + NODE_H / 2}`}
                  stroke="#ddd8e8"
                  strokeWidth={1.2}
                  fill="none"
                />
              );
            })}

            {/* reviewer edges (dashed, behind) */}
            {reviewerEdges.map((e, i) => (
              <path
                key={e.id}
                d={bulgePath(e.from, e.to, 86)}
                stroke="#b45309"
                strokeWidth={edgeActive(e.id.slice(2)) || !related ? 1.6 : 1.2}
                strokeDasharray="5 4"
                fill="none"
                pathLength={1}
                className="anim-draw-line"
                style={{ animationDelay: `${0.3 + i * 0.03}s`, opacity: related && !edgeActive(e.id.slice(2)) ? 0.15 : 0.75 }}
              />
            ))}
            {/* mentor edges */}
            {mentorEdges.map((e, i) => (
              <path
                key={e.id}
                d={bulgePath(e.from, e.to, 48)}
                stroke="#7c3aed"
                strokeWidth={edgeActive(e.id.slice(2)) || !related ? 2 : 1.4}
                fill="none"
                pathLength={1}
                className="anim-draw-line"
                style={{ animationDelay: `${0.2 + i * 0.03}s`, opacity: related && !edgeActive(e.id.slice(2)) ? 0.15 : 0.9 }}
              />
            ))}

            {/* department node */}
            <g className="anim-node-in">
              <rect x={DEPT_X} y={layout.deptY} width={148} height={NODE_H + 8} rx={12} fill="#191227" />
              <rect x={DEPT_X} y={layout.deptY} width={5} height={NODE_H + 8} rx={2.5} fill={dept.color} />
              <text x={DEPT_X + 16} y={layout.deptY + 24} fontSize={12.5} fontWeight={700} fill="#f3eefc" fontFamily="Bricolage Grotesque, sans-serif">
                {truncate(dept.name, 15)}
              </text>
              <text x={DEPT_X + 16} y={layout.deptY + 41} fontSize={10} fill="#9d94bd" fontFamily="JetBrains Mono, monospace">
                {layout.tribes.length} tribes · {layout.rows.length} people
              </text>
            </g>

            {/* tribe nodes */}
            {layout.tribes.map((t, i) => {
              const tp = layout.tribePos.get(t.id)!;
              const lead = personById(state, t.leadId);
              return (
                <g key={t.id} className="anim-node-in" style={{ animationDelay: `${0.08 + i * 0.05}s` }}>
                  <rect x={TRIB_X} y={tp.y - NODE_H / 2} width={NODE_W - 24} height={NODE_H} rx={10} fill="#ece9f3" stroke="#ddd8e8" />
                  <circle cx={TRIB_X + 17} cy={tp.y} r={9} fill={dept.color} opacity={0.16} />
                  <circle cx={TRIB_X + 17} cy={tp.y} r={3.2} fill={dept.color} />
                  <text x={TRIB_X + 33} y={tp.y - 2} fontSize={11.5} fontWeight={700} fill="#201a2e">
                    {truncate(t.name, 16)}
                  </text>
                  <text x={TRIB_X + 33} y={tp.y + 13} fontSize={9.5} fill="#6a6480" fontFamily="JetBrains Mono, monospace">
                    {layout.tribeSizes.get(t.id)} members{lead ? ` · lead ${lead.name.split(" ")[0]}` : ""}
                  </text>
                </g>
              );
            })}

            {/* member nodes */}
            {layout.rows.map((r, i) => {
              const p = r.person;
              const issues = personIssues(p);
              const tone = toneFor(p.name);
              const isDim = dimmed(p.id);
              return (
                <g
                  key={p.id}
                  className="anim-node-in cursor-pointer"
                  style={{ animationDelay: `${0.12 + i * 0.025}s`, opacity: isDim ? 0.28 : 1, transition: "opacity 0.2s" }}
                  onMouseEnter={() => setHoverId(p.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => openPerson(p.id, issues.includes("mentor") ? "mentor" : "reviewer")}
                >
                  <rect
                    x={MEM_X}
                    y={r.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    fill={hoverId === p.id ? "#f3eefc" : "#fcfbfe"}
                    stroke={hoverId === p.id ? "#7c3aed" : "#ddd8e8"}
                    strokeWidth={hoverId === p.id ? 1.5 : 1}
                  />
                  <rect x={MEM_X} y={r.y} width={4} height={NODE_H} rx={2} fill={issues.length ? "#b45309" : "#5b21b6"} opacity={issues.length ? 1 : 0.5} />
                  <circle cx={MEM_X + 24} cy={r.y + NODE_H / 2} r={11} fill={tone.bg} />
                  <text x={MEM_X + 24} y={r.y + NODE_H / 2 + 3} fontSize={8} fontWeight={700} fill={tone.fg} textAnchor="middle">
                    {initials(p.name)}
                  </text>
                  <text x={MEM_X + 42} y={r.y + 19} fontSize={11} fontWeight={700} fill="#201a2e">
                    {truncate(p.name, 17)}
                  </text>
                  <text x={MEM_X + 42} y={r.y + 34} fontSize={9} fill="#6a6480" fontFamily="JetBrains Mono, monospace">
                    L{p.level} · {truncate(p.location, 12)}
                  </text>
                  {(p.isMentor || p.isReviewer) && (
                    <g>
                      {p.isMentor && (
                        <>
                          <rect x={MEM_X + NODE_W - 40} y={r.y + 8} width={14} height={13} rx={4} fill="#ece4fa" />
                          <text x={MEM_X + NODE_W - 33} y={r.y + 18} fontSize={8} fontWeight={800} fill="#5b21b6" textAnchor="middle">
                            M
                          </text>
                        </>
                      )}
                      {p.isReviewer && (
                        <>
                          <rect x={MEM_X + NODE_W - 22} y={r.y + 8} width={14} height={13} rx={4} fill="#f7e8d4" />
                          <text x={MEM_X + NODE_W - 15} y={r.y + 18} fontSize={8} fontWeight={800} fill="#b45309" textAnchor="middle">
                            R
                          </text>
                        </>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* hover tooltip */}
          {hoverPerson && layout.pos.has(hoverPerson.id) && (
            <div
              className="anim-pop-in pointer-events-none absolute z-20 w-56 rounded-lg border border-border bg-popover p-3 shadow-pop"
              style={
                layout.pos.get(hoverPerson.id)!.y < 110
                  ? { left: layout.pos.get(hoverPerson.id)!.x, top: layout.pos.get(hoverPerson.id)!.y + NODE_H + 8 }
                  : {
                      left: layout.pos.get(hoverPerson.id)!.x,
                      top: layout.pos.get(hoverPerson.id)!.y - 8,
                      transform: "translateY(-100%)",
                    }
              }
            >
              <p className="text-[13px] font-bold">{hoverPerson.name}</p>
              <p className="font-mono text-[10.5px] text-muted-foreground">
                L{hoverPerson.level} · {hoverPerson.location} · {hoverPerson.skills.slice(0, 3).join(", ")}
              </p>
              <div className="mt-1.5 space-y-0.5 text-[11px]">
                <p className={cn("font-semibold", hoverPerson.mentorId ? "text-primary" : "text-accent")}>
                  Mentor: {hoverPerson.mentorId ? personById(state, hoverPerson.mentorId)?.name : "unassigned"}
                </p>
                <p className={cn("font-semibold", hoverPerson.reviewerId ? "text-primary" : "text-accent")}>
                  Reviewer: {hoverPerson.reviewerId ? personById(state, hoverPerson.reviewerId)?.name : "unassigned"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
