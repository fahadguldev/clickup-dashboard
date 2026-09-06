import { Task, Project, Member, Problem, DashboardState, HealthStatus } from "./types";

const DAY = 86400000;

export function healthOf(status: HealthStatus): { txt: string; cls: string } {
  if (status === "critical") return { txt: "Critical", cls: "destructive" };
  if (status === "risk") return { txt: "At Risk", cls: "warning" };
  return { txt: "On Track", cls: "success" };
}

function projectHealth(p: { total: number; done: number; overdue: number; stale: number }): HealthStatus {
  if (p.total === 0) return "critical";
  if (p.done === 0) return "critical";
  if (p.overdue > 0 || p.stale >= 2 || p.done / p.total < 0.5) return "risk";
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

  for (const t of tasks) {
    const folderName = t.folder?.name || t.project?.name || t.list?.name || "Unnamed";
    const spaceName = t.space?.name || "Unknown";
    const key = t.folder ? `folder:${t.folder.id}` : `list:${t.list?.id}`;

    let p = projectMap.get(key);
    if (!p) {
      p = {
        key, name: folderName, spaceName,
        total: 0, done: 0, open: 0,
        overdue: 0, dueSoon: 0, stale: 0,
        health: "track", progress: 0,
      };
      projectMap.set(key, p);
    }

    const closed = t.status?.type === "closed";
    const now = Date.now();
    p.total++;
    if (closed) p.done++; else p.open++;
    if (!closed) {
      if (t.due_date && Number(t.due_date) < now) p.overdue++;
      if (t.due_date && Number(t.due_date) > now && Number(t.due_date) - now < 7 * DAY) p.dueSoon++;
      if (!t.date_updated || now - Number(t.date_updated) > 7 * DAY) p.stale++;
    }

    for (const a of t.assignees || []) {
      if (!memberMap.has(a.id)) {
        memberMap.set(a.id, {
          id: a.id, name: a.username, email: a.email,
          profilePicture: a.profilePicture,
          total: 0, done: 0, open: 0,
          capacity: { txt: "", cls: "" },
        });
      }
      const m = memberMap.get(a.id)!;
      m.total++;
      if (closed) { m.done++; } else { m.open++; }
    }
  }

  const projects = Array.from(projectMap.values()).map(p => {
    const proj = { ...p, health: projectHealth(p), progress: p.total === 0 ? 0 : Math.round((p.done / p.total) * 100) };
    return proj;
  }).sort((a, b) => {
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

  const problems = buildProblems(projects, members, tasks);

  return {
    tasks, projects, members, problems,
    total, done, open: total - done,
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
    criticalProjects, riskProjects, overloadedCount, overall,
  };
}

function buildProblems(projects: Project[], members: Member[], tasks: Task[]): Problem[] {
  const problems: Problem[] = [];

  for (const p of projects.filter(p => p.health === "critical")) {
    problems.push({
      sev: "critical", icon: "🔴",
      title: `Stalled project: ${p.name}`,
      body: `${p.done === 0 ? "0 of " + p.total + " tasks done" : p.overdue + " overdue, " + p.open + " open"} · ${p.spaceName}`,
      type: "project",
    });
  }

  for (const p of projects.filter(p => p.health === "risk")) {
    problems.push({
      sev: "risk", icon: "🟡",
      title: `At risk: ${p.name}`,
      body: `${p.overdue > 0 ? p.overdue + " overdue · " : ""}${p.done}/${p.total} done (${p.progress}%)${p.stale >= 2 ? " · " + p.stale + " stale" : ""} · ${p.spaceName}`,
      type: "project",
    });
  }

  for (const m of members.filter(m => m.capacity.cls === "destructive")) {
    problems.push({
      sev: "risk", icon: "🔴",
      title: `${m.name} is overloaded`,
      body: `${m.open} open tasks of ${m.total} assigned — consider redistributing work.`,
      type: "member",
    });
  }

  const now = Date.now();
  const overdueTasks = tasks.filter(t => t.status?.type !== "closed" && t.due_date && Number(t.due_date) < now);
  if (overdueTasks.length > 0) {
    problems.push({
      sev: "risk", icon: "⏰",
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
      body: overdueTasks.slice(0, 4).map(t => t.name).join(" · "),
      type: "tasks",
    });
  }

  const dueSoon = tasks.filter(t => t.status?.type !== "closed" && t.due_date && Number(t.due_date) > now && Number(t.due_date) - now < 7 * DAY);
  if (dueSoon.length > 0) {
    problems.push({
      sev: "risk", icon: "📅",
      title: `${dueSoon.length} deliverable${dueSoon.length > 1 ? "s" : ""} within 7 days`,
      body: dueSoon.slice(0, 4).map(t => t.name).join(" · "),
      type: "tasks",
    });
  }

  const stale = tasks.filter(t => t.status?.type !== "closed" && t.date_updated && now - Number(t.date_updated) > 14 * DAY);
  if (stale.length > 0) {
    problems.push({
      sev: "critical", icon: "🧊",
      title: `${stale.length} task${stale.length > 1 ? "s" : ""} untouched for 14+ days`,
      body: stale.slice(0, 4).map(t => t.name).join(" · "),
      type: "tasks",
    });
  }

  const sevOrder = { critical: 0, risk: 1 };
  return problems.sort((a, b) => (sevOrder[a.sev] ?? 2) - (sevOrder[b.sev] ?? 2)).slice(0, 8);
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
