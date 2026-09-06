"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardFooter } from "@/components/dashboard/footer";
import { CEOTab } from "@/components/dashboard/ceo-tab";
import { DeliveryTab } from "@/components/dashboard/delivery-tab";
import { OperationsTab } from "@/components/dashboard/operations-tab";
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
  const [activeTab, setActiveTab] = useState<"ceo" | "delivery" | "ops">("ceo");
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
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

      // Fallback to mock data if API fails
      try {
        const tasks = getMockTasks();
        const computed = computeState(tasks);
        setState(computed);
      } catch {
        // mock also failed, state stays null
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

  const handleRefresh = () => {
    loadData();
  };

  const handleSelectProject = (key: string) => {
    setSelectedProjectKey(key);
    setActiveTab("delivery");
  };

  const handleBack = () => {
    setSelectedProjectKey(null);
  };

  const tabs = [
    { key: "ceo" as const, label: "CEO — Attention" },
    { key: "delivery" as const, label: "Delivery — Why" },
    { key: "ops" as const, label: "Operations — What" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader
        secondsLeft={secondsLeft}
        status={status}
        statusText={statusText}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="flex gap-2 px-6 pt-4 max-w-[1600px] mx-auto w-full">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedProjectKey(null); }}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold border border-b-0 transition-colors ${
              activeTab === tab.key
                ? "bg-card border-border text-primary"
                : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="flex-1 px-6 py-5 max-w-[1600px] mx-auto w-full">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            API Error: {error} — showing mock data as fallback.
          </div>
        )}
        {!state ? (
          <div className="text-center text-muted-foreground py-16">Loading data from ClickUp...</div>
        ) : (
          <>
            {activeTab === "ceo" && (
              <CEOTab state={state} onSelectProject={handleSelectProject} />
            )}
            {activeTab === "delivery" && (
              <DeliveryTab
                projects={state.projects}
                tasks={state.tasks}
                selectedProjectKey={selectedProjectKey}
                onSelectProject={handleSelectProject}
                onBack={handleBack}
              />
            )}
            {activeTab === "ops" && (
              <OperationsTab tasks={state.tasks} />
            )}
          </>
        )}
      </main>

      <DashboardFooter />
    </div>
  );
}
