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
} from "@mantine/core";
import {
  IconBell,
  IconPackage,
  IconCreditCard,
  IconAlertCircle,
} from "@tabler/icons-react";

export function NotificationDropdown() {
  return (
    <Popover width={350} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <Indicator color="red" size={8} offset={4} processing>
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
            <Text size="xs" c="blue" style={{ cursor: "pointer" }}>
              Mark all as read
            </Text>
          </Group>
          {/* Notification Items */}
          <Stack gap="md">
            {/* Item 1 */}
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon color="green" variant="light" radius="xl" size="lg">
                <IconPackage size={18} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    New mail arrived
                  </Text>
                  <Box w={6} h={6} bg="blue" style={{ borderRadius: "50%" }} />
                </Group>
                <Text size="xs" c="dimmed" lineClamp={2}>
                  Your package from Amazon has been scanned and is now available
                  in your mailbox.
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  2 minutes ago
                </Text>
              </div>
            </Group>
            {/* Item 2 */}
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon color="blue" variant="light" radius="xl" size="lg">
                <IconCreditCard size={18} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Subscription Update
                  </Text>
                  <Box w={6} h={6} bg="blue" style={{ borderRadius: "50%" }} />
                </Group>
                <Text size="xs" c="dimmed" lineClamp={2}>
                  Your monthly subscription has been successfully renewed.
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  1 hour ago
                </Text>
              </div>
            </Group>
            {/* Item 3 */}
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon color="red" variant="light" radius="xl" size="lg">
                <IconAlertCircle size={18} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={600}>
                  Action Required
                </Text>
                <Text size="xs" c="dimmed" lineClamp={2}>
                  Your storage is almost full. Please upgrade your plan or clear
                  some space.
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  1 day ago
                </Text>
              </div>
            </Group>
          </Stack>
        </div>
        <Divider />
        <Button variant="subtle" fullWidth size="sm">
          View all notifications
        </Button>
      </Popover.Dropdown>
    </Popover>
  );
}
