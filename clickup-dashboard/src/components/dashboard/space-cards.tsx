"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/lib/types";
import { healthOf } from "@/lib/compute";

interface SpaceCardsProps {
  projects: Project[];
  onSelectSpace: (space: string) => void;
}

export function SpaceCards({ projects, onSelectSpace }: SpaceCardsProps) {
  const spaces = useMemo(() => {
    const map = new Map<string, { name: string; total: number; done: number; overdue: number; projectCount: number; health: Project["health"] }>();
    for (const p of projects) {
      const existing = map.get(p.spaceName);
      if (existing) {
        existing.total += p.total;
        existing.done += p.done;
        existing.overdue += p.overdue;
        existing.projectCount++;
        if (p.health === "critical") existing.health = "critical";
        else if (p.health === "risk" && existing.health !== "critical") existing.health = "risk";
      } else {
        map.set(p.spaceName, {
          name: p.spaceName, total: p.total, done: p.done,
          overdue: p.overdue, projectCount: 1, health: p.health,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const order: Record<string, number> = { critical: 0, risk: 1, track: 2 };
      return (order[a.health] ?? 3) - (order[b.health] ?? 3);
    });
  }, [projects]);

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        Spaces
        <span className="rounded-full bg-muted border px-2.5 py-0.5 text-[11px]">{spaces.length}</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {spaces.map(s => {
          const hp = healthOf(s.health);
          const progress = s.total === 0 ? 0 : Math.round((s.done / s.total) * 100);
          const barColor = hp.cls === "destructive" ? "bg-red-500" : hp.cls === "warning" ? "bg-amber-500" : "bg-emerald-500";

          return (
            <Card key={s.name} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onSelectSpace(s.name)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-sm truncate">{s.name}</h3>
                  <Badge variant={hp.cls as "destructive" | "warning" | "success"} className="flex-shrink-0 text-[11px]">{hp.txt}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{s.projectCount} project{s.projectCount !== 1 ? "s" : ""}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      <span className="font-bold text-foreground">{s.done}</span>/{s.total} done
                      {s.overdue > 0 && <span className="text-red-400"> · {s.overdue} overdue</span>}
                    </span>
                    <span className="font-bold text-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" indicatorClassName={barColor} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
