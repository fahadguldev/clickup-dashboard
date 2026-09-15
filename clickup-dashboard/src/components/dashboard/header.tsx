"use client";

import { RefreshCw, LogOut } from "lucide-react";

interface DashboardHeaderProps {
  secondsLeft: number;
  status: "ok" | "paused" | "error";
  statusText: string;
  onRefresh: () => void;
  refreshing: boolean;
  userEmail?: string | null;
  isAdmin?: boolean;
  onSignOut?: () => void;
}

export function DashboardHeader({
  secondsLeft, status, statusText, onRefresh, refreshing,
  userEmail, isAdmin, onSignOut,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-6 py-3 max-w-[1600px] mx-auto">
        <h1 className="text-lg font-bold tracking-tight">
          ClickUp <span className="text-primary">Dashboard</span>
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${
                status === "ok" ? "bg-emerald-500 animate-pulse-dot" :
                status === "paused" ? "bg-amber-500" :
                "bg-red-500"
              }`}
            />
            <span>{statusText}</span>
          </div>
          <div className="rounded-full border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            refresh in <span className="font-bold text-foreground">{secondsLeft}s</span>
          </div>
          {userEmail && (
            <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{userEmail}</span>
              {isAdmin && <span className="rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[10px] font-bold">ADMIN</span>}
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}