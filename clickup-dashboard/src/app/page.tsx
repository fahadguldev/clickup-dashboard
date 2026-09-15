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
import { TimeTrackingPanel } from "@/components/dashboard/time-tracking-panel";
import { getMockTasks } from "@/lib/mock-data";
import { computeState } from "@/lib/compute";
import { DashboardState, Task, TimeEntry, TrackerMember } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const REFRESH_SECONDS = 60;

interface SessionInfo {
  email: string;
  memberId: number | null;
  memberName: string | null;
  isAdmin: boolean;
}

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
  const router = useRouter();
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

  // ── Auth / session ─────────────────────────────────────────────────────────
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      router.replace("/login");
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      const meta = (user.user_metadata ?? {}) as {
        clickup_member_id?: number | null;
        clickup_member_name?: string | null;
        clickup_admin?: boolean;
      };
      setSessionInfo({
        email: (user.email ?? "").toLowerCase(),
        memberId: meta.clickup_member_id ?? null,
        memberName: meta.clickup_member_name ?? null,
        isAdmin: meta.clickup_admin === true,
      });
      setAuthChecking(false);
    });
  }, [router]);

  const signOut = useCallback(async () => {
    const sb = supabaseBrowser();
    if (sb) await sb.auth.signOut();
    router.replace("/login");
  }, [router]);

  // ── Time tracking ──────────────────────────────────────────────────────────
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [timeNotice, setTimeNotice] = useState<string | null>(null);
  const noticeTimer = useRef<NodeJS.Timeout | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const loadTimeEntries = useCallback(async () => {
    if (!sessionInfo) return;
    try {
      const res = await fetch("/api/time", { cache: "no-store" });
      if (res.status === 401) {
        setTimeError("Sign in with a ClickUp-member email to load time entries.");
        setSupabaseReady(true);
        return;
      }
      if (res.status === 503) {
        setSupabaseReady(false);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setTimeEntries(data?.entries ?? []);
      setSupabaseReady(true);
      setTimeError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTimeError(msg);
      setSupabaseReady(true);
    }
  }, [sessionInfo]);

  useEffect(() => { if (sessionInfo) loadTimeEntries(); }, [loadTimeEntries, sessionInfo]);

  // Tick clock every second for elapsed timers
  useEffect(() => {
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const paintNotice = useCallback((msg: string) => {
    setTimeNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setTimeNotice(null), 4000);
  }, []);

  const startTimer = useCallback(async (task: Task) => {
    const projectOf = (t: Task) => {
      const key = t.list?.id ? `list:${t.list.id}` : t.folder?.id ? `folder:${t.folder.id}` : `task:${t.id}`;
      return {
        key,
        name: t.list?.name || t.folder?.name || t.space?.name || "Uncategorized",
        folder: t.folder?.name ?? "",
        space: t.space?.name ?? "",
      };
    };
    if (!sessionInfo?.memberId) {
      setTimeError("You are not linked to a ClickUp member yet. Re-sign in to refresh.");
      return;
    }
    setTimeError(null);
    try {
      const res = await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          task: { id: task.id, name: task.name, url: task.url },
          project: projectOf(task),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "HTTP " + res.status);
      }
      await loadTimeEntries();
      paintNotice(`Timer started on "${task.name}"`);
    } catch (e) {
      setTimeError(e instanceof Error ? e.message : String(e));
      paintNotice("Timer could not be started");
    }
  }, [sessionInfo, loadTimeEntries, paintNotice]);

  const stopTimer = useCallback(async (entry: TimeEntry) => {
    setTimeError(null);
    try {
      const res = await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", entryId: entry.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "HTTP " + res.status);
      }
      await loadTimeEntries();
      paintNotice(`Stopped timer on "${entry.taskName}"`);
    } catch (e) {
      setTimeError(e instanceof Error ? e.message : String(e));
      paintNotice("Timer could not be stopped");
    }
  }, [loadTimeEntries, paintNotice]);

  const deleteEntry = useCallback(async (entryId: string) => {
    setTimeError(null);
    try {
      const res = await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", entryId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "HTTP " + res.status);
      }
      await loadTimeEntries();
      paintNotice("Entry deleted");
    } catch (e) {
      setTimeError(e instanceof Error ? e.message : String(e));
      paintNotice("Entry could not be deleted");
    }
  }, [loadTimeEntries, paintNotice]);

  const loadData = useCallback(async () => {
    if (!sessionInfo) return;
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
  }, [sessionInfo]);

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

  // ── Scoping: non-admins see only their own tasks ─────────────────────────
  const isAdmin = sessionInfo?.isAdmin ?? false;
  const currentMember: TrackerMember | null = useMemo(() => {
    if (!state || !sessionInfo?.memberId) return null;
    const m = state.members.find(mem => mem.id === sessionInfo.memberId);
    if (m) return { id: m.id, name: m.name, email: m.email, profilePicture: m.profilePicture };
    return null;
  }, [state, sessionInfo]);

  const scopedState: DashboardState | null = useMemo(() => {
    if (!state) return null;
    if (isAdmin) return state;
    const myId = sessionInfo?.memberId;
    if (!myId) return state;
    const myTasks = state.tasks.filter(t => t.assignees?.some(a => a.id === myId));
    return computeState(myTasks);
  }, [state, isAdmin, sessionInfo]);

  const availableFolders = useMemo(() => {
    if (!selectedSpace || !scopedState) return [];
    return scopedState.projects
      .filter(p => p.spaceName === selectedSpace)
      .map(p => p.folderName)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [scopedState, selectedSpace]);

  const filteredProjects = useMemo(() => {
    if (!scopedState) return [];
    return scopedState.projects.filter(p => {
      if (selectedSpace && p.spaceName !== selectedSpace) return false;
      if (selectedFolder && p.folderName !== selectedFolder) return false;
      return true;
    });
  }, [scopedState, selectedSpace, selectedFolder]);

  const filteredMembers = useMemo(() => {
    if (!scopedState) return [];
    return scopedState.members.filter(m => {
      if (memberSearch) {
        const q = memberSearch.toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
      }
      if (selectedSpace || selectedFolder) {
        const hasMatching = Array.from(m.projectKeys).some(key => {
          const proj = scopedState.projects.find(p => p.key === key);
          if (!proj) return false;
          if (selectedSpace && proj.spaceName !== selectedSpace) return false;
          if (selectedFolder && proj.folderName !== selectedFolder) return false;
          return true;
        });
        if (!hasMatching) return false;
      }
      return true;
    });
  }, [scopedState, memberSearch, selectedSpace, selectedFolder]);

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

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader
        secondsLeft={secondsLeft}
        status={status}
        statusText={statusText}
        onRefresh={loadData}
        refreshing={refreshing}
        userEmail={sessionInfo?.email ?? null}
        isAdmin={isAdmin}
        onSignOut={signOut}
      />

      <main className="flex-1 px-6 py-6 max-w-[1600px] mx-auto w-full">
        {!scopedState ? (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                API Error: {error} — showing mock data as fallback.
              </div>
            )}
            {!state && (
              <div className="text-center text-muted-foreground py-16">Loading data from ClickUp...</div>
            )}
          </div>
        ) : (
          <>
            {!isAdmin && currentMember && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-foreground">
                You are signed in as <span className="font-bold">{currentMember.name}</span> — showing your
                tasks only. <span className="text-muted-foreground">× {scopedState.tasks.length}</span>
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                API Error: {error} — showing mock data as fallback.
              </div>
            )}

            <StatsGrid state={scopedState} />

            {/* Filters */}
            <div className="flex gap-2 flex-wrap mb-4">
              <select
                value={selectedSpace ?? ""}
                onChange={e => { setSelectedSpace(e.target.value || null); setSelectedFolder(null); }}
                className="rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">All spaces</option>
                {scopedState.spaces.map(s => <option key={s} value={s}>{s}</option>)}
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
              <SpaceCards projects={scopedState.projects} onSelectSpace={handleSelectSpace} />
            )}

            {/* Level 2: Folders within space */}
            {selectedSpace && !selectedFolder && (
              <FolderCards projects={scopedState.projects} spaceName={selectedSpace} onSelectFolder={handleSelectFolder} />
            )}

            {/* Level 3: Projects within folder */}
            {showProjects && (
              <ProjectCards
                projects={filteredProjects}
                tasks={scopedState.tasks}
              />
            )}

            <TeamCapacity
              members={filteredMembers}
              tasks={scopedState.tasks}
              projects={filteredProjects}
              memberSearch={memberSearch}
              onMemberSearch={setMemberSearch}
              timeEntries={timeEntries}
              onStartTimer={startTimer}
              onStopTimer={stopTimer}
            />

            <TimeTrackingPanel
              entries={timeEntries}
              nowMs={nowMs}
              currentMember={currentMember}
              supabaseReady={supabaseReady}
              onStopEntry={stopTimer}
              onDeleteEntry={deleteEntry}
            />
            {timeError && (
              <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-start gap-2">
                <span className="flex-shrink-0">⚠</span>
                <span>{timeError}</span>
              </div>
            )}
            {timeNotice && !timeError && (
              <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 flex items-start gap-2">
                <span className="flex-shrink-0">✓</span>
                <span>{timeNotice}</span>
              </div>
            )}
          </>
        )}
      </main>

      <DashboardFooter />
    </div>
  );
}