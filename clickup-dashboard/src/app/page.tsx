"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardFooter } from "@/components/dashboard/footer";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { ProjectCards } from "@/components/dashboard/project-cards";
import { TeamCapacity } from "@/components/dashboard/team-capacity";
import { getMockTasks } from "@/lib/mock-data";
import { computeState } from "@/lib/compute";
import { DashboardState, Task } from "@/lib/types";

const REFRESH_SECONDS = 60;

function mapClickUpTask(raw: Record<string, unknown>): Task {
  const status = raw.status as { status?: string; type?: string; color?: string } | undefined;
  const folder = raw.folder as { id?: string; name?: string } | undefined;
  const project = raw.project as { id?: string; name?: string } | undefined;
  const list = raw.list as { id?: string; name?: string } | undefined;
  const space = raw.space as { id?: string; name?: string } | undefined;
  const assignees = (raw.assignees as { id?: number; username?: string; email?: string; profilePicture?: string | null }[] || []);

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    url: String(raw.url ?? ""),
    status: {
      status: status?.status ?? "",
      type: status?.type ?? "",
      color: status?.color ?? "",
    },
    due_date: raw.due_date != null ? String(raw.due_date) : null,
    date_updated: raw.date_updated != null ? String(raw.date_updated) : null,
    assignees: assignees.map(a => ({
      id: a.id ?? 0,
      username: a.username ?? "",
      email: a.email ?? "",
      profilePicture: a.profilePicture ?? null,
    })),
    folder: folder?.id ? { id: folder.id, name: folder.name ?? "" } : null,
    project: project?.id ? { id: project.id, name: project.name ?? "" } : null,
    list: list?.id ? { id: list.id, name: list.name ?? "" } : null,
    space: space?.id ? { id: space.id, name: space.name ?? "" } : null,
  };
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [status, setStatus] = useState<"ok" | "paused" | "error">("ok");
  const [statusText, setStatusText] = useState("loading...");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setStatusText("refreshing...");
    setError(null);

    try {
      const res = await fetch("/api/clickup");
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const tasks: Task[] = (data.tasks as Record<string, unknown>[]).map(mapClickUpTask);
      const computed = computeState(tasks);
      setState(computed);
      setStatus("ok");
      setStatusText("live");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
      setStatusText("error — using mock data");

      try {
        const tasks = getMockTasks();
        const computed = computeState(tasks);
        setState(computed);
      } catch {
        // mock also failed
      }
    } finally {
      setRefreshing(false);
      setSecondsLeft(REFRESH_SECONDS);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          loadData();
          return REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadData]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("paused");
        setStatusText("paused (tab hidden)");
      } else {
        loadData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadData]);

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader
        secondsLeft={secondsLeft}
        status={status}
        statusText={statusText}
        onRefresh={loadData}
        refreshing={refreshing}
      />

      <main className="flex-1 px-6 py-6 max-w-[1600px] mx-auto w-full">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            API Error: {error} — showing mock data as fallback.
          </div>
        )}
        {!state ? (
          <div className="text-center text-muted-foreground py-16">Loading data from ClickUp...</div>
        ) : (
          <>
            <StatsGrid state={state} />
            <ProjectCards projects={state.projects} tasks={state.tasks} />
            <TeamCapacity members={state.members} tasks={state.tasks} />
          </>
        )}
      </main>

      <DashboardFooter />
    </div>
  );
}
