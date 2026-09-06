"use client";

import { Badge } from "@/components/ui/badge";
import { Problem } from "@/lib/types";

interface AttentionSectionProps {
  problems: Problem[];
}

export function AttentionSection({ problems }: AttentionSectionProps) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        CEO attention required
        <span className="rounded-full bg-muted border px-2.5 py-0.5 text-[11px]">{problems.length}</span>
      </h2>
      {problems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing requires attention right now.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {problems.map((p, i) => (
            <div key={i} className="flex gap-3 items-start rounded-xl border bg-card p-3 shadow">
              <span className="text-base leading-snug">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{p.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.body}</div>
              </div>
              <Badge variant={p.sev === "critical" ? "destructive" : "warning"} className="flex-shrink-0">
                {p.sev === "critical" ? "Critical" : "Watch"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
