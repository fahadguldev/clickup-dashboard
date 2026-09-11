export type HealthStatus = "critical" | "risk" | "track";

export interface Assignee {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
}

export interface TaskStatus {
  status: string;
  type: string;
  color: string;
}

export interface Task {
  id: string;
  name: string;
  url: string;
  status: TaskStatus;
  due_date: string | null;
  date_updated: string | null;
  assignees: Assignee[];
  folder: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  list: { id: string; name: string } | null;
  space: { id: string; name: string } | null;
}

export interface Project {
  key: string;
  name: string;
  folderName: string;
  spaceName: string;
  total: number;
  done: number;
  open: number;
  overdue: number;
  health: HealthStatus;
  progress: number;
  assigneeIds: Set<number>;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  profilePicture: string | null;
  total: number;
  done: number;
  open: number;
  capacity: { txt: string; cls: string };
  projectKeys: Set<string>;
}

export interface DashboardState {
  tasks: Task[];
  projects: Project[];
  members: Member[];
  total: number;
  done: number;
  open: number;
  progress: number;
  spaces: string[];
  folders: string[];
  criticalProjects: number;
  riskProjects: number;
  overloadedCount: number;
  overall: HealthStatus;
}
