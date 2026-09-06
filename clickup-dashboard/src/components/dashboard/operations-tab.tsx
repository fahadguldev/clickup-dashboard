"use client";

import { useState, useMemo } from "react";
import { Task, Filters } from "@/lib/types";
import { formatDate } from "@/lib/compute";

interface OperationsTabProps {
  tasks: Task[];
}

export function OperationsTab({ tasks }: OperationsTabProps) {
  const [filters, setFilters] = useState<Filters>({ space: "", project: "", member: "", status: "", q: "" });

  const spaces = useMemo(() => Array.from(new Set(tasks.map(t => t.space?.name).filter(Boolean))).sort(), [tasks]);
  const projects = useMemo(() => Array.from(new Set(tasks.map(t => t.folder?.name || t.list?.name).filter(Boolean))).sort(), [tasks]);
  const members = useMemo(() => Array.from(new Set(tasks.flatMap(t => t.assignees?.map(a => a.username) || []))).sort(), [tasks]);
  const statuses = useMemo(() => Array.from(new Set(tasks.map(t => t.status?.status).filter(Boolean))).sort(), [tasks]);

  const filtered = useMemo(() => {
    let result = tasks;
    if (filters.space) result = result.filter(t => t.space?.name === filters.space);
    if (filters.project) result = result.filter(t => (t.folder?.name || t.list?.name) === filters.project);
    if (filters.member) result = result.filter(t => t.assignees?.some(a => a.username === filters.member));
    if (filters.status) result = result.filter(t => t.status?.status === filters.status);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      result = result.filter(t => (t.name || "").toLowerCase().includes(q));
    }
    return result;
  }, [tasks, filters]);

  const displayed = filtered.slice(0, 300);

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3">
        <select
          value={filters.space}
          onChange={e => setFilters(f => ({ ...f, space: e.target.value }))}
          className="rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-foreground"
        >
          <option value="">All spaces</option>
          {spaces.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filters.project}
          onChange={e => setFilters(f => ({ ...f, project: e.target.value }))}
          className="rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-foreground"
        >
          <option value="">All projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filters.member}
          onChange={e => setFilters(f => ({ ...f, member: e.target.value }))}
          className="rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-foreground"
        >
          <option value="">All members</option>
          {members.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-foreground"
        >
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.q}
          onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
          className="flex-1 min-w-[160px] rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-2.5"></th>
              <th className="p-2.5">Task</th>
              <th className="p-2.5">Project</th>
              <th className="p-2.5">Space</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5">Assignees</th>
              <th className="p-2.5">Due</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No tasks match.</td></tr>
            ) : displayed.map(t => {
              const closed = t.status?.type === "closed";
              const overdue = !closed && t.due_date && Number(t.due_date) < Date.now();
              const who = t.assignees?.map(a => a.username).join(", ") || "—";
              return (
                <tr key={t.id} className="border-b border-border/50 hover:bg-primary/5">
                  <td className="p-2.5">{closed ? "✅" : overdue ? "⏰" : "⬜"}</td>
                  <td className="p-2.5">
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {t.name}
                    </a>
                  </td>
                  <td className="p-2.5">{t.folder?.name || t.list?.name || ""}</td>
                  <td className="p-2.5">{t.space?.name || ""}</td>
                  <td className="p-2.5">{t.status?.status || ""}</td>
                  <td className="p-2.5">{who}</td>
                  <td className="p-2.5">
                    {formatDate(t.due_date)}
                    {overdue && <span className="ml-1.5 inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">late</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Showing {Math.min(filtered.length, 300)} of {filtered.length} matching tasks · {tasks.length} tasks total
      </p>
    </div>
  );
}
