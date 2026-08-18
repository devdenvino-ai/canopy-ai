import { useMemo, useRef, useState } from "react";
import { GraduationCap, ShieldCheck } from "lucide-react";
import type { Person, Role } from "../lib/types";
import { useStore, useUI } from "../lib/store";
import { initials, toneFor } from "../lib/utils";
import { deptOf, loadOf, maxAssignsOf, personById, tribeOf } from "../lib/scoring";

const ell = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

interface TipState {
  x: number;
  y: number;
  person: Person;
  side: "holder" | "member";
}

/**
 * Bipartite relationship graph: role-holders on the left, members on the right,
 * curves between them. Click a member to (re)assign.
 */
export function RelationshipsGraph({ role, deptId }: { role: Role; deptId: string }) {
  const { state } = useStore();
  const { openPerson } = useUI();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ id: string; side: "holder" | "member" } | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  const dept = state.departments.find((d) => d.id === deptId) ?? state.departments[0];
  const deptTribeIds = useMemo(
    () => new Set(state.tribes.filter((t) => t.departmentId === dept.id).map((t) => t.id)),
    [state.tribes, dept.id],
  );

  const holders = useMemo(
    () =>
      state.people
        .filter((p) => deptTribeIds.has(p.tribeId))
        .filter((p) => (role === "mentor" ? p.isMentor : p.isReviewer))
        .sort((a, b) => loadOf(state, b.id, role) - loadOf(state, a.id, role) || a.name.localeCompare(b.name)),
    [state.people, deptTribeIds, role, state],
  );

  const members = useMemo(
    () =>
      state.people
        .filter((p) => deptTribeIds.has(p.tribeId))
        .sort((a, b) => {
          const av = role === "mentor" ? a.mentorId : a.reviewerId;
          const bv = role === "mentor" ? b.mentorId : b.reviewerId;
          return (av ? 1 : 0) - (bv ? 1 : 0) || b.level - a.level || a.name.localeCompare(b.name);
        }),
    [state.people, deptTribeIds, role],
  );

  const ROW = 46;
  const W = 700;
  const H = Math.max(300, Math.max(holders.length, members.length) * ROW + 48);
  const holderX = 8;
  const holderW = 226;
  const memberX = 452;
  const memberW = 240;
  const holderY = (i: number) => 24 + i * ROW;
  const memberY = (i: number) => 24 + i * ROW;

  const holderIndex = useMemo(() => new Map(holders.map((h, i) => [h.id, i])), [holders]);
  const memberIndex = useMemo(() => new Map(members.map((m, i) => [m.id, i])), [members]);

  const links = useMemo(() => {
    const rows: { key: string; d: string; holderId: string; memberId: string; external?: string }[] = [];
    members.forEach((m) => {
      const targetId = role === "mentor" ? m.mentorId : m.reviewerId;
      if (!targetId) return;
      const mi = memberIndex.get(m.id);
      if (mi === undefined) return;
      const my = memberY(mi) + 20;
      const hi = holderIndex.get(targetId);
      if (hi !== undefined) {
        const hy = holderY(hi) + 21;
        rows.push({
          key: `${m.id}-${role}`,
          d: `M ${holderX + holderW} ${hy} C ${holderX + holderW + 92} ${hy}, ${memberX - 92} ${my}, ${memberX} ${my}`,
          holderId: targetId,
          memberId: m.id,
        });
      } else {
        const external = personById(state, targetId);
        rows.push({
          key: `${m.id}-${role}-ext`,
          d: `M ${memberX - 26} ${my} L ${memberX - 4} ${my}`,
          holderId: targetId,
          memberId: m.id,
          external: external ? `${external.name} · ${deptOf(state, external).name}` : "other department",
        });
      }
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, holderIndex, memberIndex, role, state]);

  const onMove = (e: React.MouseEvent, person: Person, side: "holder" | "member") => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      x: Math.min(Math.max(8, e.clientX - rect.left + 14), W - 236),
      y: Math.min(Math.max(8, e.clientY - rect.top + 12), H - 110),
      person,
      side,
    });
    setHover({ id: person.id, side });
  };
  const clear = () => {
    setTip(null);
    setHover(null);
  };

  const linkOn = (l: (typeof links)[number]) => {
    if (!hover) return true;
    return hover.side === "holder" ? l.holderId === hover.id : l.memberId === hover.id;
  };
  const nodeOn = (id: string, side: "holder" | "member") => {
    if (!hover) return true;
    if (hover.side === side) return hover.id === id;
    if (hover.side === "holder") return links.some((l) => l.holderId === hover.id && l.memberId === id);
    return links.some((l) => l.memberId === hover.id && l.holderId === id);
  };

  const stroke = role === "mentor" ? "#5b21b6" : "#b45309";

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ minHeight: 280 }}>
        {/* column captions */}
        <text x={holderX + 4} y={14} fontSize={9.5} fontWeight={800} fill="#6a6480" fontFamily="JetBrains Mono, monospace" letterSpacing={1.2}>
          {role === "mentor" ? "MENTORS" : "REVIEWERS"} · {holders.length}
        </text>
        <text x={memberX + 4} y={14} fontSize={9.5} fontWeight={800} fill="#6a6480" fontFamily="JetBrains Mono, monospace" letterSpacing={1.2}>
          MEMBERS · {members.length}
        </text>

        {/* links */}
        {links.map((l) => {
          const on = linkOn(l);
          return (
            <path
              key={l.key}
              d={l.d}
              fill="none"
              stroke={l.external ? "#9d94bd" : stroke}
              strokeWidth={hover && on ? 2.3 : 1.6}
              strokeDasharray={l.external ? "2 4" : role === "reviewer" ? "5 4" : undefined}
              opacity={on ? (l.external ? 0.55 : 0.8) : 0.08}
              style={{ transition: "opacity 0.2s ease, stroke-width 0.2s ease" }}
            />
          );
        })}

        {/* holders */}
        {holders.map((h, i) => {
          const y = holderY(i);
          const load = loadOf(state, h.id, role);
          const cap = maxAssignsOf(state, h, role);
          const tone = toneFor(h.name);
          const on = nodeOn(h.id, "holder");
          return (
            <g
              key={h.id}
              className="anim-node-in"
              style={{ animationDelay: `${i * 40}ms`, opacity: on ? 1 : 0.25, transition: "opacity 0.2s ease" }}
              onMouseMove={(e) => onMove(e, h, "holder")}
              onMouseLeave={clear}
            >
              <rect x={holderX} y={y} width={holderW} height={42} rx={10} fill="#fcfbfe" stroke={hover?.id === h.id ? "#7c3aed" : "#ddd8e8"} strokeWidth={hover?.id === h.id ? 1.5 : 1} />
              <rect x={holderX} y={y + 6} width={4} height={30} rx={2} fill={load >= cap ? "#b23a48" : load > 0 ? "#5b21b6" : "#cbc3dd"} />
              <circle cx={holderX + 24} cy={y + 21} r={11} fill={tone.bg} />
              <text x={holderX + 24} y={y + 24.5} fontSize={8.5} fontWeight={800} fill={tone.fg} textAnchor="middle">
                {initials(h.name)}
              </text>
              <text x={holderX + 42} y={y + 18} fontSize={11} fontWeight={700} fill="#201a2e">
                {ell(h.name, 19)}
              </text>
              <text x={holderX + 42} y={y + 32} fontSize={9} fill="#6a6480" fontFamily="JetBrains Mono, monospace">
                L{h.level} · {ell(tribeOf(state, h).name, 12)}
              </text>
              <text x={holderX + holderW - 10} y={y + 25} fontSize={10} fontWeight={800} fill={load >= cap ? "#b23a48" : "#5b21b6"} textAnchor="end" fontFamily="JetBrains Mono, monospace">
                {load}/{cap}
              </text>
            </g>
          );
        })}

        {/* members */}
        {members.map((m, i) => {
          const y = memberY(i);
          const hasLink = !!(role === "mentor" ? m.mentorId : m.reviewerId);
          const tone = toneFor(m.name);
          const on = nodeOn(m.id, "member");
          return (
            <g
              key={m.id}
              className="anim-node-in cursor-pointer"
              style={{ animationDelay: `${80 + Math.min(i, 16) * 30}ms`, opacity: on ? 1 : 0.25, transition: "opacity 0.2s ease" }}
              onMouseMove={(e) => onMove(e, m, "member")}
              onMouseLeave={clear}
              onClick={() => openPerson(m.id, role)}
            >
              <rect x={memberX} y={y} width={memberW} height={40} rx={10} fill={hover?.id === m.id ? "#f3eefc" : "#fcfbfe"} stroke={hover?.id === m.id ? "#7c3aed" : "#ddd8e8"} strokeWidth={hover?.id === m.id ? 1.5 : 1} style={{ transition: "fill 0.15s ease, stroke 0.15s ease" }} />
              {!hasLink && <circle cx={memberX + 10} cy={y + 20} r={3.5} fill="#b45309" className="anim-sparkle" style={{ transformOrigin: `${memberX + 10}px ${y + 20}px` }} />}
              <circle cx={memberX + 26} cy={y + 20} r={10.5} fill={tone.bg} />
              <text x={memberX + 26} y={y + 23.5} fontSize={8} fontWeight={800} fill={tone.fg} textAnchor="middle">
                {initials(m.name)}
              </text>
              <text x={memberX + 44} y={y + 17} fontSize={11} fontWeight={700} fill="#201a2e">
                {ell(m.name, 20)}
              </text>
              <text x={memberX + 44} y={y + 31} fontSize={9} fill="#6a6480" fontFamily="JetBrains Mono, monospace">
                L{m.level} · {hasLink ? (role === "mentor" ? "mentored" : "reviewed") : role === "mentor" ? "needs mentor" : "needs reviewer"}
              </text>
              <rect x={memberX + memberW - 30} y={y + 12} width={20} height={16} rx={4} fill="#ece4fa" />
              <text x={memberX + memberW - 20} y={y + 23.5} fontSize={8} fontWeight={800} fill="#5b21b6" textAnchor="middle">
                L{m.level}
              </text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {role === "mentor" ? <GraduationCap className="h-3.5 w-3.5 text-primary" /> : <ShieldCheck className="h-3.5 w-3.5 text-accent" />}
          <span className="inline-block h-0 w-5 border-t-2" style={{ borderColor: stroke }} />
          {role === "mentor" ? "mentor → mentee" : "reviewer → member"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2 border-dotted border-[#9d94bd]" /> held outside this department
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" /> open — click to assign
        </span>
      </div>

      {/* tooltip */}
      {(() => {
        if (!tip) return null;
        const t = toneFor(tip.person.name);
        const otherId = tip.side === "member" ? (role === "mentor" ? tip.person.mentorId : tip.person.reviewerId) : null;
        const other = personById(state, otherId ?? null);
        const load = tip.side === "holder" ? loadOf(state, tip.person.id, role) : null;
        const cap = tip.side === "holder" ? maxAssignsOf(state, tip.person, role) : null;
        return (
          <div className="anim-pop-in pointer-events-none absolute z-20 w-[228px] rounded-lg border border-border bg-popover p-3 shadow-pop" style={{ left: tip.x, top: tip.y }}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ backgroundColor: t.bg, color: t.fg }}>
                {initials(tip.person.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold" title={tip.person.name}>
                  {tip.person.name}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  L{tip.person.level} · {tribeOf(state, tip.person).name}
                </p>
              </div>
            </div>
            <p className="mt-2 truncate text-[11px] text-muted-foreground">
              {tip.side === "holder" ? (
                <>
                  Carrying <b className="text-foreground">{load}/{cap}</b> {role === "mentor" ? "mentees" : "reviews"} · {deptOf(state, tip.person).name}
                </>
              ) : other ? (
                <>
                  {role === "mentor" ? "Mentor" : "Reviewer"} · <b className="text-foreground">{other.name}</b>
                </>
              ) : (
                <b className="text-accent">Click to assign a {role}</b>
              )}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
