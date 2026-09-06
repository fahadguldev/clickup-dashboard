"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardState } from "@/lib/types";
import { healthOf } from "@/lib/compute";

interface StatsGridProps {
  state: DashboardState;
}

export function StatsGrid({ state }: StatsGridProps) {
  const h = healthOf(state.overall);
  const stats = [
    { label: "Overall Status", value: h.txt, color: h.cls === "destructive" ? "text-red-400" : h.cls === "warning" ? "text-amber-400" : "text-emerald-400" },
    { label: "Overall Progress", value: `${state.progress}%`, color: "text-primary" },
    { label: "Projects at Risk", value: state.riskProjects, color: "text-amber-400" },
    { label: "Critical Projects", value: state.criticalProjects, color: "text-red-400" },
    { label: "Overloaded Members", value: state.overloadedCount, color: "text-red-400" },
    { label: "Open Tasks", value: state.open, color: "text-amber-400" },
    { label: "Completed", value: state.done, color: "text-emerald-400" },
    { label: "Total Tasks", value: state.total, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
