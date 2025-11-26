"use client";

import {
  TextInput,
  ActionIcon,
  Indicator,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBell,
  IconSettings,
  IconSearch,
  IconMenu2,
} from "@tabler/icons-react";
import classes from "./TopBar.module.css";

type UseClaims = {
  email?: string;
  avatar_url?: string;
  full_name?: string;
};

type TopbarProps = {
  user?: UseClaims | null;
  type?: "admin" | "customer";
  onMenuClick?: () => void;
};

export function Topbar({ user, type = "customer", onMenuClick }: TopbarProps) {
  return (
    <div className={classes.header}>
      {type === "customer" && (
        <UnstyledButton onClick={onMenuClick} mr="md">
          <IconMenu2 size={24} />
        </UnstyledButton>
      )}

      <div className={classes.search}>
        <TextInput
          placeholder={type === "admin" ? "Search..." : "Search mail..."}
          leftSection={<IconSearch size={16} stroke={1.5} />}
          size="md"
          variant="filled"
          radius="md"
        />
      </div>

      <div className={classes.actions}>
        <Indicator color="red" size={8} offset={4} disabled={false} processing>
          <ActionIcon variant="subtle" color="gray" size="lg">
            <IconBell size={20} stroke={1.5} />
          </ActionIcon>
        </Indicator>
        <ActionIcon variant="subtle" color="gray" size="lg">
          <IconSettings size={20} stroke={1.5} />
        </ActionIcon>
      </div>
    </div>
  );
}
