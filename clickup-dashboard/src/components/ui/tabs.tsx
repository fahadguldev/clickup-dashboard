"use client";

import * as React from "react";

interface TabsContentProps {
  value: string;
  activeTab: string;
  children: React.ReactNode;
}

function TabsContent({ value, activeTab, children }: TabsContentProps) {
  if (value !== activeTab) return null;
  return <div className="mt-2">{children}</div>;
}

export { TabsContent };
