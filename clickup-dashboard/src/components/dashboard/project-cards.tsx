"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/lib/types";
import { healthOf } from "@/lib/compute";

interface ProjectCardsProps {
  projects: Project[];
  onSelectProject: (key: string) => void;
}

export function ProjectCards({ projects, onSelectProject }: ProjectCardsProps) {
  return (
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
                onClick={() => onSelectProject(p.key)}
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
                    <Progress
                      value={p.progress}
                      className="h-2"
                      indicatorClassName={progressColor}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
