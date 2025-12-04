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
  Pagination,
  Box,
  Modal,
  FileInput,
  LoadingOverlay,
  Grid,
  Badge,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  Paper,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconSearch,
  IconUpload,
  IconScan,
  IconEye,
  IconUser,
  IconInfoCircle,
  IconFileText,
  IconLink,
  //   IconCheck,
} from "@tabler/icons-react";
import useSWR, { mutate } from "swr";
import { notifications } from "@mantine/notifications";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import { getScanRequests, ScanRequestItem } from "@/actions/supabase/get";
import {
  processScanRequest,
  //   updateScanRequestStatus,
} from "@/actions/supabase/update";
import { getStatusFormat, replaceUnderscore } from "@/utils/function";

const PAGE_SIZE = 10;

// const STATUS_OPTIONS = [
//   { value: "SRS-COMPLETED", label: "Completed" },
//   { value: "SRS-REJECTED", label: "Rejected" },
//   { value: "SRS-IN_PROGRESS", label: "In Progress" },
// ];

const rawStatusOption = [
  "All Statuses",
  "Pending",
  //   "In_Progress",
  "Completed",
  //   "Rejected",
];

const FILTER_STATUS_OPTIONS = rawStatusOption.map((opt) => ({
  value: opt,
  label: opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

export default function ScanClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(
    "All Statuses"
  );
  const [page, setPage] = useState(1);

  const [selectedRequest, setSelectedRequest] =
    useState<ScanRequestItem | null>(null);

  const [processOpened, { open: openProcess, close: closeProcess }] =
    useDisclosure(false);
  const [viewOpened, { open: openView, close: closeView }] =
    useDisclosure(false);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  //   const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const { data: requests, isLoading } = useSWR(
    ["scan-requests", searchTerm, statusFilter, page],
    () =>
      getScanRequests({
        search: searchTerm,
        status_filter:
          statusFilter === "All Statuses"
            ? undefined
            : statusFilter?.toLowerCase(),
        page: page,
        page_size: PAGE_SIZE,
      })
  );

  const filteredRequests = requests || [];
  const totalCount =
    filteredRequests.length > 0 ? filteredRequests[0].total_count : 0;

  const handleOpenProcessModal = (request: ScanRequestItem) => {
    setSelectedRequest(request);
    setFile(null);
    openProcess();
  };

  const handleOpenViewModal = (request: ScanRequestItem) => {
    setSelectedRequest(request);
    openView();
  };

  const handleProcess = async () => {
    if (!selectedRequest || !file) {
      notifications.show({
        message: "Please upload a file.",
        color: "red",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${
        selectedRequest.scan_request_id
      }_${Date.now()}.${fileExt}`;
      const filePath = `scan_results/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("KEEP-PH-ATTACHMENTS")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store only the relative path, consistent with other uploads
      await processScanRequest(selectedRequest.scan_request_id, filePath);

      notifications.show({
        message: "Request processed successfully",
        color: "green",
      });
      mutate(["scan-requests", searchTerm, statusFilter, page]);
      closeProcess();
    } catch (error) {
      console.error(error);
      notifications.show({
        message: (error as Error).message || "Error processing request",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  //   const handleStatusUpdate = async (requestId: string, newStatusId: string) => {
  //     setIsUpdatingStatus(requestId);
  //     try {
  //       await updateScanRequestStatus(requestId, newStatusId);
  //       notifications.show({
  //         message: "Status updated successfully",
  //         color: "green",
  //       });
  //       mutate(["scan-requests", searchTerm, statusFilter, page]);
  //     } catch (error) {
  //       console.error(error);
  //       notifications.show({
  //         message: "Error updating status",
  //         color: "red",
  //       });
  //     } finally {
  //       setIsUpdatingStatus(null);
  //     }
  //   };

  const columns = [
    {
      accessor: "mail_item_sender",
      title: "ITEM",
      render: (record: ScanRequestItem) => (
        <Text size="sm" fw={600}>
          {record.mail_item_sender || "Unnamed Item"}
        </Text>
      ),
    },
    {
      accessor: "account_number",
      title: "ACCOUNT",
      render: (record: ScanRequestItem) => (
        <Text size="sm">
          {record.account_address_key} - {record.account_number}
        </Text>
      ),
    },
    {
      accessor: "user_full_name",
      title: "NAME",
      render: (record: ScanRequestItem) => (
        <Text size="sm">{record.user_full_name}</Text>
      ),
    },
    {
      accessor: "scan_request_requested_at",
      title: "REQUEST DATE",
      render: (record: ScanRequestItem) =>
        new Date(record.scan_request_requested_at).toLocaleDateString(),
    },
    {
      accessor: "actions",
      title: "ACTIONS",
      width: 180,
      render: (record: ScanRequestItem) => {
        const isPending = record.scan_request_status_value === "pending";
        // const currentStatusId = getStatusIdFromValue(
        //   record.scan_request_status_value
        // );

        return (
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="View Details" withArrow position="top">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => handleOpenViewModal(record)}
                size="lg"
              >
                <IconEye size={20} />
              </ActionIcon>
            </Tooltip>

            {isPending ? (
              <Tooltip label="Process Request" withArrow position="top">
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => handleOpenProcessModal(record)}
                  size="lg"
                >
                  <IconScan size={20} />
                </ActionIcon>
              </Tooltip>
            ) : (
              //   <Select
              //     size="sm"
              //     data={STATUS_OPTIONS}
              //     value={currentStatusId}
              //     onChange={(value) =>
              //       value && handleStatusUpdate(record.scan_request_id, value)
              //     }
              //     disabled={isUpdatingStatus === record.scan_request_id}
              //     allowDeselect={false}
              //     w={140}
              //     leftSection={<IconCheck size={14} />}
              //     styles={{ input: { fontSize: "12px" } }}
              //   />
              <Badge
                variant="filled"
                color={getStatusFormat(record.scan_request_status_value)}
              >
                {record.scan_request_status_value}
              </Badge>
            )}
          </Group>
        );
      },
    },
  ];

  return (
    <Container fluid py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Scan Requests</Title>
          <Text c="dimmed">Manage and process mail scan requests.</Text>
        </Box>

        <Group align="flex-end">
          <TextInput
            placeholder="Search by customer name or ID"
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by status"
            data={FILTER_STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            allowDeselect={false}
          />
        </Group>

        <CustomDataTable
          idAccessor="scan_request_id"
          records={filteredRequests}
          columns={columns}
          isRecordLoading={isLoading}
          pageSize={PAGE_SIZE}
        />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} results
          </Text>
          <Pagination
            total={Math.ceil(totalCount / PAGE_SIZE)}
            value={page}
            onChange={setPage}
          />
        </Group>
      </Stack>

      {/* Process Modal */}
      <Modal
        opened={processOpened}
        onClose={closeProcess}
        title={
          <Group gap="xs">
            <IconScan size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>Process Scan</Text>
          </Group>
        }
        centered
      >
        <LoadingOverlay visible={isSubmitting} overlayProps={{ blur: 2 }} />

        <Stack align="center" py="md">
          <Box
            p="lg"
            bg="blue.1"
            style={{
              borderRadius: "50%",
              color: "var(--mantine-color-blue-6)",
            }}
          >
            <IconFileText size={40} />
          </Box>
          <Text ta="center" size="lg" fw={500}>
            Upload Scanned File
          </Text>
          <Text ta="center" c="dimmed" size="sm" px="md">
            You are processing a scan request for{" "}
            <Text span fw={700} c="dark">
              {selectedRequest?.mail_item_sender}
            </Text>
            . Please upload the scanned document below.
          </Text>
        </Stack>

        <Stack gap="md">
          <FileInput
            label="Upload Scanned Document"
            placeholder="Upload file (PDF/Image)"
            leftSection={<IconUpload size={14} />}
            value={file}
            onChange={setFile}
            required
            accept="image/*,application/pdf"
          />
          <Group justify="stretch" mt="md">
            <Button variant="default" onClick={closeProcess} flex={1}>
              Cancel
            </Button>
            <Button onClick={handleProcess} loading={isSubmitting} flex={1}>
              Confirm Upload
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* View Modal */}
      <Modal
        opened={viewOpened}
        onClose={closeView}
        title={
          <Group gap="xs">
            <IconInfoCircle size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>Request Details</Text>
          </Group>
        }
        centered
        size="lg"
        padding="lg"
      >
        {selectedRequest && (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <Paper withBorder p="sm" radius="md" h="100%">
                  <Stack gap="xs">
                    <Group gap="xs">
                      <ThemeIcon size="sm" variant="light" color="blue">
                        <IconUser size={14} />
                      </ThemeIcon>
                      <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                        Customer Info
                      </Text>
                    </Group>
                    <Stack gap={2} mt={4}>
                      <Text size="sm" fw={600}>
                        {selectedRequest.user_full_name}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {selectedRequest.user_email}
                      </Text>
                      <Group gap={4} mt={4}>
                        <Badge size="sm" variant="dot">
                          {selectedRequest.account_address_key} -{" "}
                          {selectedRequest.account_number}
                        </Badge>
                      </Group>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={6}>
                <Paper withBorder p="sm" radius="md" h="100%">
                  <Stack gap="xs">
                    <Group gap="xs">
                      <ThemeIcon size="sm" variant="light" color="blue">
                        <IconInfoCircle size={14} />
                      </ThemeIcon>
                      <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                        Request Info
                      </Text>
                    </Group>
                    <Stack gap="xs" mt={4}>
                      <Group justify="space-between" align="center">
                        <Text size="sm" c="dimmed">
                          Status:
                        </Text>
                        <Badge
                          color={getStatusFormat(
                            selectedRequest.scan_request_status_value
                          )}
                        >
                          {replaceUnderscore(
                            selectedRequest.scan_request_status_value
                          )}
                        </Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Requested:
                        </Text>
                        <Text size="sm" fw={500}>
                          {new Date(
                            selectedRequest.scan_request_requested_at
                          ).toLocaleDateString()}
                        </Text>
                      </Group>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid.Col>

              <Grid.Col span={12}>
                <Paper withBorder p="sm" radius="md">
                  <Stack gap="md">
                    {selectedRequest.scan_request_instructions && (
                      <Stack gap="xs">
                        <Group gap="xs">
                          <ThemeIcon size="sm" variant="light" color="gray">
                            <IconInfoCircle size={14} />
                          </ThemeIcon>
                          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                            Instructions
                          </Text>
                        </Group>
                        <Text size="sm" fs="italic">
                          &quot;{selectedRequest.scan_request_instructions}
                          &quot;
                        </Text>
                      </Stack>
                    )}
                    {!selectedRequest.scan_request_instructions && (
                      <Text size="sm" c="dimmed" ta="center">
                        No specific instructions provided.
                      </Text>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>

              {selectedRequest.scan_request_url && (
                <Grid.Col span={12}>
                  <Paper withBorder p="sm" radius="md" bg="blue.0">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="filled" color="blue">
                          <IconLink size={14} />
                        </ThemeIcon>
                        <Text size="sm" fw={700} tt="uppercase" c={"dimmed"}>
                          Scanned Document
                        </Text>
                      </Group>
                      <Button
                        component="a"
                        href={
                          selectedRequest.scan_request_url.startsWith("http")
                            ? selectedRequest.scan_request_url
                            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/KEEP-PH-ATTACHMENTS/${selectedRequest.scan_request_url}`
                        }
                        target="_blank"
                        size="sm"
                        variant="white"
                        leftSection={<IconFileText size={16} />}
                        fullWidth
                        mt="xs"
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        View Scanned File
                      </Button>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}
            </Grid>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeView}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
