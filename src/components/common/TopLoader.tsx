"use client";

import NextTopLoader from "nextjs-toploader";
import { useMantineColorScheme } from "@mantine/core";

export default function TopLoader() {
  const { colorScheme } = useMantineColorScheme();

  return (
    <NextTopLoader
      showSpinner={false}
      color={colorScheme === "dark" ? "#ffffff" : "#1966D1"}
      height={3}
      crawlSpeed={200}
      shadow="0 0 10px rgba(0,0,0,0.2)"
    />
  );
}
