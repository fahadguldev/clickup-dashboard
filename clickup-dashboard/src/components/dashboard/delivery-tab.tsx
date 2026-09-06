"use client";

import { Badge } from "@/components/ui/badge";
import { Project, Task } from "@/lib/types";
import { healthOf, formatDate } from "@/lib/compute";

interface DeliveryTabProps {
  projects: Project[];
  tasks: Task[];
  selectedProjectKey: string | null;
  onSelectProject: (key: string) => void;
  onBack: () => void;
}

export function DeliveryTab({ projects, tasks, selectedProjectKey, onSelectProject, onBack }: DeliveryTabProps) {
  if (selectedProjectKey) {
    const p = projects.find(x => x.key === selectedProjectKey);
    if (!p) return null;
    const hp = healthOf(p.health);
    const projectTasks = tasks.filter(t => {
      const key = t.folder ? `folder:${t.folder.id}` : `list:${t.list?.id}`;
      return key === selectedProjectKey;
    });

    return (
      <div>
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 rounded-lg border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors">
          All projects
        </button>
        <div className="rounded-xl border bg-card p-4 shadow">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.spaceName} · {p.done}/{p.total} done ({p.progress}%) · {p.overdue} overdue · {p.dueSoon} due soon · {p.stale} stale
              </p>
            </div>
            <Badge variant={hp.cls as "destructive" | "warning" | "success"}>{hp.txt}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3"></th>
                  <th className="pb-2 pr-3">Task</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Assignees</th>
                  <th className="pb-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {projectTasks.length === 0 ? (
                  <tr><td colSpan={5} className="py-4 text-muted-foreground text-center">No tasks.</td></tr>
                ) : projectTasks.map(t => {
                  const closed = t.status?.type === "closed";
                  const overdue = !closed && t.due_date && Number(t.due_date) < Date.now();
                  const who = t.assignees?.map(a => a.username).join(", ") || "—";
                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-primary/5">
                      <td className="py-2 pr-3">{closed ? "✅" : overdue ? "⏰" : "⬜"}</td>
                      <td className="py-2 pr-3">
                        <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {t.name}
                        </a>
                      </td>
                      <td className="py-2 pr-3">{t.status?.status || ""}</td>
                      <td className="py-2 pr-3">{who}</td>
                      <td className="py-2">
                        {formatDate(t.due_date)}
                        {overdue && <span className="ml-1.5 inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">late</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        Projects — why is it happening?
        <span className="rounded-full bg-muted border px-2.5 py-0.5 text-[11px]">{projects.length}</span>
      </h2>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((p) => {
            const hp = healthOf(p.health);
            return (
              <div
                key={p.key}
                className="flex justify-between items-center gap-3 rounded-xl border bg-card p-3 shadow cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onSelectProject(p.key)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-base">{hp.cls === "destructive" ? "🔴" : hp.cls === "warning" ? "🟡" : "🟢"}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.spaceName} · {p.done}/{p.total} done · {p.progress}% · {p.overdue} overdue · {p.dueSoon} due soon · {p.stale} stale
                    </div>
                  </div>
                </div>
                <Badge variant={hp.cls as "destructive" | "warning" | "success"} className="flex-shrink-0">{hp.txt}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
