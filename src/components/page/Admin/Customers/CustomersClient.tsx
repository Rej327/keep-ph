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
} from "@mantine/core";
import { CustomDataTable } from "@/components/common/CustomDataTable";

// Mock data based on the image
const mockData = [
  {
    id: "CUST-00123",
    name: "Jane Doe",
    email: "jane.doe@example.com",
    accountNo: "KP-987654",
    type: "Premium",
    status: "Active",
  },
  {
    id: "CUST-00124",
    name: "John Smith",
    email: "john.smith@example.com",
    accountNo: "KP-987655",
    type: "Basic",
    status: "Active",
  },
  {
    id: "CUST-00125",
    name: "Alice Johnson",
    email: "alice.j@example.com",
    accountNo: "KP-987656",
    type: "Business",
    status: "Suspended",
  },
  {
    id: "CUST-00126",
    name: "Michael Brown",
    email: "m.brown@example.com",
    accountNo: "KP-987657",
    type: "Basic",
    status: "Active",
  },
  {
    id: "CUST-00127",
    name: "Emily Davis",
    email: "emily.davis@example.com",
    accountNo: "KP-987658",
    type: "Premium",
    status: "Pending",
  },
];

export default function CustomersClient() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "green";
      case "Suspended":
        return "yellow";
      case "Pending":
        return "gray";
      default:
        return "gray";
    }
  };

  const columns = [
    {
      accessor: "id",
      title: "CUSTOMER ID",
      render: (record: (typeof mockData)[0]) => (
        <Text size="sm" fw={600}>
          {record.id}
        </Text>
      ),
    },
    {
      accessor: "name",
      title: "NAME",
      render: (record: (typeof mockData)[0]) => (
        <Group gap="sm">
          <Stack gap={0}>
            <Text size="sm" fw={500}>
              {record.name}
            </Text>
            <Text size="xs" c="dimmed">
              {record.email}
            </Text>
          </Stack>
        </Group>
      ),
    },
    {
      accessor: "accountNo",
      title: "ACCOUNT NO.",
      render: (record: (typeof mockData)[0]) => (
        <Text size="sm" c="dimmed">
          {record.accountNo}
        </Text>
      ),
    },
    {
      accessor: "type",
      title: "SUBSCRIPTION TYPE",
      render: (record: (typeof mockData)[0]) => (
        <Text size="sm" c="dimmed">
          {record.type}
        </Text>
      ),
    },
    {
      accessor: "status",
      title: "SUBSCRIPTION STATUS",
      render: (record: (typeof mockData)[0]) => (
        <Badge color={getStatusColor(record.status)} variant="light">
          {record.status}
        </Badge>
      ),
    },
    {
      accessor: "actions",
      title: "",
      render: (record: (typeof mockData)[0]) => (
        <Group gap="md" justify="flex-end">
          <Anchor component="button" size="sm" fw={500}>
            View Details
          </Anchor>
          <Anchor
            component="button"
            size="sm"
            c={record.status === "Suspended" ? "green" : "orange"}
            fw={500}
          >
            {record.status === "Suspended" ? "Activate" : "Suspend"}
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
            data={["All Statuses", "Active", "Suspended", "Pending"]}
            defaultValue="All Statuses"
            w={200}
          />
        </Group>

        <CustomDataTable records={mockData} columns={columns} pageSize={10} />
      </Stack>
    </Container>
  );
}
