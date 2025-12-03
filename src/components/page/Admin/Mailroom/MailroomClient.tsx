"use client";

import {
  Container,
  Title,
  Text,
  Group,
  Select,
  Stack,
  TextInput,
  SemiCircleProgress,
  Box,
} from "@mantine/core";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import { getAllMailrooms, MailroomItem } from "@/actions/supabase/get";
import { updateMailboxStatus } from "@/actions/supabase/update";
import { useState } from "react";
import useSWR from "swr";
import { notifications } from "@mantine/notifications";

const MAILBOX_STATUSES = [
  { value: "MBS-ACTIVE", label: "Active" },
  { value: "MBS-INACTIVE", label: "Inactive" },
  { value: "MBS-FULL", label: "Full" },
  { value: "MBS-MAINTENANCE", label: "Maintenance" },
];

export default function MailroomClient() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const {
    data: mailrooms,
    error,
    isLoading,
    mutate: refreshMailrooms,
  } = useSWR<MailroomItem[]>(
    ["mailrooms", search, statusFilter, sortOrder],
    () =>
      getAllMailrooms({
        search,
        status_filter: statusFilter,
        sort_order: sortOrder,
      }),
    { revalidateOnFocus: false }
  );

  const handleStatusChange = async (mailboxId: string, newStatus: string) => {
    try {
      await updateMailboxStatus(mailboxId, newStatus);
      notifications.show({
        title: "Success",
        message: "Mailbox status updated successfully",
        color: "green",
      });
      refreshMailrooms();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update mailbox status";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
    }
  };

  const columns = [
    {
      accessor: "mailbox_label",
      title: "MAILBOX",
      render: (record: MailroomItem) => (
        <Text size="sm" fw={600}>
          {record.mailbox_label || "No Label"}
        </Text>
      ),
    },
    {
      accessor: "account_number",
      title: "ACCOUNT",
      render: (record: MailroomItem) => (
        <Stack gap={0}>
          <Text size="sm" fw={500}>
            {record.account_address_key}-{record.account_number}
          </Text>
          <Text size="xs" c="dimmed">
            {record.user_email}
          </Text>
        </Stack>
      ),
    },
    {
      accessor: "user_full_name",
      title: "USER",
      render: (record: MailroomItem) => (
        <Text size="sm">{record.user_full_name}</Text>
      ),
    },
    {
      accessor: "remaining_mailbox_access",
      title: "REMAINING SPACE",
      render: (record: MailroomItem) => {
        const value = record.mailbox_mail_remaining_space || 0;
        const maxCapacity = record.account_max_quantity_storage || 0;
        const percent = maxCapacity > 0 ? (value / maxCapacity) * 100 : 0;

        let color = "gray";
        if (percent >= 90) color = "green";
        else if (percent >= 30) color = "yellow";
        else if (percent >= 10) color = "orange";
        else color = "red";

        return (
          <SemiCircleProgress
            fillDirection="left-to-right"
            transitionDuration={250}
            styles={{ label: { fontSize: 10 } }}
            orientation="up"
            filledSegmentColor={color}
            size={70}
            thickness={8}
            value={percent}
            label={`${value === 0 ? "0" : Math.round(percent)}%`}
            labelPosition="center"
          />
        );
      },
    },
    {
      accessor: "mailbox_package_remaining_space",
      title: "PACKAGE SPACE",
      render: (record: MailroomItem) => {
        const value = record.mailbox_package_remaining_space || 0;
        const maxCapacity = record.account_max_parcel_handling || 0;
        const percent = maxCapacity > 0 ? (value / maxCapacity) * 100 : 0;

        let color = "gray";
        if (percent >= 90) color = "green";
        else if (percent >= 30) color = "yellow";
        else if (percent >= 10) color = "orange";
        else color = "red";

        return (
          <SemiCircleProgress
            fillDirection="left-to-right"
            transitionDuration={250}
            styles={{ label: { fontSize: 10 } }}
            orientation="up"
            filledSegmentColor={color}
            size={70}
            thickness={8}
            value={percent}
            label={`${value === 0 ? "0" : Math.round(percent)}%`}
            labelPosition="center"
          />
        );
      },
    },

    {
      accessor: "mailbox_status",
      title: "STATUS",
      render: (record: MailroomItem) => (
        <Select
          data={MAILBOX_STATUSES}
          value={record.mailbox_status_id}
          onChange={(value) => {
            if (value && value !== record.mailbox_status_id) {
              handleStatusChange(record.mailbox_id, value);
            }
          }}
          size="sm"
          w={130}
          allowDeselect={false}
        />
      ),
    },
  ];

  return (
    <Container fluid py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Mailroom Management</Title>
          <Text c="dimmed">Manage all mailboxes and their statuses.</Text>
        </Box>
        <Group gap="md">
          <TextInput
            placeholder="Search mailrooms..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by Status"
            data={[{ value: "", label: "All Statuses" }, ...MAILBOX_STATUSES]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || "")}
            w={200}
          />
          <Select
            placeholder="Sort Order"
            data={[
              { value: "desc", label: "Newest First" },
              { value: "asc", label: "Oldest First" },
            ]}
            value={sortOrder}
            onChange={(value) =>
              setSortOrder((value as "asc" | "desc") || "desc")
            }
            w={150}
          />
        </Group>

        <CustomDataTable
          records={mailrooms || []}
          columns={columns}
          idAccessor="mailbox_id"
          isRecordLoading={isLoading}
          pageSize={10}
        />

        {error && (
          <Text c="red" ta="center">
            Error loading mailrooms: {error.message}
          </Text>
        )}
      </Stack>
    </Container>
  );
}
