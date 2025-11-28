"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  TextInput,
  Select,
  Button,
  Paper,
  Pagination,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import useSWR, { mutate } from "swr";
import { getAllDisposalRequests } from "@/actions/supabase/get";
import { updateDisposalRequestStatus } from "@/actions/supabase/update";
import { DataTable } from "mantine-datatable";
import { notifications } from "@mantine/notifications";

const PAGE_SIZE = 10;

export default function DisposalRequestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(
    "All Statuses"
  );
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: requests, isLoading } = useSWR(
    ["disposal-requests", searchTerm, statusFilter],
    () =>
      getAllDisposalRequests({
        search: searchTerm,
        status_filter:
          statusFilter === "All Statuses"
            ? undefined
            : statusFilter?.toLowerCase(),
      })
  );

  const handleStatusUpdate = async (requestId: string, statusId: string) => {
    setProcessingId(requestId);
    try {
      await updateDisposalRequestStatus(requestId, statusId);
      notifications.show({
        message: `Request ${
          statusId === "DRS-COMPLETED" ? "dispose" : "rejected"
        } successfully`,
        color: "green",
      });
      mutate(["disposal-requests", searchTerm, statusFilter]);
    } catch (error) {
      console.error(error);
      notifications.show({
        message: "Error updating request status",
        color: "red",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests || [];
  const paginatedRequests = filteredRequests.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Shredding Requests</Title>
          <Text c="dimmed">
            Manage and process all mail shredding requests from customers.
          </Text>
        </div>

        <Group align="flex-end">
          <Select
            label="Status"
            placeholder="Filter by status"
            data={["All Statuses", "Pending", "Completed", "Rejected"]}
            value={statusFilter}
            onChange={setStatusFilter}
            allowDeselect={false}
          />
          <TextInput
            label="Customer"
            placeholder="Search by customer name or ID"
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button variant="light">Apply Filters</Button>
        </Group>

        <Paper withBorder radius="md" p="md">
          <DataTable
            minHeight={200}
            fetching={isLoading}
            loaderType="oval"
            records={paginatedRequests}
            idAccessor="dispose_request_id"
            columns={[
              {
                accessor: "mail_item_name",
                title: "Mail Item",
                render: ({ mail_item_name }) => (
                  <Text size="sm" c="blue">
                    {mail_item_name || "Unnamed Item"}
                  </Text>
                ),
              },
              {
                accessor: "user_full_name",
                title: "Customer",
              },
              {
                accessor: "dispose_request_requested_at",
                title: "Request Date",
                render: ({ dispose_request_requested_at }) =>
                  new Date(dispose_request_requested_at).toLocaleDateString(),
              },
              {
                accessor: "dispose_request_status_value",
                title: "Actions",
                render: (record) => (
                  <Button
                    key="dispose"
                    size="xs"
                    disabled={
                      record.dispose_request_status_value === "completed"
                    }
                    className="dispose-btn"
                    color={"blue"}
                    variant="light"
                    loading={processingId === record.dispose_request_id}
                    onClick={() =>
                      handleStatusUpdate(
                        record.dispose_request_id,
                        "DRS-COMPLETED"
                      )
                    }
                  >
                    {record.dispose_request_status_value == "pending"
                      ? "DISPOSE"
                      : "COMPLETED"}
                  </Button>
                ),
              },
            ]}
          />
        </Paper>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(page * PAGE_SIZE, filteredRequests.length)} of{" "}
            {filteredRequests.length} results
          </Text>
          <Pagination
            total={Math.ceil(filteredRequests.length / PAGE_SIZE)}
            value={page}
            onChange={setPage}
          />
        </Group>
      </Stack>
    </Container>
  );
}
