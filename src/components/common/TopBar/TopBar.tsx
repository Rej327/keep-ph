"use client";

import { TextInput, UnstyledButton } from "@mantine/core";
import { IconSearch, IconMenu2 } from "@tabler/icons-react";
import classes from "./TopBar.module.css";
import { User } from "@supabase/supabase-js";
import { NotificationDropdown } from "./NotificationDropdown";
import { SettingsDropdown } from "./SettingsDropdown";
import useAuthStore from "@/zustand/stores/useAuthStore";

type TopbarProps = {
  user?: User | null;
  type?: boolean;
  onMenuClick?: () => void;
};

export function Topbar({ type = false, onMenuClick }: TopbarProps) {
  const { user } = useAuthStore();
  return (
    <div className={classes.header}>
      <UnstyledButton onClick={onMenuClick} mr="md" hiddenFrom="sm">
        <IconMenu2 size={24} />
      </UnstyledButton>

      <div className={classes.search} style={{ flex: 1 }}>
        <TextInput
          placeholder={type === true ? "Search..." : "Search mail..."}
          leftSection={<IconSearch size={16} stroke={1.5} />}
          size="md"
          variant="filled"
          radius="md"
          w="100%"
        />
      </div>

      <div className={classes.actions}>
        <NotificationDropdown />
        <SettingsDropdown user={user || null} type={type} />
      </div>
    </div>
  );
}
