"use client";

import { Menu, ActionIcon, Text, Avatar, rem, Box } from "@mantine/core";
import {
  IconSettings,
  IconUser,
  IconCreditCard,
  IconLogout,
  IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import useSWR from "swr";
import { User } from "@supabase/supabase-js";
import { getUser } from "@/actions/supabase/get";

export function SettingsDropdown({
  user,
  type,
}: {
  user?: User | null;
  type?: boolean;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const topLoader = useTopLoader();

  const { data: userDetails } = useSWR(
    user ? ["user-user", user.id] : null,
    ([, userId]) => getUser(userId)
  );

  const handleLogout = async () => {
    try {
      topLoader.start();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error); //Todo: insert in error table when error
      topLoader.remove();
    }
  };

  const handleRouteProfile = () => {
    topLoader.start();
    router.push(type ? "/admin/profile" : "/customer/profile");
    topLoader.remove();
  };

  return (
    <Menu shadow="md" width={250} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" size="lg">
          <IconSettings size={20} stroke={1.5} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={
            <Avatar
              src={userDetails?.user_avatar_bucket_path}
              alt={`${userDetails?.user_first_name} ${userDetails?.user_last_name} profile picture`}
              radius="xl"
              size="md"
            />
          }
          style={{ padding: "12px" }}
        >
          <Box>
            <Text size="sm" fw={500}>
              {userDetails?.user_first_name}
            </Text>
            <Text size="xs" c="dimmed">
              {userDetails?.user_email}
            </Text>
          </Box>
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconUser style={{ width: rem(16), height: rem(16) }} />}
          onClick={handleRouteProfile}
        >
          My Profile
        </Menu.Item>
        <Menu.Item
          leftSection={
            <IconCreditCard style={{ width: rem(16), height: rem(16) }} />
          }
        >
          Billing
        </Menu.Item>
        <Menu.Item
          leftSection={
            <IconAdjustmentsHorizontal
              style={{ width: rem(16), height: rem(16) }}
            />
          }
        >
          Settings
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          color="red"
          leftSection={
            <IconLogout style={{ width: rem(16), height: rem(16) }} />
          }
          onClick={handleLogout}
        >
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
