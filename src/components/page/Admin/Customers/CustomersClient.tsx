"use client";

import {
  Container,
  Title,
  Text,
  Group,
  Select,
  Badge,
  Stack,
  Anchor,
  TextInput,
} from "@mantine/core";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import { getAllCustomers } from "@/actions/supabase/get";
import { useState } from "react";
import useSWR from "swr";
import { replaceUnderscore } from "@/utils/function";

// Define types for API response
export type CustomerApiResponse = {
  account_id: string;
  account_number: string;
  account_area_code: string;
  account_type: string;
  account_type_value: string;
  account_subscription_status_id: string;
  account_subscription_status_value: string;
  account_subscription_ends_at: string | null;
  account_remaining_mailbox_access: number | null;
  account_created_at: string;
  user_id: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
};

export default function CustomersClient() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const {
    data: customers,
    error,
    isLoading,
  } = useSWR<CustomerApiResponse[]>(
    ["customers", search, statusFilter, typeFilter, sortOrder],
    () =>
      getAllCustomers({
        search,
        status_filter: statusFilter,
        type_filter: typeFilter,
        sort_order: sortOrder,
      }),
    { revalidateOnFocus: false }
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "green";
      case "suspended":
        return "yellow";
      case "pending":
        return "gray";
      case "expired":
        return "red";
      default:
        return "gray";
    }
  };

  // Transform API data to match table expectations
  const transformedData = customers || [];

  const columns = [
    {
      accessor: "area_code",
      title: "AREA CODE",
      render: (record: CustomerApiResponse) => (
        <Text size="sm" fw={600}>
          {record.account_area_code}
        </Text>
      ),
    },
    {
      accessor: "id",
      title: "ACCOUNT NO.",
      render: (record: CustomerApiResponse) => (
        <Text size="sm" fw={600}>
          {record.account_number}
        </Text>
      ),
    },
    {
      accessor: "name",
      title: "NAME",
      render: (record: CustomerApiResponse) => (
        <Group gap="sm">
          <Stack gap={0}>
            <Text size="sm" fw={500}>
              {record.user_first_name}
            </Text>
            <Text size="xs" c="dimmed">
              {record.user_email}
            </Text>
          </Stack>
        </Group>
      ),
    },
    {
      accessor: "type",
      title: "SUBSCRIPTION TYPE",
      render: (record: CustomerApiResponse) => (
        <Text size="sm" c="dimmed">
          {replaceUnderscore(record.account_type_value)}
        </Text>
      ),
    },
    {
      accessor: "status",
      title: "SUBSCRIPTION STATUS",
      render: (record: CustomerApiResponse) => (
        <Badge
          color={getStatusColor(record.account_subscription_status_value)}
          size="lg"
          variant="light"
        >
          {replaceUnderscore(record.account_subscription_status_value)}
        </Badge>
      ),
    },
    {
      accessor: "actions",
      title: "ACTIONS",
      render: (record: CustomerApiResponse) => (
        <Group gap="md" justify="flex-start">
          <Anchor component="button" size="sm" fw={500}>
            View Details
          </Anchor>
          <Anchor
            component="button"
            size="sm"
            c={
              record.account_subscription_status_value?.toLowerCase() ===
              "suspended"
                ? "green"
                : "orange"
            }
            fw={500}
          >
            {record.account_subscription_status_value?.toLowerCase() ===
            "suspended"
              ? "Activate"
              : "Suspend"}
          </Anchor>
        </Group>
      ),
    },
  ];

  return (
    <Container fluid py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>All Customers</Title>
            <Text c="dimmed">Manage all customer accounts in the system.</Text>
          </div>
          <Select
            placeholder="All Statuses"
            data={[
              { value: "", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "pending", label: "Pending" },
              { value: "expired", label: "Expired" },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || "")}
            w={200}
          />
        </Group>

        <Group gap="md">
          <TextInput
            placeholder="Search customers..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Account Type"
            data={[
              { value: "", label: "All Types" },
              { value: "free", label: "Free" },
              { value: "digital", label: "Digital" },
              { value: "personal", label: "Personal" },
              { value: "business", label: "Business" },
            ]}
            value={typeFilter}
            onChange={(value) => setTypeFilter(value || "")}
            w={150}
          />
          <Select
            placeholder="Sort Order"
            data={[
              { value: "desc", label: "Newest First" },
              { value: "asc", label: "Oldest First" },
            ]}
            value={sortOrder}
            onChange={(value) => setSortOrder(value as "asc" | "desc")}
            w={150}
          />
        </Group>

        <CustomDataTable
          records={transformedData}
          columns={columns}
          isRecordLoading={isLoading}
          pageSize={10}
        />

        {error && (
          <Text c="red" ta="center">
            Error loading customers: {error.message}
          </Text>
        )}
      </Stack>
    </Container>
  );
}
