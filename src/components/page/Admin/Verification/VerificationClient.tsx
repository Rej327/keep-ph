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
  Box,
  Modal,
  LoadingOverlay,
  Grid,
  Badge,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  Paper,
  Image,
  Textarea,
  Tabs,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconSearch,
  IconEye,
  IconUser,
  IconInfoCircle,
  IconCheck,
  IconX,
  IconId,
} from "@tabler/icons-react";
import useSWR, { mutate } from "swr";
import { notifications } from "@mantine/notifications";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import {
  getVerificationRequests,
  VerificationRequestItem,
} from "@/actions/supabase/get";
import { processVerificationRequest } from "@/actions/supabase/update";
import { createNotification } from "@/actions/supabase/notification";
import { getStatusFormat } from "@/utils/function";
// import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";

const PAGE_SIZE = 10;

const FILTER_STATUS_OPTIONS = [
  { value: "All Statuses", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function VerificationClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(
    "All Statuses"
  );

  const [selectedRequest, setSelectedRequest] =
    useState<VerificationRequestItem | null>(null);

  const [viewOpened, { open: openView, close: closeView }] =
    useDisclosure(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpened, { open: openReject, close: closeReject }] =
    useDisclosure(false);

  const { data: requests, isLoading } = useSWR(
    ["verification-requests", searchTerm, statusFilter],
    () =>
      getVerificationRequests({
        search: searchTerm,
        status_filter:
          statusFilter === "All Statuses"
            ? undefined
            : statusFilter?.toLowerCase(),
        page_size: PAGE_SIZE,
      })
  );

  const filteredRequests = requests || [];

  const handleOpenViewModal = (request: VerificationRequestItem) => {
    setSelectedRequest(request);
    openView();
  };

  const handleProcess = async (
    status: "approved" | "rejected",
    reason?: string
  ) => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      await processVerificationRequest(
        selectedRequest.user_verification_id,
        status,
        reason
      );

      notifications.show({
        message: `Request ${status} successfully`,
        color: "green",
      });

      mutate(["verification-requests", searchTerm, statusFilter]);
      closeView();
      closeReject();
      setRejectReason("");
      try {
        await createNotification({
          userId: selectedRequest.user_verification_user_id,
          itemType: "NIT-USER",
          title: "Verification Request Processed",
          message: `Your verification request has been ${status}.`,
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        message: "Error processing request",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  //   const getPublicUrl = (path: string) => {
  //     if (!path) return "";
  //     const supabase = createSupabaseBrowserClient();
  //     const { data } = supabase.storage
  //       .from("USER-KYC-DOCUMENTS")
  //       .getPublicUrl(path);
  //     return data.publicUrl;
  //   };

  const columns = [
    {
      accessor: "user_full_name",
      title: "USER",
      render: (record: VerificationRequestItem) => (
        <Stack gap={0}>
          <Text size="sm" fw={600}>
            {record.user_full_name}
          </Text>
          <Text size="xs" c="dimmed">
            {record.user_email}
          </Text>
        </Stack>
      ),
    },
    {
      accessor: "user_verification_id_type",
      title: "ID TYPE",
      render: (record: VerificationRequestItem) => (
        <Text size="sm">{record.user_verification_id_type}</Text>
      ),
    },
    {
      accessor: "user_verification_created_at",
      title: "DATE SUBMITTED",
      render: (record: VerificationRequestItem) =>
        new Date(record.user_verification_created_at).toLocaleDateString(),
    },
    {
      accessor: "user_verification_status",
      title: "STATUS",
      render: (record: VerificationRequestItem) => (
        <Badge color={getStatusFormat(record.user_verification_status)}>
          {record.user_verification_status.toUpperCase()}
        </Badge>
      ),
    },
    {
      accessor: "actions",
      title: "ACTIONS",
      width: 100,
      render: (record: VerificationRequestItem) => (
        <Group gap="xs">
          <Tooltip label="View Details">
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={() => handleOpenViewModal(record)}
            >
              <IconEye size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <Container fluid py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Identity Verification</Title>
          <Text c="dimmed">Manage user identity verification requests.</Text>
        </Box>

        <Group align="flex-end">
          <TextInput
            placeholder="Search by name or email"
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
          idAccessor="user_verification_id"
          records={filteredRequests}
          columns={columns}
          isRecordLoading={isLoading}
          pageSize={PAGE_SIZE}
        />
      </Stack>

      {/* View Modal */}
      <Modal
        opened={viewOpened}
        onClose={closeView}
        title={
          <Group gap="xs">
            <IconId size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>Verification Request Details</Text>
          </Group>
        }
        centered
        size="xl"
        padding="lg"
      >
        <LoadingOverlay visible={isSubmitting} overlayProps={{ blur: 2 }} />
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
                        User Info
                      </Text>
                    </Group>
                    <Stack gap={2} mt={4}>
                      <Text size="sm" fw={600}>
                        {selectedRequest.user_full_name}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {selectedRequest.user_email}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Username: {selectedRequest.user_username}
                      </Text>
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
                    <Stack gap={2} mt={4}>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Status:
                        </Text>
                        <Badge
                          color={getStatusFormat(
                            selectedRequest.user_verification_status
                          )}
                        >
                          {selectedRequest.user_verification_status.toUpperCase()}
                        </Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Submitted:
                        </Text>
                        <Text size="sm" fw={500}>
                          {new Date(
                            selectedRequest.user_verification_created_at
                          ).toLocaleDateString()}
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          ID Type:
                        </Text>
                        <Text size="sm" fw={500}>
                          {selectedRequest.user_verification_id_type}
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          ID Number:
                        </Text>
                        <Text size="sm" fw={500}>
                          {selectedRequest.user_verification_id_number}
                        </Text>
                      </Group>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            <Tabs defaultValue="front">
              <Tabs.List>
                <Tabs.Tab value="front">Front ID</Tabs.Tab>
                {selectedRequest.user_verification_id_back_bucket_path && (
                  <Tabs.Tab value="back">Back ID</Tabs.Tab>
                )}
                <Tabs.Tab value="selfie">Selfie</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="front" pt="xs">
                <Image
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/USER-KYC-DOCUMENTS/${selectedRequest.user_verification_id_front_bucket_path}`}
                  alt="Front ID"
                  radius="md"
                  fit="contain"
                  h={400}
                  w="100%"
                  bg="gray.1"
                />
              </Tabs.Panel>

              <Tabs.Panel value="back" pt="xs">
                <Image
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/USER-KYC-DOCUMENTS/${selectedRequest.user_verification_id_back_bucket_path}`}
                  alt="Back ID"
                  radius="md"
                  fit="contain"
                  h={400}
                  w="100%"
                  bg="gray.1"
                />
              </Tabs.Panel>

              <Tabs.Panel value="selfie" pt="xs">
                <Image
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/USER-KYC-DOCUMENTS/${selectedRequest.user_verification_selfie_bucket_path}`}
                  alt="Selfie"
                  radius="md"
                  fit="contain"
                  h={400}
                  w="100%"
                  bg="gray.1"
                />
              </Tabs.Panel>
            </Tabs>

            {selectedRequest.user_verification_status === "pending" && (
              <Group justify="flex-end" mt="md">
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconX size={16} />}
                  onClick={openReject}
                >
                  Reject
                </Button>
                <Button
                  color="green"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => handleProcess("approved")}
                >
                  Approve
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        opened={rejectOpened}
        onClose={closeReject}
        title="Reject Verification"
        centered
      >
        <Stack>
          <Text size="sm">
            Please provide a reason for rejecting this verification request.
          </Text>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.currentTarget.value)}
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeReject}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => handleProcess("rejected", rejectReason)}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
