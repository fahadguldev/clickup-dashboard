"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  TimeEntry,
  TrackerMember,
} from "@/lib/types";
import {
  formatDuration,
  formatElapsed,
  timeSummary,
  hoursByMember,
  hoursByProject,
  initials,
} from "@/lib/compute";

const STORAGE_KEY = "clickup-tracker-member";

export function getSavedMember(): TrackerMember | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TrackerMember) : null;
  } catch {
    return null;
  }
}

export function saveMember(m: TrackerMember | null) {
  if (typeof window === "undefined") return;
  if (m) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  else window.localStorage.removeItem(STORAGE_KEY);
}

interface TimeTrackingPanelProps {
  entries: TimeEntry[];
  nowMs: number;
  currentMember: TrackerMember | null;
  supabaseReady: boolean;
  onStopEntry: (entry: TimeEntry) => void;
  onDeleteEntry: (entryId: string) => void;
}

export function TimeTrackingPanel({
  entries,
  nowMs,
  currentMember,
  supabaseReady,
  onStopEntry,
  onDeleteEntry,
}: TimeTrackingPanelProps) {
  const summary = timeSummary(entries, nowMs);
  const byMember = hoursByMember(entries, nowMs);
  const byProject = hoursByProject(entries, nowMs);
  const active = entries.filter(e => e.endTime === null);

  if (!supabaseReady) {
    return (
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Time Tracking</h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Supabase is not configured yet. Add{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              to <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env.local</code> and run the{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">supabase/schema.sql</code> in SQL editor.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section id="time-tracking" className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          ⏱ Time Tracking
          <span className="rounded-full bg-muted border px-2.5 py-0.5 text-[11px]">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </h2>

        <div className="flex items-center gap-2">
          {currentMember && (
            <span className="flex items-center gap-1.5 rounded-full border bg-muted/50 pl-1 pr-2 py-0.5 text-xs">
              <span className="h-5 w-5 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 border flex items-center justify-center text-[10px] font-bold">
                {initials(currentMember.name)}
              </span>
              {currentMember.name}
            </span>
          )}
        </div>
      </div>

      {/* Active timers */}
      {active.length > 0 && (
        <Card className="mb-3 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {active.length} timer{active.length !== 1 ? "s" : ""} running
              </h3>
            </div>
            <div className="space-y-2">
              {active.map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <a
                      href={e.taskUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold truncate block hover:text-primary hover:underline"
                    >
                      {e.taskName}
                    </a>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.memberName} · {e.projectName || "No project"}
                    </p>
                  </div>
                  <Badge variant="success" className="font-mono text-[11px] flex-shrink-0 tabular-nums">
                    {formatElapsed(e.startTime, nowMs)}
                  </Badge>
                  <button
                    onClick={() => onStopEntry(e)}
                    className="rounded-lg border bg-red-500/10 border-red-500/40 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
                  >
                    Stop
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[
          { label: "Today", value: formatDuration(summary.today) },
          { label: "This week", value: formatDuration(summary.week) },
          { label: "This month", value: formatDuration(summary.month) },
          { label: "Total tracked", value: formatDuration(summary.total) },
        ].map(s => (
          <Card key={s.label} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{s.label}</p>
              <p className="text-xl font-bold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Per-developer */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours by Developer</h3>
              <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px]">{byMember.length}</span>
            </div>
            {byMember.length === 0 ? (
              <p className="text-sm text-muted-foreground">No time tracked yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {byMember.map(m => (
                  <div key={m.memberId} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/40 transition-colors">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 border flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                      {initials(m.memberName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{m.memberName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        <span className="tabular-nums">{formatDuration(m.today)}</span> today
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold tabular-nums">{formatDuration(m.week)}</div>
                      <div className="text-[10px] text-muted-foreground">this week</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-project */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours by Project</h3>
              <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px]">{byProject.length}</span>
            </div>
            {byProject.length === 0 ? (
              <p className="text-sm text-muted-foreground">No time tracked yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {byProject.map(p => (
                  <div key={p.projectKey} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{p.projectName || "Uncategorized"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        <span className="tabular-nums">{formatDuration(p.today)}</span> today
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold tabular-nums">{formatDuration(p.week)}</div>
                      <div className="text-[10px] text-muted-foreground">this week</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent entries */}
      {entries.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent entries</h3>
              <span className="text-[11px] text-muted-foreground">latest first</span>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {entries.slice(0, 50).map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <a
                      href={e.taskUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold truncate block hover:text-primary hover:underline"
                    >
                      {e.taskName}
                    </a>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {e.memberName} · {new Date(e.startTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-xs font-bold tabular-nums flex-shrink-0">
                    {formatDuration(e.durationSeconds)}
                  </span>
                  <button
                    onClick={() => onDeleteEntry(e.id)}
                    title="Delete entry"
                    className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}