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
  // Pagination,
  Box,
  Badge,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import useSWR, { mutate } from "swr";
import {
  DisposalRequestItem,
  getAllDisposalRequests,
} from "@/actions/supabase/get";
import { updateDisposalRequestStatus } from "@/actions/supabase/update";
import { notifications } from "@mantine/notifications";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import { createNotification } from "@/actions/supabase/notification";
import { getStatusFormat } from "@/utils/function";

// const PAGE_SIZE = 10;

export default function DisposalClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(
    "All Statuses"
  );
  // const [page, setPage] = useState(1);
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

      // Notify Customer
      try {
        const request = requests?.find(
          (r) => r.dispose_request_id === requestId
        );
        if (request) {
          await createNotification({
            userId: request.dispose_request_account_id, // Or request.account_id if available in future
            title:
              statusId === "DRS-COMPLETED"
                ? "Disposal Completed"
                : "Disposal Rejected",
            message: `Your disposal request for ${
              request.mail_item_name
            } has been ${
              statusId === "DRS-COMPLETED" ? "completed" : "rejected"
            }.`,
            itemType: "NIT-MAIL",
            itemId: request.dispose_request_mail_item_id,
          });
        }
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }

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
  // const paginatedRequests = filteredRequests.slice(
  //   (page - 1) * PAGE_SIZE,
  //   page * PAGE_SIZE
  // );

  const columns = [
    {
      accessor: "mail_item_name",
      title: "ITEM",
      render: (record: DisposalRequestItem) => (
        <Text size="sm" fw={600}>
          {record.mail_item_name || "Unnamed Item"}
        </Text>
      ),
    },
    {
      accessor: "account_account_number",
      title: "ACCOUNT",
      render: (record: DisposalRequestItem) => (
        <Text size="sm">
          {record.account_address_key} - {record.account_account_number}
        </Text>
      ),
    },
    {
      accessor: "user_full_name",
      title: "NAME",
    },
    {
      accessor: "dispose_request_requested_at",
      title: "REQUEST DATE",
      render: (record: DisposalRequestItem) =>
        new Date(record.dispose_request_requested_at).toLocaleDateString(),
    },
    {
      accessor: "dispose_request_status_value",
      title: "STATUS",
      render: (record: DisposalRequestItem) => (
        <Badge
          variant="filled"
          color={getStatusFormat(record.dispose_request_status_value)}
        >
          {record.dispose_request_status_value}
        </Badge>
      ),
    },
    {
      accessor: "actions",
      title: "ACTIONS",
      render: (record: DisposalRequestItem) => (
        <Button
          key="dispose"
          size="xs"
          disabled={record.dispose_request_status_value === "completed"}
          // className="dispose-btn"
          color={"blue"}
          loading={processingId === record.dispose_request_id}
          onClick={() =>
            handleStatusUpdate(record.dispose_request_id, "DRS-COMPLETED")
          }
        >
          {record.dispose_request_status_value == "pending"
            ? "DISPOSE"
            : "DISPOSED"}
        </Button>
      ),
    },
  ];

  return (
    <Container fluid py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Disposal Requests</Title>
          <Text c="dimmed">
            Manage and process all mail disposal requests from customers.
          </Text>
        </Box>

        <Group align="flex-end">
          <TextInput
            // label="Customer"
            placeholder="Search by customer name or ID"
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            // label="Status"
            placeholder="Filter by status"
            data={["All Statuses", "Pending", "Completed"]}
            value={statusFilter}
            onChange={setStatusFilter}
            allowDeselect={false}
          />
        </Group>

        <CustomDataTable
          idAccessor="dispose_request_id"
          records={filteredRequests}
          columns={columns}
          isRecordLoading={isLoading}
          pageSize={10}
        />

        {/* <Group justify="space-between">
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
        </Group> */}
      </Stack>
    </Container>
  );
}
