"use client";

import { Badge } from "@/components/ui/badge";
import { DashboardState } from "@/lib/types";

const DAY = 86400000;

interface DeliveryRisksProps {
  state: DashboardState;
}

interface RiskRow {
  icon: string;
  title: string;
  sub: string;
  cls: "destructive" | "warning";
}

export function DeliveryRisks({ state }: DeliveryRisksProps) {
  const now = Date.now();
  const overdue = state.tasks.filter(t => t.status?.type !== "closed" && t.due_date && Number(t.due_date) < now);
  const dueSoon = state.tasks.filter(t => t.status?.type !== "closed" && t.due_date && Number(t.due_date) > now && Number(t.due_date) - now < 7 * DAY);
  const untouched = state.tasks.filter(t => t.status?.type !== "closed" && t.date_updated && now - Number(t.date_updated) > 14 * DAY);
  const zeroProgress = state.projects.filter(p => p.total > 0 && p.done === 0);

  const riskRows: RiskRow[] = [];
  if (overdue.length) riskRows.push({ icon: "⏰", title: `${overdue.length} overdue tasks`, sub: overdue.slice(0, 3).map(t => t.name).join(" · ") + (overdue.length > 3 ? " ..." : ""), cls: "destructive" });
  if (dueSoon.length) riskRows.push({ icon: "📅", title: `${dueSoon.length} due within 7 days`, sub: dueSoon.slice(0, 3).map(t => t.name).join(" · ") + (dueSoon.length > 3 ? " ..." : ""), cls: "warning" });
  if (untouched.length) riskRows.push({ icon: "🧊", title: `${untouched.length} tasks stagnant 14+ days`, sub: untouched.slice(0, 3).map(t => t.name).join(" · ") + (untouched.length > 3 ? " ..." : ""), cls: "destructive" });
  if (zeroProgress.length) riskRows.push({ icon: "🚫", title: `${zeroProgress.length} projects with no progress`, sub: zeroProgress.slice(0, 3).map(p => p.name).join(" · ") + (zeroProgress.length > 3 ? " ..." : ""), cls: "destructive" });

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Delivery risks</h2>
      {riskRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No delivery risks detected.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {riskRows.map((r, i) => (
            <div key={i} className="flex justify-between items-center gap-3 rounded-xl border bg-card p-3 shadow">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-base">{r.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-bold">{r.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{r.sub}</div>
                </div>
              </div>
              <Badge variant={r.cls} className="flex-shrink-0">
                {r.cls === "destructive" ? "Critical" : "Watch"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
