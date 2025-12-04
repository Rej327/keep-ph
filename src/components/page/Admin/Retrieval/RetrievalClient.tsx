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
  IconTruckDelivery,
  IconEye,
  IconBoxSeam,
  IconUser,
  IconInfoCircle,
  IconMapPin,
  IconMessage,
  IconTruck,
  IconBarcode,
  IconFileCheck,
  IconBox,
} from "@tabler/icons-react";
import useSWR, { mutate } from "swr";
import { notifications } from "@mantine/notifications";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import {
  getRetrievalRequests,
  RetrievalRequestItem,
} from "@/actions/supabase/get";
import {
  processRetrievalRequest,
  updateRetrievalRequestStatus,
} from "@/actions/supabase/update";
import { getStatusFormat, replaceUnderscore } from "@/utils/function";
import { createNotification } from "@/actions/supabase/notification";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "RRS-IN_TRANSIT", label: "In Transit" },
  { value: "RRS-DELIVERED", label: "Delivered" },
];

const rawStatusOption = ["All Statuses", "Pending", "In_Transit", "Delivered"];

const FILTER_STATUS_OPTIONS = rawStatusOption.map((opt) => ({
  value: opt,
  label: opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

export default function RetrievalClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(
    "All Statuses"
  );
  // const [page, setPage] = useState(1);

  const [selectedRequest, setSelectedRequest] =
    useState<RetrievalRequestItem | null>(null);

  const [processOpened, { open: openProcess, close: closeProcess }] =
    useDisclosure(false);
  const [viewOpened, { open: openView, close: closeView }] =
    useDisclosure(false);

  // Form state
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const { data: requests, isLoading } = useSWR(
    [
      "retrieval-requests",
      searchTerm,
      statusFilter,
      // page
    ],
    () =>
      getRetrievalRequests({
        search: searchTerm,
        status_filter:
          statusFilter === "All Statuses"
            ? undefined
            : statusFilter?.toLowerCase(),
        // page: page,
        page_size: PAGE_SIZE,
      })
  );

  console.log("Request: ", selectedRequest);

  const filteredRequests = requests || [];
  // const totalCount =
  //   filteredRequests.length > 0 ? filteredRequests[0].total_count : 0;

  const handleOpenProcessModal = (request: RetrievalRequestItem) => {
    setSelectedRequest(request);
    setCourier("");
    setTrackingNumber("");
    setFile(null);
    openProcess();
  };

  const handleOpenViewModal = (request: RetrievalRequestItem) => {
    setSelectedRequest(request);
    openView();
  };

  const handleProcess = async () => {
    if (!selectedRequest || !file || !courier || !trackingNumber) {
      notifications.show({
        message: "Please fill in all fields and upload a file.",
        color: "red",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${
        selectedRequest.retrieval_request_id
      }_${Date.now()}.${fileExt}`;
      const filePath = `retrieval_proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("KEEP-PH-ATTACHMENTS")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("KEEP-PH-ATTACHMENTS")
        .getPublicUrl(filePath);

      await processRetrievalRequest(
        selectedRequest.retrieval_request_id,
        courier,
        trackingNumber,
        publicUrlData.publicUrl
      );

      // Notify Customer
      try {
        await createNotification({
          userId: selectedRequest.account_id,
          title: "Retrieval Request Processed",
          message: `Your retrieval request for ${selectedRequest.mail_item_sender} has been processed. Courier: ${courier}, Tracking: ${trackingNumber}`,
          itemType: "NIT-MAIL",
          itemId: selectedRequest.mail_item_id,
          additionalData: { courier, trackingNumber },
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }

      notifications.show({
        message: "Request processed successfully",
        color: "green",
      });
      mutate([
        "retrieval-requests",
        searchTerm,
        statusFilter,
        // page
      ]);
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

  const handleStatusUpdate = async (requestId: string, newStatusId: string) => {
    setIsUpdatingStatus(requestId);
    try {
      await updateRetrievalRequestStatus(requestId, newStatusId);

      // Notify Customer
      try {
        const request = requests?.find(
          (r) => r.retrieval_request_id === requestId
        );
        if (request) {
          let statusLabel = "updated";
          if (newStatusId === "RRS-IN_TRANSIT") statusLabel = "is in transit";
          if (newStatusId === "RRS-DELIVERED")
            statusLabel = "has been delivered";

          await createNotification({
            userId: request.account_id,
            title: "Retrieval Status Updated",
            message: `The status of your retrieval request for ${request.mail_item_sender} has been updated: ${statusLabel}.`,
            itemType: "NIT-MAIL",
            itemId: request.mail_item_id,
          });
        }
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }

      notifications.show({
        message: "Status updated successfully",
        color: "green",
      });
      mutate([
        "retrieval-requests",
        searchTerm,
        statusFilter,
        //  page
      ]);
    } catch (error) {
      console.error(error);
      notifications.show({
        message: "Error updating status",
        color: "red",
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const getStatusIdFromValue = (value: string) => {
    const option = STATUS_OPTIONS.find(
      (opt) => opt.label.toLowerCase().replace(" ", "_") === value
    );
    // Fallback for specific cases like 'in_transit' mapping to 'RRS-IN_TRANSIT' logic if label doesn't match perfectly
    if (!option) {
      if (value === "in_transit") return "RRS-IN_TRANSIT";
      if (value === "pending") return "RRS-PENDING";
      if (value === "approved") return "RRS-APPROVED";
      if (value === "delivered") return "RRS-DELIVERED";
      if (value === "rejected") return "RRS-REJECTED";
      if (value === "arrived") return "RRS-ARRIVED";
    }
    return option?.value;
  };

  const columns = [
    {
      accessor: "mail_item_sender",
      title: "ITEM",
      render: (record: RetrievalRequestItem) => (
        <Text size="sm" fw={600}>
          {record.mail_item_sender || "Unnamed Item"}
        </Text>
      ),
    },
    {
      accessor: "account_number",
      title: "ACCOUNT",
      render: (record: RetrievalRequestItem) => (
        <Text size="sm">
          {record.account_address_key} - {record.account_number}
        </Text>
      ),
    },
    {
      accessor: "user_full_name",
      title: "NAME",
      render: (record: RetrievalRequestItem) => (
        <Text size="sm">{record.user_full_name}</Text>
      ),
    },
    {
      accessor: "retrieval_request_requested_at",
      title: "REQUEST DATE",
      render: (record: RetrievalRequestItem) =>
        new Date(record.retrieval_request_requested_at).toLocaleDateString(),
    },
    {
      accessor: "actions",
      title: "ACTIONS",
      width: 180,
      render: (record: RetrievalRequestItem) => {
        const isPending = record.retrieval_request_status_value === "pending";
        const currentStatusId = getStatusIdFromValue(
          record.retrieval_request_status_value
        );

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
                  <IconBoxSeam size={20} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <Select
                size="sm"
                data={STATUS_OPTIONS}
                value={currentStatusId}
                onChange={(value) =>
                  value &&
                  handleStatusUpdate(record.retrieval_request_id, value)
                }
                disabled={
                  isUpdatingStatus === record.retrieval_request_id ||
                  record.retrieval_request_status_value === "delivered"
                }
                allowDeselect={false}
                w={200}
                leftSection={
                  record.retrieval_request_status_value === "delivered" ? (
                    <IconBox size={14} />
                  ) : (
                    <IconTruckDelivery size={14} />
                  )
                }
                styles={{ input: { fontSize: "12px" } }}
              />
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
          <Title order={2}>Retrieval Requests</Title>
          <Text c="dimmed">
            Manage and process mail retrieval/forwarding requests.
          </Text>
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
          idAccessor="retrieval_request_id"
          records={filteredRequests}
          columns={columns}
          isRecordLoading={isLoading}
          pageSize={PAGE_SIZE}
        />

        {/* <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} results
          </Text>
          <Pagination
            total={Math.ceil(totalCount / PAGE_SIZE)}
            value={page}
            onChange={setPage}
          />
        </Group> */}
      </Stack>

      {/* Process Modal */}
      <Modal
        opened={processOpened}
        onClose={closeProcess}
        title={
          <Group gap="xs">
            <IconTruckDelivery size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>Process Retrieval</Text>
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
            <IconBoxSeam size={40} />
          </Box>
          <Text ta="center" size="lg" fw={500}>
            Prepare for Shipment
          </Text>
          <Text ta="center" c="dimmed" size="sm" px="md">
            You are processing a retrieval for{" "}
            <Text span fw={700} c="dark">
              {selectedRequest?.mail_item_sender}
            </Text>
            . Please provide the shipping details below.
          </Text>
        </Stack>

        <Stack gap="md">
          <TextInput
            label="Courier Service"
            placeholder="e.g. LBC, J&T, Grab"
            value={courier}
            onChange={(e) => setCourier(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Tracking Number"
            placeholder="Enter tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.currentTarget.value)}
            required
          />
          <FileInput
            label="Upload Proof/Waybill"
            placeholder="Upload file"
            leftSection={<IconUpload size={14} />}
            value={file}
            onChange={setFile}
            required
          />
          <Group justify="stretch" mt="md">
            <Button variant="default" onClick={closeProcess} flex={1}>
              Cancel
            </Button>
            <Button onClick={handleProcess} loading={isSubmitting} flex={1}>
              Confirm Process
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
                            selectedRequest.retrieval_request_status_value
                          )}
                        >
                          {replaceUnderscore(
                            selectedRequest.retrieval_request_status_value
                          )}
                        </Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Requested:
                        </Text>
                        <Text size="sm" fw={500}>
                          {new Date(
                            selectedRequest.retrieval_request_requested_at
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
                    <Stack gap="xs">
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color="blue">
                          <IconMapPin size={14} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                          Shipping Address
                        </Text>
                      </Group>
                      <Box p="xs" bg="gray.0" style={{ borderRadius: 6 }}>
                        <Text size="sm">
                          {selectedRequest.retrieval_request_address}
                        </Text>
                      </Box>
                    </Stack>

                    {selectedRequest.retrieval_request_notes && (
                      <Stack gap="xs">
                        <Group gap="xs">
                          <ThemeIcon size="sm" variant="light" color="gray">
                            <IconMessage size={14} />
                          </ThemeIcon>
                          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                            Notes
                          </Text>
                        </Group>
                        <Text size="sm" fs="italic">
                          &quot;{selectedRequest.retrieval_request_notes}&quot;
                        </Text>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>

              {selectedRequest.retrieval_request_status_value !== "pending" && (
                <Grid.Col span={12}>
                  <Paper withBorder p="sm" radius="md" bg="blue.0">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="filled" color="blue">
                          <IconTruck size={14} />
                        </ThemeIcon>
                        <Text size="sm" fw={700} tt="uppercase" c={"dimmed"}>
                          Shipment Details
                        </Text>
                      </Group>
                      <Grid mt={4}>
                        <Grid.Col span={6}>
                          <Stack gap={4}>
                            <Text size="sm" c="dimmed">
                              Courier Service
                            </Text>
                            <Group gap={6}>
                              <IconTruck size={16} color="gray" />
                              <Text size="sm" fw={600}>
                                {selectedRequest.retrieval_request_courier ||
                                  "N/A"}
                              </Text>
                            </Group>
                          </Stack>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Stack gap={4}>
                            <Text size="sm" c="dimmed">
                              Tracking Number
                            </Text>
                            <Group gap={6}>
                              <IconBarcode size={16} color="gray" />
                              <Text size="sm" fw={600}>
                                {selectedRequest.retrieval_request_tracking_number ||
                                  "N/A"}
                              </Text>
                            </Group>
                          </Stack>
                        </Grid.Col>
                        {selectedRequest.retrieval_request_label_url && (
                          <Grid.Col span={12}>
                            <Button
                              component="a"
                              href={selectedRequest.retrieval_request_label_url}
                              target="_blank"
                              size="sm"
                              variant="white"
                              //   color="blue"
                              leftSection={<IconFileCheck size={16} />}
                              fullWidth
                              mt="xs"
                              style={{
                                textDecoration: "none",
                                color: "inherit",
                              }}
                            >
                              View Proof of Shipment
                            </Button>
                          </Grid.Col>
                        )}
                      </Grid>
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
