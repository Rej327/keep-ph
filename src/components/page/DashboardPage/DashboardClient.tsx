"use client";

import React from "react";
import useSWR from "swr";
import {
  Container,
  Grid,
  Paper,
  Text,
  Group,
  Stack,
  Title,
  Button,
  ThemeIcon,
  Badge,
  Box,
  SimpleGrid,
  Center,
} from "@mantine/core";
import {
  IconUsers,
  IconEye,
  IconCertificate,
  IconDownload,
  IconUserPlus,
  IconScan,
  IconTruckDelivery,
  IconTrash,
  IconAlertCircle,
} from "@tabler/icons-react";
import { DataTable } from "mantine-datatable";
import CustomLoader from "@/components/common/CustomLoader";
import { formatDistanceToNow } from "date-fns";
import { getDashboardStats } from "@/actions/supabase/get";

export default function DashboardClient() {
  const {
    data: stats,
    isLoading,
    error,
  } = useSWR("dashboard-stats", getDashboardStats);

  if (isLoading) {
    return (
      <Center h="100vh">
        <CustomLoader />
      </Center>
    );
  }

  if (error || !stats) {
    return (
      <Center h="100vh">
        <CustomLoader />
      </Center>
    );
  }

  // Chart Data Preparation
  const maxRequestValue = Math.max(
    stats.requests.scan.all,
    stats.requests.retrieval.all,
    stats.requests.disposal.all,
    10 // Minimum scale
  );

  const getBarHeight = (value: number) => {
    return `${(value / maxRequestValue) * 200}px`; // Max height 200px
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Dashboard Overview</Title>
        <Button leftSection={<IconDownload size={18} />} variant="default">
          Export Data
        </Button>
      </Group>

      {/* Top Stats Cards */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb="lg">
        {/* Users Card */}
        <Paper p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={500} size="lg">
              Users
            </Text>
            <ThemeIcon color="green" variant="light" size="lg">
              <IconUsers size={20} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mb="xs">
            <Text size="sm" c="dimmed">
              Active
            </Text>
            <Text fw={700} size="xl">
              {stats.users.active.toLocaleString()}
            </Text>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text size="sm" c="dimmed">
              Inactive
            </Text>
            <Text fw={700} size="lg">
              {stats.users.inactive.toLocaleString()}
            </Text>
          </Group>
        </Paper>

        {/* Visitors Card */}
        <Paper p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={500} size="lg">
              Landing Page Visitors
            </Text>
            <ThemeIcon color="blue" variant="light" size="lg">
              <IconEye size={20} />
            </ThemeIcon>
          </Group>
          <Text fw={700} style={{ fontSize: "2.5rem" }} lh={1}>
            {stats.visitors.count.toLocaleString()}
          </Text>
          <Text c="green" size="sm" mt="xs" fw={500}>
            ↑ {stats.visitors.trend}% this month
          </Text>
        </Paper>

        {/* Subscription Plans Card */}
        <Paper p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={500} size="lg">
              Subscription Plans
            </Text>
            <ThemeIcon color="violet" variant="light" size="lg">
              <IconCertificate size={20} />
            </ThemeIcon>
          </Group>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm">Free</Text>
              <Text fw={600}>{stats.plans.free}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Digital</Text>
              <Text fw={600}>{stats.plans.digital}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Personal</Text>
              <Text fw={600}>{stats.plans.personal}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Business</Text>
              <Text fw={600}>{stats.plans.business}</Text>
            </Group>
          </Stack>
        </Paper>
      </SimpleGrid>

      <Grid gutter="lg" mb="lg">
        {/* Request Overview Chart */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="lg" radius="md" withBorder h="100%">
            <Group justify="space-between" mb="xl">
              <Text fw={500} size="lg">
                Request Overview
              </Text>
              <Group gap="xs">
                <Group gap={4}>
                  <Box w={12} h={12} bg="blue" style={{ borderRadius: 2 }} />
                  <Text size="xs" c="dimmed">
                    Requested
                  </Text>
                </Group>
                <Group gap={4}>
                  <Box w={12} h={12} bg="gray.3" style={{ borderRadius: 2 }} />
                  <Text size="xs" c="dimmed">
                    All
                  </Text>
                </Group>
              </Group>
            </Group>

            <Box
              h={300}
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-around",
                borderBottom: "1px solid #eee",
                paddingBottom: 20,
              }}
            >
              {/* Scan Requests */}
              <Stack align="center" gap="xs">
                <Group align="flex-end" gap={4}>
                  <Box
                    w={30}
                    bg="blue"
                    style={{
                      height: getBarHeight(stats.requests.scan.requested),
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.5s ease",
                    }}
                  />
                  <Box
                    w={30}
                    bg="gray.3"
                    style={{
                      height: getBarHeight(stats.requests.scan.all),
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.5s ease",
                    }}
                  />
                </Group>
                <Text size="sm">Scan Requests</Text>
                <Text size="xs" c="dimmed">
                  {stats.requests.scan.requested} / {stats.requests.scan.all}
                </Text>
              </Stack>

              {/* Retrieval Requests */}
              <Stack align="center" gap="xs">
                <Group align="flex-end" gap={4}>
                  <Box
                    w={30}
                    bg="blue"
                    style={{
                      height: getBarHeight(stats.requests.retrieval.requested),
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.5s ease",
                    }}
                  />
                  <Box
                    w={30}
                    bg="gray.3"
                    style={{
                      height: getBarHeight(stats.requests.retrieval.all),
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.5s ease",
                    }}
                  />
                </Group>
                <Text size="sm">Retrieval Requests</Text>
                <Text size="xs" c="dimmed">
                  {stats.requests.retrieval.requested} /{" "}
                  {stats.requests.retrieval.all}
                </Text>
              </Stack>

              {/* Disposal Requests */}
              <Stack align="center" gap="xs">
                <Group align="flex-end" gap={4}>
                  <Box
                    w={30}
                    bg="blue"
                    style={{
                      height: getBarHeight(stats.requests.disposal.requested),
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.5s ease",
                    }}
                  />
                  <Box
                    w={30}
                    bg="gray.3"
                    style={{
                      height: getBarHeight(stats.requests.disposal.all),
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.5s ease",
                    }}
                  />
                </Group>
                <Text size="sm">Disposal Requests</Text>
                <Text size="xs" c="dimmed">
                  {stats.requests.disposal.requested} /{" "}
                  {stats.requests.disposal.all}
                </Text>
              </Stack>
            </Box>
          </Paper>
        </Grid.Col>

        {/* Activity Logs */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="lg" radius="md" withBorder h="100%">
            <Group justify="space-between" mb="md">
              <Text fw={500} size="lg">
                Activity Logs
              </Text>
              <Text size="xs" c="dimmed">
                Recent
              </Text>
            </Group>
            <Stack gap="md">
              {/* Map through activity logs if available, otherwise use static for design if not dynamic yet */}
              {stats.activity_logs.length > 0 ? (
                stats.activity_logs.map((log, index) => {
                  let iconColor = "red";
                  if (log.type === "user") iconColor = "blue";
                  else if (log.type === "scan") iconColor = "yellow";
                  else if (log.type === "retrieval") iconColor = "cyan";

                  return (
                    <Group key={index} align="flex-start" wrap="nowrap">
                      <ThemeIcon color={iconColor} variant="light" radius="xl">
                        {log.type === "user" && <IconUserPlus size={16} />}
                        {log.type === "scan" && <IconScan size={16} />}
                        {log.type === "retrieval" && (
                          <IconTruckDelivery size={16} />
                        )}
                        {log.type === "disposal" && <IconTrash size={16} />}
                      </ThemeIcon>
                      <div>
                        <Text size="sm" fw={500}>
                          {log.message}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {log.detail} •{" "}
                          {formatDistanceToNow(new Date(log.time), {
                            addSuffix: true,
                          })}
                        </Text>
                      </div>
                    </Group>
                  );
                })
              ) : (
                <Text size="sm" c="dimmed">
                  No recent activity
                </Text>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Error Logs Section */}
      <Paper p="lg" radius="md" withBorder>
        <Group mb="md">
          <ThemeIcon color="red" variant="light">
            <IconAlertCircle size={20} />
          </ThemeIcon>
          <Title order={4}>Error Logs</Title>
        </Group>

        <DataTable
          withTableBorder
          borderRadius="md"
          withColumnBorders
          striped
          highlightOnHover
          minHeight={150}
          noRecordsText="No errors found"
          columns={[
            { accessor: "error_source", title: "Source", width: 100 },
            { accessor: "error_type", title: "Type", width: 150 },
            { accessor: "error_message", title: "Message" },
            {
              accessor: "error_timestamp",
              title: "Time",
              width: 180,
              render: (record) =>
                new Date(record.error_timestamp).toLocaleString(),
            },
            {
              accessor: "error_resolved",
              title: "Status",
              width: 100,
              render: (record) => (
                <Badge
                  color={record.error_resolved ? "green" : "red"}
                  variant="light"
                >
                  {record.error_resolved ? "Resolved" : "Open"}
                </Badge>
              ),
            },
          ]}
          records={stats.error_logs}
        />
      </Paper>
    </Container>
  );
}
