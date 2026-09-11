import { Task, Project, Member, DashboardState, HealthStatus } from "./types";

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
