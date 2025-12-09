"use client";

import {
  Popover,
  ActionIcon,
  Indicator,
  Text,
  Group,
  Stack,
  ThemeIcon,
  Button,
  Divider,
  Box,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconBell,
  IconPackage,
  IconCreditCard,
  IconAlertCircle,
  IconMail,
  IconUser,
} from "@tabler/icons-react";
import useSWR, { mutate } from "swr";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/actions/supabase/notification";
import { Notification } from "@/actions/supabase/notification";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export function NotificationDropdown() {
  const router = useRouter();

  const { data: notificationData, isLoading } = useSWR(
    "user-notifications",
    () => getUserNotifications(1, 5, "all")
  );

  const notifications = notificationData?.data || [];
  const unreadCount = notificationData?.unread_count || 0;

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    mutate("user-notifications");
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.notification_is_read) {
      await markNotificationAsRead(notification.notification_id);
      mutate("user-notifications");
    }
    // Redirect based on type if needed
    // if (notification.notification_item_type_id === 'NIT-MAIL') router.push('/mail');
  };

  const getIcon = (type: string | null) => {
    switch (type) {
      case "NIT-MAIL":
        return (
          <ThemeIcon color="green" variant="light" radius="xl" size="lg">
            <IconMail size={18} />
          </ThemeIcon>
        );
      case "NIT-PACKAGE":
        return (
          <ThemeIcon color="blue" variant="light" radius="xl" size="lg">
            <IconPackage size={18} />
          </ThemeIcon>
        );
      case "NIT-BILLING":
        return (
          <ThemeIcon color="orange" variant="light" radius="xl" size="lg">
            <IconCreditCard size={18} />
          </ThemeIcon>
        );
      case "NIT-USER":
        return (
          <ThemeIcon color="violet" variant="light" radius="xl" size="lg">
            <IconUser size={20} />
          </ThemeIcon>
        );
      default:
        return (
          <ThemeIcon color="gray" variant="light" radius="xl" size="lg">
            <IconAlertCircle size={18} />
          </ThemeIcon>
        );
    }
  };

  return (
    <Popover width={350} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <Indicator
          color="red"
          size={8}
          offset={4}
          disabled={unreadCount === 0}
          processing={unreadCount > 0}
        >
          <ActionIcon variant="subtle" color="gray" size="lg">
            <IconBell size={20} stroke={1.5} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <div style={{ padding: "16px" }}>
          <Group justify="space-between" mb="md">
            <Text fw={700} size="sm">
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Text
                size="xs"
                c="blue"
                style={{ cursor: "pointer" }}
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </Text>
            )}
          </Group>

          {isLoading && (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          )}

          {!isLoading && notifications.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              No notifications yet.
            </Text>
          )}

          {!isLoading && notifications.length > 0 && (
            <Stack gap="md">
              {notifications.map((item) => (
                <Group
                  key={item.notification_id}
                  align="flex-start"
                  wrap="nowrap"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleNotificationClick(item)}
                >
                  {getIcon(item.notification_item_type_id)}
                  <div style={{ flex: 1 }}>
                    <Group justify="space-between">
                      <Text size="sm" fw={600} lineClamp={1}>
                        {item.notification_title}
                      </Text>
                      {!item.notification_is_read && (
                        <Box
                          w={8}
                          h={8}
                          bg="blue"
                          style={{ borderRadius: "50%", flexShrink: 0 }}
                        />
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {item.notification_message}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {formatDistanceToNow(
                        new Date(item.notification_created_at),
                        { addSuffix: true }
                      )}
                    </Text>
                  </div>
                </Group>
              ))}
            </Stack>
          )}
        </div>
        <Divider />
        <Button
          variant="subtle"
          fullWidth
          size="sm"
          onClick={() => router.push("/notifications")}
        >
          View all notifications
        </Button>
      </Popover.Dropdown>
    </Popover>
  );
}
