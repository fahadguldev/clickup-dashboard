"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Member, Task } from "@/lib/types";
import { initials, formatDate } from "@/lib/compute";

interface TeamCapacityProps {
  members: Member[];
  tasks: Task[];
}

export function TeamCapacity({ members, tasks }: TeamCapacityProps) {
  const [selected, setSelected] = useState<Member | null>(null);

  const memberTasks = selected
    ? tasks.filter(t => t.assignees?.some(a => a.id === selected.id))
    : [];

  const todoTasks = memberTasks.filter(t => t.status?.type !== "closed" && t.status?.status === "to do");
  const inProgressTasks = memberTasks.filter(t => t.status?.type !== "closed" && t.status?.status !== "to do");
  const doneTasks = memberTasks.filter(t => t.status?.type === "closed");

  return (
    <>
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          Team capacity
          <span className="rounded-full bg-muted border px-2.5 py-0.5 text-[11px]">{members.length}</span>
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {members.map((m) => (
              <Card key={m.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelected(m)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 border flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold truncate">{m.name}</h3>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span><span className="font-bold text-foreground">{m.open}</span> open</span>
                      <span><span className="font-bold text-foreground">{m.done}</span> done</span>
                      <span><span className="font-bold text-foreground">{m.total}</span> total</span>
                    </div>
                    <Badge variant={m.capacity.cls as "destructive" | "warning" | "success" | "secondary"} className="text-[11px] flex-shrink-0">
                      {m.capacity.txt}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected ? `${selected.open} open · ${selected.done} done · ${selected.total} total tasks` : ""}
      >
        {todoTasks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              To Do
              <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px]">{todoTasks.length}</span>
            </h3>
            <div className="space-y-2">
              {todoTasks.map(t => {
                const overdue = t.due_date && Number(t.due_date) < Date.now();
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <span className="text-sm">{overdue ? "⏰" : "⬜"}</span>
                    <div className="flex-1 min-w-0">
                      <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block">
                        {t.name}
                      </a>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.folder?.name || t.list?.name || "—"} · {t.status?.status || "—"}</p>
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
        )}
        {inProgressTasks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              In Progress
              <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px]">{inProgressTasks.length}</span>
            </h3>
            <div className="space-y-2">
              {inProgressTasks.map(t => {
                const overdue = t.due_date && Number(t.due_date) < Date.now();
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <span className="text-sm">{overdue ? "⏰" : "⬜"}</span>
                    <div className="flex-1 min-w-0">
                      <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block">
                        {t.name}
                      </a>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.folder?.name || t.list?.name || "—"} · {t.status?.status || "—"}</p>
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
        )}
        {doneTasks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              Completed
              <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px]">{doneTasks.length}</span>
            </h3>
            <div className="space-y-2">
              {doneTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors opacity-60">
                  <span className="text-sm">✅</span>
                  <div className="flex-1 min-w-0">
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block">
                      {t.name}
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.folder?.name || t.list?.name || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {memberTasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks assigned.</p>
        )}
      </Dialog>
    </>
  );
}
