"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog } from "@/components/ui/dialog";
import { Project, Task } from "@/lib/types";
import { healthOf, formatDate } from "@/lib/compute";

interface ProjectCardsProps {
  projects: Project[];
  tasks: Task[];
}

export function ProjectCards({ projects, tasks }: ProjectCardsProps) {
  const [selected, setSelected] = useState<Project | null>(null);

  const selectedTasks = selected
    ? tasks.filter(t => {
        const key = t.folder ? `folder:${t.folder.id}` : `list:${t.list?.id}`;
        return key === selected.key;
      })
    : [];

  return (
    <>
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          Project health
          <span className="rounded-full bg-muted border px-2.5 py-0.5 text-[11px]">{projects.length}</span>
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {projects.map((p) => {
              const hp = healthOf(p.health);
              const progressColor =
                hp.cls === "destructive" ? "bg-red-500" :
                hp.cls === "warning" ? "bg-amber-500" :
                "bg-emerald-500";

              return (
                <Card
                  key={p.key}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelected(p)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{p.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.spaceName}</p>
                      </div>
                      <Badge variant={hp.cls as "destructive" | "warning" | "success"} className="flex-shrink-0 text-[11px]">
                        {hp.txt}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          <span className="font-bold text-foreground">{p.done}</span>/{p.total} done
                          {p.overdue > 0 && <> · {p.overdue} overdue</>}
                        </span>
                        <span className="font-bold text-foreground">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-2" indicatorClassName={progressColor} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected ? `${selected.spaceName} · ${selected.done}/${selected.total} done (${selected.progress}%) · ${selected.overdue} overdue` : ""}
      >
        {selectedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks found.</p>
        ) : (
          <div className="space-y-5">
            {([
              { label: "To Do", filter: (t: Task) => t.status?.type !== "closed" && t.status?.status === "to do" },
              { label: "In Progress", filter: (t: Task) => t.status?.type !== "closed" && t.status?.status !== "to do" },
              { label: "Completed", filter: (t: Task) => t.status?.type === "closed" },
            ]).map(section => {
              const sectionTasks = selectedTasks.filter(section.filter);
              if (sectionTasks.length === 0) return null;
              return (
                <div key={section.label}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    {section.label}
                    <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px]">{sectionTasks.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {sectionTasks.map(t => {
                      const closed = t.status?.type === "closed";
                      const overdue = !closed && t.due_date && Number(t.due_date) < Date.now();
                      const who = t.assignees?.map(a => a.username).join(", ") || "—";
                      return (
                        <div key={t.id} className={`flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors ${closed ? "opacity-60" : ""}`}>
                          <span className="text-sm">{closed ? "✅" : overdue ? "⏰" : "⬜"}</span>
                          <div className="flex-1 min-w-0">
                            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block">
                              {t.name}
                            </a>
                            <p className="text-xs text-muted-foreground mt-0.5">{who} · {t.status?.status || "—"}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-muted-foreground">{formatDate(t.due_date)}</div>
                            {overdue && <span className="inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500 mt-0.5">overdue</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Dialog>
    </>
  );
}
