import { NextResponse } from "next/server";

const BASE = "https://api.clickup.com/api/v2";

async function api(path: string, token: string, attempts = 3): Promise<unknown> {
  let lastErr: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(BASE + path, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      });
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, (i + 2) * 3000));
        lastErr = new Error("rate limited");
        continue;
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt.slice(0, 200)}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      await new Promise(r => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function GET() {
  const token = process.env.CLICK_UP_API;
  if (!token) {
    return NextResponse.json({ error: "CLICK_UP_API env variable not set" }, { status: 500 });
  }

  try {
    const teamData = (await api("/team", token)) as { teams: { id: string }[] };
    const team = teamData.teams[0];
    if (!team) {
      return NextResponse.json({ error: "No teams found for this API token" }, { status: 404 });
    }

    const spacesData = (await api(`/team/${team.id}/space`, token)) as { spaces: { id: string; name: string }[] };
    const spaces = spacesData.spaces || [];
    const spaceNameById: Record<string, string> = {};
    for (const s of spaces) spaceNameById[s.id] = s.name;

    const tasks: unknown[] = [];
    let page = 0;
    let last = false;
    while (!last && page < 20) {
      const data = (await api(
        `/team/${team.id}/task?include_closed=true&subtasks=false&page=${page}`,
        token
      )) as { tasks: unknown[]; last_page?: boolean };
      tasks.push(...(data.tasks || []));
      last = data.last_page === true || (data.tasks?.length ?? 0) < 100 || (data.tasks?.length ?? 0) === 0;
      page++;
    }

    return NextResponse.json({ tasks, spaceNameById });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
