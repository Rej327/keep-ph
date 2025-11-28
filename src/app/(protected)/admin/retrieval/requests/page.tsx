"use client";

import React, { useState } from "react";
import {
  Title,
  Text,
  TextInput,
  Group,
  Stack,
  Avatar,
  Badge,
  ActionIcon,
} from "@mantine/core";
import { IconSearch, IconBell, IconSettings } from "@tabler/icons-react";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import CustomButton from "@/components/common/CustomButton";

// Type definition based on the dummy data
type ScanRequest = {
  id: string;
  customer: {
    name: string;
    email: string;
    avatar?: string;
  };
  requestDate: string;
  mailItem: {
    title: string;
    sender: string;
  };
  status: "Pending" | "Completed";
};

// Dummy data matching the image
const initialRecords: ScanRequest[] = [
  {
    id: "1",
    customer: {
      name: "Alex Doe",
      email: "alex.doe@example.com",
      avatar:
        "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png",
    },
    requestDate: "Jan 15, 2024",
    mailItem: {
      title: "Utility Bill - Jan 2024",
      sender: "City Power Co.",
    },
    status: "Pending",
  },
  {
    id: "2",
    customer: {
      name: "Jane Smith",
      email: "jane.s@example.com",
      avatar:
        "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-8.png",
    },
    requestDate: "Jan 14, 2024",
    mailItem: {
      title: "Bank Statement",
      sender: "National Bank",
    },
    status: "Completed",
  },
  {
    id: "3",
    customer: {
      name: "Sam Wilson",
      email: "sam.w@example.com",
      avatar:
        "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png",
    },
    requestDate: "Jan 12, 2024",
    mailItem: {
      title: "Personal Letter",
      sender: "Private Sender",
    },
    status: "Pending",
  },
];

export default function ScanRequestsPage() {
  const [search, setSearch] = useState("");

  const records = initialRecords.filter(
    (record) =>
      record.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      record.mailItem.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Stack gap="lg" p="md">
      {/* Header Section with Search and Icons */}
      <Group justify="space-between" align="center">
        <TextInput
          placeholder="Search requests, customers, or mail items..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={400}
          radius="md"
        />
        <Group gap="xs">
          <ActionIcon variant="subtle" color="gray" size="lg">
            <IconBell size={20} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" size="lg">
            <IconSettings size={20} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Page Title and Description */}
      <Stack gap={0}>
        <Title order={2}>Process Customer Scan Requests</Title>
        <Text c="dimmed" size="sm">
          Review and fulfill scan requests from customers.
        </Text>
      </Stack>

      {/* Data Table */}
      <CustomDataTable
        records={records}
        columns={[
          {
            accessor: "customer",
            title: "CUSTOMER",
            render: (record) => (
              <Group gap="sm">
                <Avatar src={record.customer.avatar} radius="xl" />
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {record.customer.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {record.customer.email}
                  </Text>
                </Stack>
              </Group>
            ),
          },
          {
            accessor: "requestDate",
            title: "REQUEST DATE",
            render: (record) => <Text size="sm">{record.requestDate}</Text>,
          },
          {
            accessor: "mailItem",
            title: "MAIL ITEM",
            render: (record) => (
              <Stack gap={0}>
                <Text size="sm" fw={500}>
                  {record.mailItem.title}
                </Text>
                <Text size="xs" c="dimmed">
                  From: {record.mailItem.sender}
                </Text>
              </Stack>
            ),
          },
          {
            accessor: "status",
            title: "STATUS",
            render: (record) => {
              const isPending = record.status === "Pending";
              return (
                <Badge
                  color={isPending ? "yellow" : "green"}
                  variant="light"
                  radius="md"
                >
                  {record.status}
                </Badge>
              );
            },
          },
          {
            accessor: "actions",
            title: "ACTIONS",
            textAlign: "right",
            render: (record) => (
              <Group gap="xs" justify="flex-end">
                <CustomButton variant="light" size="xs">
                  View Details
                </CustomButton>
                {record.status === "Pending" && (
                  <CustomButton variant="primary" size="xs">
                    Upload Scan
                  </CustomButton>
                )}
              </Group>
            ),
          },
        ]}
      />
    </Stack>
  );
}
