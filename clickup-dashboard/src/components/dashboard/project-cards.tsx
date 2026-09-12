"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog } from "@/components/ui/dialog";
import { Project, Task } from "@/lib/types";
import { healthOf, initials } from "@/lib/compute";

interface ProjectCardsProps {
  projects: Project[];
  tasks: Task[];
}

export function ProjectCards({ projects, tasks }: ProjectCardsProps) {
  const [selected, setSelected] = useState<Project | null>(null);

  const selectedTasks = useMemo(() => {
    if (!selected) return [];
    return tasks.filter(t => {
      const key = t.list?.id ? `list:${t.list.id}` : t.folder?.id ? `folder:${t.folder.id}` : null;
      return key === selected.key;
    });
  }, [selected, tasks]);

  const selectedDevs = useMemo(() => {
    const map = new Map<number, { id: number; name: string; email: string; open: number; done: number; total: number }>();
    for (const t of selectedTasks) {
      for (const a of t.assignees || []) {
        if (!map.has(a.id)) {
          map.set(a.id, { id: a.id, name: a.username, email: a.email, open: 0, done: 0, total: 0 });
        }
        const d = map.get(a.id)!;
        d.total++;
        if (t.status?.type === "closed") d.done++; else d.open++;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.open - a.open);
  }, [selectedTasks]);

  return (
    <>
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          Projects
          <span className="rounded-full bg-muted border px-2.5 py-0.5 text-[11px]">{projects.length}</span>
        </h2>

        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects match filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {projects.map(p => {
              const hp = healthOf(p.health);
              const barColor = hp.cls === "destructive" ? "bg-red-500" : hp.cls === "warning" ? "bg-amber-500" : "bg-emerald-500";

              return (
                <Card key={p.key} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelected(p)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-sm truncate">{p.name}</h3>
                      <Badge variant={hp.cls as "destructive" | "warning" | "success"} className="flex-shrink-0 text-[11px]">{hp.txt}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{p.folderName} · {p.spaceName}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          <span className="font-bold text-foreground">{p.done}</span>/{p.total} done
                          {p.overdue > 0 && <span className="text-red-400"> · {p.overdue} overdue</span>}
                        </span>
                        <span className="font-bold text-foreground">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-2" indicatorClassName={barColor} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">{p.assigneeIds.size} member{p.assigneeIds.size !== 1 ? "s" : ""}</p>
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
        subtitle={selected ? `${selected.folderName} · ${selected.spaceName} · ${selected.done}/${selected.total} done (${selected.progress}%)` : ""}
      >
        {selectedDevs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members assigned.</p>
        ) : (
          <div className="space-y-2">
            {selectedDevs.map(d => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 border flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {initials(d.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.email}</div>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <span><span className="font-bold text-foreground">{d.open}</span> open</span>
                  <span><span className="font-bold text-foreground">{d.done}</span> done</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}
