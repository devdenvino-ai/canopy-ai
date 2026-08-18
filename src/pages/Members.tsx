import { useMemo, useState } from "react";
import { ArrowUpDown, Search, SearchX } from "lucide-react";
import { deptOf, personById, personIssues, tribeOf } from "../lib/scoring";
import { useStore, useUI } from "../lib/store";
import { cn } from "../lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Seg,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui";
import { LevelBadge, RelationChip, SkillRow, StatusBadge } from "../components/bits";
import { DeptGraph } from "../components/DeptGraph";

type SortKey = "name" | "level";

export function MembersPage() {
  const { state } = useStore();
  const { openPerson } = useUI();
  const [q, setQ] = useState("");
  const [deptId, setDeptId] = useState<string>("all");
  const [tribeId, setTibeId] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "gaps" | "covered">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [view, setView] = useState<"table" | "graph">("table");
  const [graphDept, setGraphDept] = useState<string>("");

  const graphDeptObj = state.departments.find((d) => d.id === graphDept) ?? state.departments[0];
  const graphTribeCount = state.tribes.filter((t) => t.departmentId === graphDeptObj?.id).length;
  const graphPeopleCount = state.people.filter((p) => p.tribeId && state.tribes.some((t) => t.id === p.tribeId && t.departmentId === graphDeptObj?.id)).length;

  const tribeOptions = useMemo(
    () => state.tribes.filter((t) => deptId === "all" || t.departmentId === deptId),
    [state.tribes, deptId],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = state.people.slice();
    if (deptId !== "all") {
      const tribeIds = new Set(state.tribes.filter((t) => t.departmentId === deptId).map((t) => t.id));
      list = list.filter((p) => tribeIds.has(p.tribeId));
    }
    if (tribeId !== "all") list = list.filter((p) => p.tribeId === tribeId);
    if (status !== "all") {
      list = list.filter((p) => (status === "gaps" ? personIssues(p).length > 0 : personIssues(p).length === 0));
    }
    if (needle) {
      list = list.filter((p) => {
        const dept = deptOf(state, p);
        return [p.name, p.location, dept.name, tribeOf(state, p).name, ...p.skills].some((s) =>
          s.toLowerCase().includes(needle),
        );
      });
    }
    list.sort((a, b) => {
      if (sortKey === "level") return (a.level - b.level) * sortDir || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name) * sortDir;
    });
    return list;
  }, [state, q, deptId, tribeId, status, sortKey, sortDir]);

  const headerSort = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => {
        if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
        else {
          setSortKey(key);
          setSortDir(1);
        }
      }}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 uppercase tracking-wider transition-colors hover:text-foreground",
        sortKey === key && "text-primary",
      )}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === key && sortDir === -1 && "rotate-180")} />
    </button>
  );

  const clearFilters = () => {
    setQ("");
    setDeptId("all");
    setTibeId("all");
    setStatus("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          {view === "table"
            ? "Filterable directory of every member across tribes."
            : "Interactive node graph — hierarchy plus mentor and reviewer links. Hover to trace, click to assign."}
        </p>
        <Seg
          value={view}
          onChange={setView}
          options={[
            { value: "table", label: "Table" },
            { value: "graph", label: "Graph" },
          ]}
        />
      </div>
      <Card className="anim-fade-up overflow-hidden">
        {view === "table" ? (
          <>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3.5">
          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 transition-colors focus-within:border-ring">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search members…"
              className="w-40 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <Select
            value={deptId}
            onValueChange={(v) => {
              setDeptId(v);
              setTibeId("all");
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {state.departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tribeId} onValueChange={setTibeId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All tribes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tribes</SelectItem>
              {tribeOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Seg
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "gaps", label: "Needs attention" },
              { value: "covered", label: "Covered" },
            ]}
          />
          <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
            {rows.length} of {state.people.length} people
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">{headerSort("name", "Member")}</TableHead>
                <TableHead className="w-16">{headerSort("level", "Level")}</TableHead>
                <TableHead className="hidden w-28 md:table-cell">Location</TableHead>
                <TableHead className="hidden w-[240px] lg:table-cell">Skills</TableHead>
                <TableHead className="w-32">Mentor</TableHead>
                <TableHead className="w-32">Reviewer</TableHead>
                <TableHead className="hidden w-28 pr-4 text-right sm:table-cell">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p, i) => {
                const tribe = tribeOf(state, p);
                const dept = deptOf(state, p);
                const issues = personIssues(p);
                const delays = ["d1", "d2", "d3", "d4", "d5", "d6"];
                return (
                  <TableRow key={p.id} className={cn("anim-fade-up", delays[i % delays.length])}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.name} size="md" />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openPerson(p.id)}
                            title={p.name}
                            className="block max-w-[190px] cursor-pointer truncate text-left text-[13.5px] font-bold transition-colors hover:text-primary"
                          >
                            {p.name}
                          </button>
                          <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dept.color }} />
                            {tribe.name} · {dept.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <LevelBadge level={p.level} />
                    </TableCell>
                    <TableCell className="hidden text-xs font-medium text-muted-foreground md:table-cell">{p.location}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <SkillRow skills={p.skills} max={3} />
                    </TableCell>
                    <TableCell>
                      <RelationChip
                        assigned={personById(state, p.mentorId ?? null)}
                        role="mentor"
                        onClick={() => openPerson(p.id, "mentor")}
                      />
                    </TableCell>
                    <TableCell>
                      <RelationChip
                        assigned={personById(state, p.reviewerId ?? null)}
                        role="reviewer"
                        onClick={() => openPerson(p.id, "reviewer")}
                      />
                    </TableCell>
                    <TableCell className="hidden pr-4 text-right sm:table-cell">
                      <StatusBadge issues={issues} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary">
                        <SearchX className="h-5 w-5 text-muted-foreground" />
                      </span>
                      <p className="text-sm font-bold">No members match</p>
                      <p className="text-xs text-muted-foreground">Try a different search or clear the filters.</p>
                      <Button size="sm" variant="secondary" className="mt-1" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3.5">
              <Select value={graphDeptObj.id} onValueChange={setGraphDept}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Pick a department" />
                </SelectTrigger>
                <SelectContent>
                  {state.departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
                {graphTribeCount} tribes · {graphPeopleCount} people
              </span>
              <span className="ml-auto hidden items-center gap-1.5 text-[11px] font-semibold text-muted-foreground sm:flex">
                <span className="h-0 w-4 border-t-2 border-[#7c3aed]" /> mentor
                <span className="ml-2 h-0 w-4 border-t-2 border-dashed border-[#b45309]" /> reviewer
              </span>
            </div>
            <div className="p-4">
              <DeptGraph dept={graphDeptObj} />
            </div>
          </>
        )}
      </Card>

      <div className="flex items-center gap-2 px-1 text-[11.5px] text-muted-foreground">
        <Badge variant="neutral">L5</Badge>
        <span>members are considered self-sufficient — a mentor is optional for them.</span>
      </div>
    </div>
  );
}
