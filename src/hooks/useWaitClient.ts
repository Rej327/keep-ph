"use client";

import { useEffect, useState } from "react";

/**
 * Waits until the component has mounted on the client
 * before allowing rendering of client-dependent logic
 * (e.g., color scheme, localStorage, window, etc.)
 */
export function useWaitClient() {
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  return isClientReady;
}
