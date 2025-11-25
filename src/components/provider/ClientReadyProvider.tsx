"use client";

import { ReactNode } from "react";
import { useWaitClient } from "@/hooks/useWaitClient";

export function ClientReadyProvider({ children }: { children: ReactNode }) {
  const isClientReady = useWaitClient();

  if (!isClientReady) return null;

  return <>{children}</>;
}
