"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/lib/types";
import { healthOf } from "@/lib/compute";

interface ClientHealthProps {
  projects: Project[];
}

interface ClientData {
  name: string;
  total: number;
  done: number;
  overdue: number;
  critical: number;
  risk: number;
}

export function ClientHealth({ projects }: ClientHealthProps) {
  const clientMap = new Map<string, ClientData>();

  for (const p of projects) {
    const name = p.spaceName;
    if (!clientMap.has(name)) {
      clientMap.set(name, { name, total: 0, done: 0, overdue: 0, critical: 0, risk: 0 });
    }
    const c = clientMap.get(name)!;
    c.total += p.total;
    c.done += p.done;
    c.overdue += p.overdue;
    if (p.health === "critical") c.critical++;
    if (p.health === "risk") c.risk++;
  }

  const clients = Array.from(clientMap.values());

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Client health</h2>
      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">No client data yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.map((c) => {
            const progress = c.total === 0 ? 0 : Math.round((c.done / c.total) * 100);
            const h = c.critical > 0 ? healthOf("critical") : c.risk > 0 ? healthOf("risk") : healthOf("track");
            const progressColor =
              h.cls === "destructive" ? "bg-red-500" :
              h.cls === "warning" ? "bg-amber-500" :
              "bg-emerald-500";

            return (
              <Card key={c.name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm truncate">{c.name}</h3>
                    <Badge variant={h.cls as "destructive" | "warning" | "success"} className="text-[11px]">{h.txt}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{c.done}/{c.total} done · {c.overdue} overdue</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" indicatorClassName={progressColor} />
                  </div>
                  {(c.critical > 0 || c.risk > 0) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {c.critical} critical · {c.risk} at-risk project(s)
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
