"use client";

import React, { useState } from "react";
import {
  Container,
  Title,
  Text,
  Group,
  Stack,
  Paper,
  ThemeIcon,
  Button,
  Tabs,
  Box,
  Loader,
  Center,
  ActionIcon,
  Menu,
} from "@mantine/core";
import {
  IconMail,
  IconPackage,
  IconCreditCard,
  IconAlertCircle,
  IconDots,
  IconCheck,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import useSWR, { mutate } from "swr";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  archiveNotification,
} from "@/actions/supabase/notification";
import { formatDistanceToNow } from "date-fns";

export default function NotificationClient() {
  const [activeTab, setActiveTab] = useState<string | null>("all");
  const [page] = useState(1);
  const PAGE_SIZE = 20;

  const getFilterType = (tab: string | null) => {
    if (tab === "archived") return "archived";
    if (tab === "unread") return "unread";
    return "all";
  };

  const { data: notificationData, isLoading } = useSWR(
    ["user-notifications-page", activeTab, page],
    () => getUserNotifications(page, PAGE_SIZE, getFilterType(activeTab))
  );

  const notifications = notificationData?.data || [];
  // const totalCount = notificationData?.total_count || 0;

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    mutate(["user-notifications-page", activeTab, page]);
    mutate("user-notifications"); // Update dropdown
  };

  const handleArchive = async (id: string) => {
    await archiveNotification(id);
    mutate(["user-notifications-page", activeTab, page]);
    mutate("user-notifications");
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    mutate(["user-notifications-page", activeTab, page]);
    mutate("user-notifications");
  };

  const getIcon = (type: string | null) => {
    switch (type) {
      case "NIT-MAIL":
        return (
          <ThemeIcon color="green" variant="light" radius="xl" size="lg">
            <IconMail size={20} />
          </ThemeIcon>
        );
      case "NIT-PACKAGE":
        return (
          <ThemeIcon color="blue" variant="light" radius="xl" size="lg">
            <IconPackage size={20} />
          </ThemeIcon>
        );
      case "NIT-BILLING":
        return (
          <ThemeIcon color="orange" variant="light" radius="xl" size="lg">
            <IconCreditCard size={20} />
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
            <IconAlertCircle size={20} />
          </ThemeIcon>
        );
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>Notifications</Title>
            <Text c="dimmed">Stay updated with your latest activities</Text>
          </div>
          <Button
            variant="light"
            leftSection={<IconCheck size={16} />}
            onClick={handleMarkAllRead}
            disabled={notifications.length === 0}
          >
            Mark all as read
          </Button>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="all">All</Tabs.Tab>
            <Tabs.Tab value="unread">Unread</Tabs.Tab>
            <Tabs.Tab value="archived">Archived</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab || "all"} pt="md">
            {isLoading && (
              <Center py={50}>
                <Loader />
              </Center>
            )}

            {!isLoading && notifications.length === 0 && (
              <Paper p="xl" withBorder ta="center" c="dimmed">
                <Stack align="center" gap="xs">
                  <ThemeIcon size={48} variant="light" color="gray" radius="xl">
                    <IconAlertCircle size={24} />
                  </ThemeIcon>
                  <Text>No notifications found</Text>
                </Stack>
              </Paper>
            )}

            {!isLoading && notifications.length > 0 && (
              <Stack gap="sm">
                {notifications.map((item) => (
                  <Paper
                    key={item.notification_id}
                    withBorder
                    p="md"
                    radius="md"
                    bg={item.notification_is_read ? "transparent" : "blue.0"}
                  >
                    <Group wrap="nowrap" align="flex-start">
                      {getIcon(item.notification_item_type_id)}
                      <Box style={{ flex: 1 }}>
                        <Group justify="space-between" mb={4}>
                          <Text fw={item.notification_is_read ? 500 : 700}>
                            {item.notification_title}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {formatDistanceToNow(
                              new Date(item.notification_created_at),
                              { addSuffix: true }
                            )}
                          </Text>
                        </Group>
                        <Text size="sm" c="dimmed" mb="xs">
                          {item.notification_message}
                        </Text>
                      </Box>
                      <Menu position="bottom-end" shadow="md">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {!item.notification_is_read && (
                            <Menu.Item
                              leftSection={<IconCheck size={14} />}
                              onClick={() =>
                                handleMarkAsRead(item.notification_id)
                              }
                            >
                              Mark as read
                            </Menu.Item>
                          )}
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => handleArchive(item.notification_id)}
                          >
                            Archive
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
