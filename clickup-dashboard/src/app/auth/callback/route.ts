import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

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

interface CampaignMember {
  id: number;
  username?: string;
  email?: string;
  role?: number;
  profilePicture?: string | null;
  inactive?: boolean;
}

interface TeamMemberEnvelope {
  user?: CampaignMember;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const sb = supabaseServer();
  if (!sb) return NextResponse.redirect(new URL("/login?error=not-configured", req.url));

  const { error } = await sb.auth.exchangeCodeForSession(code ?? "");
  if (error) return NextResponse.redirect(new URL("/login?error=auth-failed", req.url));

  const {
    data: { user },
  } = await sb.auth.getUser();
  const email = user?.email?.toLowerCase();

  if (!email) return NextResponse.redirect(new URL("/login?error=no-email", req.url));

  // Match this Supabase user to a ClickUp workspace member by email
  const token = process.env.CLICK_UP_API;
  let clickupMember: CampaignMember | null = null;
  let isAdmin = false;

  if (token) {
    try {
      const teamData = (await api("/team", token)) as { teams: { members?: TeamMemberEnvelope[] }[] };
      const members = teamData.teams?.[0]?.members ?? [];
      const active = members
        .map((m) => m.user)
        .filter((m): m is CampaignMember => !!m && m.inactive !== true);
      clickupMember = active.find(
        (m) => m.email?.toLowerCase() === email
      ) ?? null;
      isAdmin = clickupMember?.role === 1 || clickupMember?.role === 2;
    } catch {
      // ClickUp lookup failed - allow login but no role/permissions yet
    }
  }

  // Store member identity in user metadata for future API calls
  const { error: metaErr } = await sb.auth.updateUser({
    data: {
      clickup_member_id: clickupMember?.id ?? null,
      clickup_member_name: clickupMember?.username ?? null,
      clickup_admin: isAdmin,
    },
  });
  if (metaErr) return NextResponse.redirect(new URL("/login?error=meta-failed", req.url));

  // If the email is not found in ClickUp, redirect to login with a clear message
  if (!clickupMember) {
    const bad = new URL("/login?error=not-a-member", req.url);
    return NextResponse.redirect(bad);
  }

  const dest = new URL(next, req.url);
  return NextResponse.redirect(dest);
}