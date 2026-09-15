"use client";

import { Play, Pause } from "lucide-react";

interface TimerButtonProps {
  isRunning: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function TimerButton({ isRunning, onToggle, disabled }: TimerButtonProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      disabled={disabled}
      title={isRunning ? "Stop timer" : "Start timer"}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border text-sm transition-colors disabled:opacity-40 ${
        isRunning
          ? "bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25"
          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
      }`}
    >
      {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
    </button>
  );
}