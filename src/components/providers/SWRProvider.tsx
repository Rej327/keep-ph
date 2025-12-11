"use client";

import { SWRConfig } from "swr";

export default function SWRProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 5000,
        errorRetryCount: 2,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
