"use client";

import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const dark = colorScheme === "dark";

  return (
    <ActionIcon
      variant="outline"
      color={dark ? "yellow" : "#1966D1"}
      onClick={() => setColorScheme(dark ? "light" : "dark")}
      title={dark ? "Light Mode" : "Dark Mode"}
      size="md"
    >
      {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
