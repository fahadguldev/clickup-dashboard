"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseBrowser, authConfigured } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  "not-configured": "Auth is not configured on the server.",
  "auth-failed": "Could not complete sign in. Please try the new link from your email.",
  "no-email": "Could not read your email from the session.",
  "meta-failed": "Could not save your profile. Try again.",
  "not-a-member": "This email is not a member of the ClickUp workspace. Use the email that is registered in ClickUp.",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) {
      setStatus("error");
      setMessage(ERROR_MESSAGES[err] ?? err);
    }
  }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.auth.getSession().then(res => {
      if (res.data?.session) router.replace("/");
    });
  }, [router]);

  if (!authConfigured()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <h1 className="text-lg font-bold mb-2">Auth not configured</h1>
            <p className="text-sm text-muted-foreground">
              Add{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              to <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env.local</code> (from Supabase
              Settings → API → anon public key) and restart the server.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const sb = supabaseBrowser();
    if (!sb) return;

    setStatus("sending");
    setMessage("");

    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your inbox for the login link.");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h1 className="text-lg font-bold mb-1">ClickUp Dashboard</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Sign in with your <span className="font-semibold text-foreground">ClickUp email</span> to start
            tracking time on your tasks.
          </p>

          {status === "sent" ? (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              ✓ {message}
              <p className="text-xs text-emerald-400/70 mt-1">
                No account yet? Your account is created automatically when you check your inbox and click the
                link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {status === "sending" ? "Sending link..." : "Email me a login link"}
              </button>
              {status === "error" && (
                <p className="text-xs text-red-400">⚠ {message}</p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}