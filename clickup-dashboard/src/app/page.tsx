"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardFooter } from "@/components/dashboard/footer";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { SpaceCards } from "@/components/dashboard/space-cards";
import { FolderCards } from "@/components/dashboard/folder-cards";
import { ProjectCards } from "@/components/dashboard/project-cards";
import { TeamCapacity } from "@/components/dashboard/team-capacity";
import { getMockTasks } from "@/lib/mock-data";
import { computeState } from "@/lib/compute";
import { DashboardState, Task } from "@/lib/types";

const REFRESH_SECONDS = 60;

function mapClickUpTask(raw: Record<string, unknown>, spaceNameById: Record<string, string>): Task {
  const status = raw.status as { status?: string; type?: string; color?: string } | undefined;
  const folder = raw.folder as { id?: string; name?: string } | undefined;
  const project = raw.project as { id?: string; name?: string } | undefined;
  const list = raw.list as { id?: string; name?: string } | undefined;
  const space = raw.space as { id?: string; name?: string } | undefined;
  const assignees = (raw.assignees as { id?: number; username?: string; email?: string; profilePicture?: string | null }[] || []);

  const spaceId = space?.id ?? "";
  const spaceName = space?.name || spaceNameById[spaceId] || "Unknown";

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
    space: spaceId ? { id: spaceId, name: spaceName } : null,
  };
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [status, setStatus] = useState<"ok" | "paused" | "error">("ok");
  const [statusText, setStatusText] = useState("loading...");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setStatusText("refreshing...");
    setError(null);

    try {
      const res = await fetch("/api/clickup", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const spaceNameById = (data.spaceNameById ?? {}) as Record<string, string>;
      const tasks: Task[] = (data.tasks as Record<string, unknown>[]).map(t => mapClickUpTask(t, spaceNameById));
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

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { loadData(); return REFRESH_SECONDS; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loadData]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("paused");
        setStatusText("paused (tab hidden)");
      } else { loadData(); }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadData]);

  const availableFolders = useMemo(() => {
    if (!selectedSpace || !state) return [];
    return state.projects
      .filter(p => p.spaceName === selectedSpace)
      .map(p => p.folderName)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [state, selectedSpace]);

  const filteredProjects = useMemo(() => {
    if (!state) return [];
    return state.projects.filter(p => {
      if (selectedSpace && p.spaceName !== selectedSpace) return false;
      if (selectedFolder && p.folderName !== selectedFolder) return false;
      return true;
    });
  }, [state, selectedSpace, selectedFolder]);

  const filteredMembers = useMemo(() => {
    if (!state) return [];
    return state.members.filter(m => {
      if (memberSearch) {
        const q = memberSearch.toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
      }
      if (selectedSpace || selectedFolder) {
        const hasMatching = Array.from(m.projectKeys).some(key => {
          const proj = state.projects.find(p => p.key === key);
          if (!proj) return false;
          if (selectedSpace && proj.spaceName !== selectedSpace) return false;
          if (selectedFolder && proj.folderName !== selectedFolder) return false;
          return true;
        });
        if (!hasMatching) return false;
      }
      return true;
    });
  }, [state, memberSearch, selectedSpace, selectedFolder]);

  const handleSelectSpace = (space: string) => {
    setSelectedSpace(space);
    setSelectedFolder(null);
  };

  const handleSelectFolder = (folder: string) => {
    setSelectedFolder(folder);
  };

  const breadcrumbs = [
    { label: "Spaces", onClick: () => { setSelectedSpace(null); setSelectedFolder(null); } },
    ...(selectedSpace ? [{ label: selectedSpace, onClick: () => setSelectedFolder(null) }] : []),
    ...(selectedFolder ? [{ label: selectedFolder, onClick: undefined }] : []),
  ];

  const showProjects = selectedSpace && selectedFolder;

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

            {/* Filters */}
            <div className="flex gap-2 flex-wrap mb-4">
              <select
                value={selectedSpace ?? ""}
                onChange={e => { setSelectedSpace(e.target.value || null); setSelectedFolder(null); }}
                className="rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">All spaces</option>
                {state.spaces.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={selectedFolder ?? ""}
                onChange={e => setSelectedFolder(e.target.value || null)}
                disabled={!selectedSpace}
                className="rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-foreground disabled:opacity-40"
              >
                <option value="">{selectedSpace ? "All categories" : "Select space first"}</option>
                {availableFolders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Breadcrumb */}
            {selectedSpace && (
              <nav className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
                {breadcrumbs.map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    {b.onClick ? (
                      <button onClick={b.onClick} className="text-primary hover:underline font-medium">
                        {b.label}
                      </button>
                    ) : (
                      <span className="text-muted-foreground font-medium">{b.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            {/* Level 1: Spaces */}
            {!selectedSpace && (
              <SpaceCards projects={state.projects} onSelectSpace={handleSelectSpace} />
            )}

            {/* Level 2: Folders within space */}
            {selectedSpace && !selectedFolder && (
              <FolderCards projects={state.projects} spaceName={selectedSpace} onSelectFolder={handleSelectFolder} />
            )}

            {/* Level 3: Projects within folder */}
            {showProjects && (
              <ProjectCards
                projects={filteredProjects}
                tasks={state.tasks}
                spaces={state.spaces}
                availableFolders={availableFolders}
                spaceFilter={selectedSpace}
                folderFilter={selectedFolder}
                onSpaceFilter={setSelectedSpace}
                onFolderFilter={setSelectedFolder}
              />
            )}

            <TeamCapacity
              members={filteredMembers}
              tasks={state.tasks}
              projects={filteredProjects}
              memberSearch={memberSearch}
              onMemberSearch={setMemberSearch}
            />
          </>
        )}
      </main>

      <DashboardFooter />
    </div>
  );
}
