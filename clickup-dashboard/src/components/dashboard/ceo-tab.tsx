"use client";

import { DashboardState } from "@/lib/types";
import { StatsGrid } from "./stats-grid";
import { AttentionSection } from "./attention-section";
import { ProjectCards } from "./project-cards";
import { TeamCapacity } from "./team-capacity";
import { DeliveryRisks } from "./delivery-risks";
import { ClientHealth } from "./client-health";

interface CEOTabProps {
  state: DashboardState;
  onSelectProject: (key: string) => void;
}

export function CEOTab({ state, onSelectProject }: CEOTabProps) {
  return (
    <>
      <StatsGrid state={state} />
      <AttentionSection problems={state.problems} />
      <ProjectCards projects={state.projects} onSelectProject={onSelectProject} />
      <TeamCapacity members={state.members} />
      <DeliveryRisks state={state} />
      <ClientHealth projects={state.projects} />
    </>
  );
}
