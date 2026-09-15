import { Task, Project, Member, DashboardState, HealthStatus, TimeEntry } from "./types";

export function healthOf(status: HealthStatus): { txt: string; cls: string } {
  if (status === "critical") return { txt: "Critical", cls: "destructive" };
  if (status === "risk") return { txt: "At Risk", cls: "warning" };
  return { txt: "On Track", cls: "success" };
}

function projectHealth(p: { total: number; done: number; overdue: number }): HealthStatus {
  if (p.total === 0) return "critical";
  if (p.done === 0) return "critical";
  if (p.overdue > 0 || p.done / p.total < 0.5) return "risk";
  return "track";
}

function capacityOf(openCount: number): { txt: string; cls: string } {
  if (openCount === 0) return { txt: "Available", cls: "secondary" };
  if (openCount <= 4) return { txt: "Healthy", cls: "success" };
  if (openCount <= 8) return { txt: "High workload", cls: "warning" };
  return { txt: "Overloaded", cls: "destructive" };
}

export function computeState(tasks: Task[]): DashboardState {
  const projectMap = new Map<string, Project>();
  const memberMap = new Map<number, Member>();
  const spaceSet = new Set<string>();
  const folderSet = new Set<string>();

  for (const t of tasks) {
    const listName = t.list?.name || "Unnamed";
    const folderName = t.folder?.name || "Uncategorized";
    const spaceName = t.space?.name || "Unknown";
    const key = t.list?.id ? `list:${t.list.id}` : t.folder?.id ? `folder:${t.folder.id}` : `unknown`;

    if (spaceName) spaceSet.add(spaceName);
    if (folderName) folderSet.add(folderName);

    let p = projectMap.get(key);
    if (!p) {
      p = {
        key, name: listName, folderName, spaceName,
        total: 0, done: 0, open: 0, overdue: 0,
        health: "track", progress: 0,
        assigneeIds: new Set(),
      };
      projectMap.set(key, p);
    }

    const closed = t.status?.type === "closed";
    const now = Date.now();
    p.total++;
    if (closed) p.done++; else p.open++;
    if (!closed && t.due_date && Number(t.due_date) < now) p.overdue++;

    for (const a of t.assignees || []) {
      p.assigneeIds.add(a.id);

      if (!memberMap.has(a.id)) {
        memberMap.set(a.id, {
          id: a.id, name: a.username, email: a.email,
          profilePicture: a.profilePicture,
          total: 0, done: 0, open: 0,
          capacity: { txt: "", cls: "" },
          projectKeys: new Set(),
        });
      }
      const m = memberMap.get(a.id)!;
      m.total++;
      m.projectKeys.add(key);
      if (closed) { m.done++; } else { m.open++; }
    }
  }

  const projects = Array.from(projectMap.values()).map(p => ({
    ...p,
    health: projectHealth(p),
    progress: p.total === 0 ? 0 : Math.round((p.done / p.total) * 100),
  })).sort((a, b) => {
    const order: Record<string, number> = { critical: 0, risk: 1, track: 2 };
    return (order[a.health] ?? 3) - (order[b.health] ?? 3) || b.total - a.total;
  });

  const members = Array.from(memberMap.values()).map(m => ({
    ...m,
    capacity: capacityOf(m.open),
  })).sort((a, b) => b.open - a.open);

  const total = tasks.length;
  const done = tasks.filter(t => t.status?.type === "closed").length;
  const criticalProjects = projects.filter(p => p.health === "critical").length;
  const riskProjects = projects.filter(p => p.health === "risk").length;
  const overloadedCount = members.filter(m => m.capacity.cls === "destructive").length;

  let overall: HealthStatus = "track";
  if (criticalProjects > 0) overall = "critical";
  else if (riskProjects > 0 || overloadedCount > 0) overall = "risk";

  return {
    tasks, projects, members,
    total, done, open: total - done,
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
    spaces: Array.from(spaceSet).sort(),
    folders: Array.from(folderSet).sort(),
    criticalProjects, riskProjects, overloadedCount, overall,
  };
}

export function formatDate(ms: string | null): string {
  if (!ms) return "";
  const d = new Date(Number(ms));
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Time helpers ─────────────────────────────────────────────────────────────

export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatElapsed(startMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function startOfDay(d: Date): number {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r.getTime();
}

function startOfWeek(d: Date): number {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? 6 : day - 1;
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r.getTime();
}

function startOfMonth(d: Date): number {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r.getTime();
}

export interface TimeSummary {
  today: number;   // seconds
  week: number;
  month: number;
  total: number;
  activeCount: number;
}

export function timeSummary(entries: TimeEntry[], nowMs: number): TimeSummary {
  const now = new Date(nowMs);
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  let today = 0, week = 0, month = 0, total = 0, activeCount = 0;

  for (const e of entries) {
    const end = e.endTime ?? nowMs;
    const dur = e.durationSeconds ?? Math.max(0, Math.floor((end - e.startTime) / 1000));

    if (e.endTime === null) activeCount++;
    total += dur;
    if (e.startTime >= dayStart) today += dur;
    if (e.startTime >= weekStart) week += dur;
    if (e.startTime >= monthStart) month += dur;
  }

  return { today, week, month, total, activeCount };
}

export interface MemberTimeHours {
  memberId: number;
  memberName: string;
  today: number;
  week: number;
  month: number;
}

export function hoursByMember(entries: TimeEntry[], nowMs: number): MemberTimeHours[] {
  const now = new Date(nowMs);
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const map = new Map<number, MemberTimeHours>();

  for (const e of entries) {
    if (!map.has(e.memberId)) {
      map.set(e.memberId, { memberId: e.memberId, memberName: e.memberName, today: 0, week: 0, month: 0 });
    }
    const m = map.get(e.memberId)!;
    const end = e.endTime ?? nowMs;
    const dur = e.durationSeconds ?? Math.max(0, Math.floor((end - e.startTime) / 1000));
    if (e.startTime >= dayStart) m.today += dur;
    if (e.startTime >= weekStart) m.week += dur;
    if (e.startTime >= monthStart) m.month += dur;
  }

  return Array.from(map.values()).sort((a, b) => b.week - a.week);
}

export interface ProjectTimeHours {
  projectKey: string;
  projectName: string;
  today: number;
  week: number;
  month: number;
}

export function hoursByProject(entries: TimeEntry[], nowMs: number): ProjectTimeHours[] {
  const now = new Date(nowMs);
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const map = new Map<string, ProjectTimeHours>();

  for (const e of entries) {
    if (!map.has(e.projectKey)) {
      map.set(e.projectKey, { projectKey: e.projectKey, projectName: e.projectName, today: 0, week: 0, month: 0 });
    }
    const p = map.get(e.projectKey)!;
    const end = e.endTime ?? nowMs;
    const dur = e.durationSeconds ?? Math.max(0, Math.floor((end - e.startTime) / 1000));
    if (e.startTime >= dayStart) p.today += dur;
    if (e.startTime >= weekStart) p.week += dur;
    if (e.startTime >= monthStart) p.month += dur;
  }

  return Array.from(map.values()).sort((a, b) => b.week - a.week);
}
