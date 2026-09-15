import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface EntryRow {
  id: string;
  task_id: string;
  task_name: string;
  task_url: string | null;
  member_id: number;
  member_name: string;
  member_email: string | null;
  member_pic: string | null;
  project_key: string;
  project_name: string;
  folder_name: string;
  space_name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
}

function rowToEntry(r: EntryRow) {
  return {
    id: r.id,
    taskId: r.task_id,
    taskName: r.task_name,
    taskUrl: r.task_url,
    memberId: r.member_id,
    memberName: r.member_name,
    memberEmail: r.member_email,
    memberPic: r.member_pic,
    projectKey: r.project_key,
    projectName: r.project_name,
    folderName: r.folder_name,
    spaceName: r.space_name,
    startTime: new Date(r.start_time).getTime(),
    endTime: r.end_time ? new Date(r.end_time).getTime() : null,
    durationSeconds: r.duration_seconds,
  };
}

function err(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}

async function sessionUser() {
  const sb = supabaseServer();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as {
    clickup_member_id?: number | null;
    clickup_member_name?: string | null;
    clickup_admin?: boolean;
  };
  return {
    email: (user.email ?? "").toLowerCase(),
    memberId: meta.clickup_member_id ?? null,
    memberName: meta.clickup_member_name ?? user.email ?? "Unknown",
    isAdmin: meta.clickup_admin === true,
  };
}

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return err("Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.", 503);
  }

  const session = await sessionUser();
  if (!session || session.memberId === null) {
    return err("Unauthorized: sign in with a ClickUp-member email first.", 401);
  }

  const { searchParams } = req.nextUrl;
  const taskId = searchParams.get("task_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "500", 10) || 500, 1000);

  let q = supabase!.from("time_entries").select("*").order("start_time", { ascending: false }).limit(limit);
  if (taskId) q = q.eq("task_id", taskId);
  // Non-admins only see their own time entries
  if (!session.isAdmin) q = q.eq("member_id", session.memberId);

  const { data, error } = await q;
  if (error) return err(error.message);
  return NextResponse.json({ entries: (data as EntryRow[]).map(rowToEntry) });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return err("Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.", 503);
  }

  const session = await sessionUser();
  if (!session || session.memberId === null) {
    return err("Unauthorized: sign in with a ClickUp-member email first.", 401);
  }

  const body = await req.json();
  const { action } = body;

  if (action === "start") {
    const { task, project } = body;
    if (!task?.id) return err("task required", 400);

    const { data, error } = await supabase!
      .from("time_entries")
      .insert({
        task_id: task.id,
        task_name: task.name,
        task_url: task.url ?? null,
        // Identity is taken from the session, never from the client
        member_id: session.memberId,
        member_name: session.memberName ?? task.name,
        member_email: session.email,
        member_pic: null,
        project_key: project?.key ?? null,
        project_name: project?.name ?? null,
        folder_name: project?.folder ?? null,
        space_name: project?.space ?? null,
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return err(error.message);
    return NextResponse.json({ entry: rowToEntry(data as EntryRow) });
  }

  if (action === "stop") {
    const { entryId } = body;
    if (!entryId) return err("entryId required", 400);

    const now = new Date().toISOString();

    const { data: existing, error: fetchErr } = await supabase!
      .from("time_entries")
      .select("*")
      .eq("id", entryId)
      .single();

    if (fetchErr || !existing) return err("entry not found", 404);
    if (!session.isAdmin && existing.member_id !== session.memberId) {
      return err("You can only stop your own timers.", 403);
    }

    const durationSeconds = Math.round(
      (new Date(now).getTime() - new Date(existing.start_time).getTime()) / 1000
    );

    const { data, error } = await supabase!
      .from("time_entries")
      .update({ end_time: now, duration_seconds: durationSeconds })
      .eq("id", entryId)
      .select()
      .single();

    if (error) return err(error.message);
    return NextResponse.json({ entry: rowToEntry(data as EntryRow) });
  }

  if (action === "delete") {
    const { entryId } = body;
    if (!entryId) return err("entryId required", 400);

    const { data: existing } = await supabase!
      .from("time_entries")
      .select("member_id")
      .eq("id", entryId)
      .single();

    if (existing && !session.isAdmin && existing.member_id !== session.memberId) {
      return err("You can only delete your own entries.", 403);
    }

    const { error } = await supabase!.from("time_entries").delete().eq("id", entryId);
    if (error) return err(error.message);
    return NextResponse.json({ ok: true });
  }

  return err("Invalid action: " + action, 400);
}