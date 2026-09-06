"use client";

import { Badge } from "@/components/ui/badge";
import { Member } from "@/lib/types";
import { initials } from "@/lib/compute";

interface TeamCapacityProps {
  members: Member[];
}

export function TeamCapacity({ members }: TeamCapacityProps) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        Team capacity
        <span className="rounded-full bg-muted border px-2.5 py-0.5 text-[11px]">{members.length}</span>
      </h2>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 border flex items-center justify-center flex-shrink-0 text-xs font-bold">
                {initials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold truncate">{m.name}</h3>
                <p className="text-xs text-muted-foreground">{m.open} open of {m.total} tasks</p>
              </div>
              <Badge variant={m.capacity.cls as "destructive" | "warning" | "success" | "secondary"} className="flex-shrink-0 text-[11px]">
                {m.capacity.txt}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
