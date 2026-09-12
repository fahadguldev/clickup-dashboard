"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog } from "@/components/ui/dialog";
import { Member, Task, Project } from "@/lib/types";
import { healthOf, initials } from "@/lib/compute";

interface TeamCapacityProps {
  members: Member[];
  tasks: Task[];
  projects: Project[];
  memberSearch: string;
  onMemberSearch: (v: string) => void;
}

export function TeamCapacity({ members, tasks, projects, memberSearch, onMemberSearch }: TeamCapacityProps) {
  const [selected, setSelected] = useState<Member | null>(null);

  const memberTasks = useMemo(() => {
    if (!selected) return [];
    return tasks.filter(t => t.assignees?.some(a => a.id === selected.id));
  }, [selected, tasks]);

  const memberProjects = useMemo(() => {
    if (!selected) return [];
    return projects.filter(p => selected.projectKeys.has(p.key));
  }, [selected, projects]);

  return (
    <>
      <section className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Team
            <span className="rounded-full bg-muted border px-2.5 py-0.5 text-[11px]">{members.length}</span>
          </h2>
          <input
            type="text"
            placeholder="Search team..."
            value={memberSearch}
            onChange={e => onMemberSearch(e.target.value)}
            className="rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground w-56"
          />
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {members.map(m => {
              const progress = m.total === 0 ? 0 : Math.round((m.done / m.total) * 100);
              const barColor = m.capacity.cls === "destructive" ? "bg-red-500" : m.capacity.cls === "warning" ? "bg-amber-500" : "bg-emerald-500";

              return (
                <Card key={m.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelected(m)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 border flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold truncate">{m.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                      <Badge variant={m.capacity.cls as "destructive" | "warning" | "success" | "secondary"} className="text-[11px] flex-shrink-0">
                        {m.capacity.txt}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          <span className="font-bold text-foreground">{m.open}</span> open · <span className="font-bold text-foreground">{m.done}</span> done
                        </span>
                        <span className="font-bold text-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" indicatorClassName={barColor} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">{m.projectKeys.size} project{m.projectKeys.size !== 1 ? "s" : ""}</p>
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
        subtitle={selected ? `${selected.open} open · ${selected.done} done · ${selected.total} total tasks` : ""}
      >
        <div className="space-y-5">
          {memberProjects.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                Projects
                <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px]">{memberProjects.length}</span>
              </h3>
              <div className="space-y-2">
                {memberProjects.map(p => {
                  const hp = healthOf(p.health);
                  const barColor = hp.cls === "destructive" ? "bg-red-500" : hp.cls === "warning" ? "bg-amber-500" : "bg-emerald-500";
                  return (
                    <div key={p.key} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.folderName} · {p.spaceName}</div>
                        </div>
                        <Badge variant={hp.cls as "destructive" | "warning" | "success"} className="text-[11px] flex-shrink-0">{hp.txt}</Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span><span className="font-bold text-foreground">{p.done}</span>/{p.total} done</span>
                        <span className="font-bold text-foreground">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-1.5" indicatorClassName={barColor} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(() => {
  const todoTasks = memberTasks.filter(t => t.status?.type !== "closed" && t.status?.status === "to do");
  const inProgressTasks = memberTasks.filter(t => t.status?.type !== "closed" && t.status?.status !== "to do");

            return (
              <>
                {todoTasks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                      To Do <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px]">{todoTasks.length}</span>
                    </h3>
                    <div className="space-y-2">
                      {todoTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <span className="text-sm">⬜</span>
                          <div className="flex-1 min-w-0">
                            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary hover:underline truncate block">{t.name}</a>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.list?.name || t.folder?.name || "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {inProgressTasks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                      In Progress <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px]">{inProgressTasks.length}</span>
                    </h3>
                    <div className="space-y-2">
                      {inProgressTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <span className="text-sm">🔄</span>
                          <div className="flex-1 min-w-0">
                            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary hover:underline truncate block">{t.name}</a>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.list?.name || t.folder?.name || "—"} · {t.status?.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
          {memberTasks.length === 0 && memberProjects.length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks or projects assigned.</p>
          )}
        </div>
      </Dialog>
    </>
  );
}
