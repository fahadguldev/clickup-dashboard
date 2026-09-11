import { Task, Member, Assignee } from "./types";

const statuses = [
  { status: "to do", type: "open", color: "#9297a1" },
  { status: "in progress", type: "open", color: "#4f8ef7" },
  { status: "in review", type: "open", color: "#8b7bf7" },
  { status: "done", type: "closed", color: "#2ec27e" },
  { status: "blocked", type: "open", color: "#f2545b" },
];

const spaces = [
  { id: "s1", name: "Acme Corp" },
  { id: "s2", name: "TechStart Inc" },
  { id: "s3", name: "GlobalMedia" },
  { id: "s4", name: "FreshFoods" },
];

const folders = [
  { id: "f1", name: "Website Redesign", spaceId: "s1" },
  { id: "f2", name: "Mobile App v2", spaceId: "s1" },
  { id: "f3", name: "API Integration", spaceId: "s2" },
  { id: "f4", name: "Brand Refresh", spaceId: "s3" },
  { id: "f5", name: "E-commerce Platform", spaceId: "s4" },
  { id: "f6", name: "Data Migration", spaceId: "s2" },
];

const members: Member[] = [
  { id: 1, name: "Alex Chen", email: "alex@example.com", profilePicture: null, total: 14, done: 5, open: 9, capacity: { txt: "Overloaded", cls: "destructive" }, projectKeys: new Set() },
  { id: 2, name: "Sarah Kim", email: "sarah@example.com", profilePicture: null, total: 11, done: 7, open: 4, capacity: { txt: "Healthy", cls: "success" }, projectKeys: new Set() },
  { id: 3, name: "Marcus Johnson", email: "marcus@example.com", profilePicture: null, total: 9, done: 3, open: 6, capacity: { txt: "High workload", cls: "warning" }, projectKeys: new Set() },
  { id: 4, name: "Priya Patel", email: "priya@example.com", profilePicture: null, total: 12, done: 8, open: 4, capacity: { txt: "Healthy", cls: "success" }, projectKeys: new Set() },
  { id: 5, name: "James Wilson", email: "james@example.com", profilePicture: null, total: 7, done: 2, open: 5, capacity: { txt: "High workload", cls: "warning" }, projectKeys: new Set() },
  { id: 6, name: "Emma Davis", email: "emma@example.com", profilePicture: null, total: 5, done: 5, open: 0, capacity: { txt: "Available", cls: "secondary" }, projectKeys: new Set() },
  { id: 7, name: "Liam Brown", email: "liam@example.com", profilePicture: null, total: 8, done: 1, open: 7, capacity: { txt: "Overloaded", cls: "destructive" }, projectKeys: new Set() },
];

function generateTasks(): Task[] {
  const tasks: Task[] = [];
  let id = 1;

  const taskDefs = [
    // Website Redesign (f1) - risky
    { name: "Homepage wireframe", folder: "f1", status: 3, due: -2, updated: -1, assignees: [1, 2] },
    { name: "Navigation redesign", folder: "f1", status: 1, due: 3, updated: -3, assignees: [1] },
    { name: "Contact page form", folder: "f1", status: 0, due: -1, updated: -10, assignees: [3] },
    { name: "About page content", folder: "f1", status: 0, due: 5, updated: -5, assignees: [2] },
    { name: "Footer layout update", folder: "f1", status: 1, due: -5, updated: -8, assignees: [1] },
    { name: "Blog listing template", folder: "f1", status: 0, due: 10, updated: -15, assignees: [3] },
    { name: "SEO meta tags", folder: "f1", status: 4, due: 2, updated: -1, assignees: [4] },
    { name: "Image optimization", folder: "f1", status: 1, due: 7, updated: 0, assignees: [2] },

    // Mobile App v2 (f2) - critical, stalled
    { name: "Push notifications", folder: "f2", status: 0, due: -3, updated: -18, assignees: [5] },
    { name: "User profile screen", folder: "f2", status: 0, due: 1, updated: -14, assignees: [7] },
    { name: "Settings page", folder: "f2", status: 0, due: 6, updated: -12, assignees: [5, 7] },
    { name: "Onboarding flow", folder: "f2", status: 0, due: 12, updated: -16, assignees: [7] },

    // API Integration (f3) - on track
    { name: "REST endpoints", folder: "f3", status: 3, due: -1, updated: 0, assignees: [3, 4] },
    { name: "Auth middleware", folder: "f3", status: 3, due: 1, updated: 0, assignees: [4] },
    { name: "Rate limiting", folder: "f3", status: 1, due: 4, updated: -1, assignees: [3] },
    { name: "Webhook handler", folder: "f3", status: 2, due: 6, updated: 0, assignees: [3] },
    { name: "API documentation", folder: "f3", status: 0, due: 10, updated: -2, assignees: [4] },
    { name: "Load testing", folder: "f3", status: 0, due: 14, updated: -4, assignees: [3] },

    // Brand Refresh (f4) - at risk
    { name: "Logo variations", folder: "f4", status: 3, due: -1, updated: -1, assignees: [6] },
    { name: "Color palette final", folder: "f4", status: 1, due: -2, updated: -6, assignees: [6] },
    { name: "Typography guide", folder: "f4", status: 0, due: 3, updated: -9, assignees: [2] },
    { name: "Brand guidelines doc", folder: "f4", status: 0, due: 8, updated: -11, assignees: [6] },
    { name: "Social media templates", folder: "f4", status: 0, due: 12, updated: -7, assignees: [2] },

    // E-commerce Platform (f5) - on track
    { name: "Product listing page", folder: "f5", status: 3, due: -1, updated: 0, assignees: [1, 4] },
    { name: "Shopping cart", folder: "f5", status: 3, due: 2, updated: 0, assignees: [1] },
    { name: "Checkout flow", folder: "f5", status: 1, due: 5, updated: -1, assignees: [1, 4] },
    { name: "Payment integration", folder: "f5", status: 2, due: 8, updated: 0, assignees: [4] },
    { name: "Order confirmation", folder: "f5", status: 0, due: 11, updated: -3, assignees: [1] },
    { name: "Admin dashboard", folder: "f5", status: 0, due: 15, updated: -2, assignees: [4] },

    // Data Migration (f6) - at risk
    { name: "Schema mapping", folder: "f6", status: 3, due: -1, updated: 0, assignees: [3] },
    { name: "Transform scripts", folder: "f6", status: 1, due: -4, updated: -7, assignees: [3, 5] },
    { name: "Validation checks", folder: "f6", status: 0, due: 2, updated: -8, assignees: [5] },
    { name: "Rollback plan", folder: "f6", status: 0, due: 5, updated: -13, assignees: [3] },
    { name: "Staging environment test", folder: "f6", status: 0, due: 9, updated: -5, assignees: [5] },
  ];

  for (const def of taskDefs) {
    const folder = folders.find(f => f.id === def.folder)!;
    const space = spaces.find(s => s.id === folder.spaceId)!;
    const now = Date.now();
    tasks.push({
      id: String(id++),
      name: def.name,
      url: `https://app.clickup.com/task/${id}`,
      status: statuses[def.status],
      due_date: def.due > 0 ? String(now + def.due * 86400000) : String(now + def.due * 86400000),
      date_updated: def.updated === 0 ? String(now) : String(now + def.updated * 86400000),
      assignees: def.assignees.map(aid => {
        const m = members.find(mem => mem.id === aid);
        return m ? { id: m.id, username: m.name, email: m.email, profilePicture: m.profilePicture } : null;
      }).filter(Boolean) as Assignee[],
      folder: { id: folder.id, name: folder.name },
      project: null,
      list: { id: "l" + id, name: folder.name },
      space: { id: space.id, name: space.name },
    });
  }

  return tasks;
}

export function getMockTasks(): Task[] {
  return generateTasks();
}

export function getMockMembers(): typeof members {
  return members;
}
