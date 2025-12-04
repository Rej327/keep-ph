"use client";

import { useState, useMemo } from "react";
import {
  Container,
  Grid,
  Paper,
  Title,
  Text,
  Group,
  Button,
  TextInput,
  Stack,
  Badge,
  ActionIcon,
  Image,
  Divider,
  Box,
  Loader,
  Center,
  Tooltip,
  Modal,
  Textarea,
  Select,
  Drawer,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconSearch,
  IconMail,
  IconX,
  IconTruckDelivery,
  IconFileShredder,
  IconRefresh,
  IconRestore,
  IconAlertTriangle,
  IconMapPin,
  IconScan,
  IconDownload,
  IconEye,
  IconFileText,
  IconInbox,
  IconBox,
  IconCheckbox,
} from "@tabler/icons-react";
import useSWR from "swr";
import useAuthStore from "@/zustand/stores/useAuthStore";
import {
  getUserFullDetails,
  getMailItemsByUser,
  MailItem,
  getUserAddresses,
  getMailHasRequestAction,
} from "@/actions/supabase/get";
import {
  markMailItemAsUnread,
  setMailItemArchiveStatus,
  requestMailItemDisposal,
  requestMailItemRetrieval,
  markMailItemAsRead,
  requestMailItemScan,
  cancelDisposalRequest,
  markMailItemAsRetrieved,
} from "@/actions/supabase/update";
import { notifications } from "@mantine/notifications";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import { DataTableColumn } from "mantine-datatable";
import { getStatusFormat, replaceUnderscore } from "@/utils/function";

export default function MailClient() {
  const user = useAuthStore((state) => state.user);
  const [selectedItem, setSelectedItem] = useState<MailItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>("all");
  const [mailboxFilter, setMailboxFilter] = useState<string | null>("all");
  const [viewContentMode, setViewContentMode] = useState<"unopened" | "opened">(
    "unopened"
  );
  const [actionLoading, setActionLoading] = useState(false);

  // Modal States
  const [disposalModalOpen, setDisposalModalOpen] = useState(false);
  const [retrievalModalOpen, setRetrievalModalOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [viewScanResultModalOpen, setViewScanResultModalOpen] = useState(false);
  const [viewRetrievalResultModalOpen, setViewRetrievalResultModalOpen] =
    useState(false);
  const [overrideDisposalModalOpen, setOverrideDisposalModalOpen] =
    useState(false);
  const [pendingActionType, setPendingActionType] = useState<
    "scan" | "retrieval" | null
  >(null);

  // Retrieval Form State
  const [retrievalAddress, setRetrievalAddress] = useState("");
  const [retrievalNotes, setRetrievalNotes] = useState("");
  const [scanInstructions, setScanInstructions] = useState("");

  // Fetch User Details
  const { data: userDetails, isLoading: loadingDetails } = useSWR(
    user?.id ? ["user-details", user.id] : null,
    () => getUserFullDetails(user!.id)
  );

  // Fetch User Addresses (only when retrieval modal is open)
  const { data: userAddresses, isLoading: loadingAddresses } = useSWR(
    retrievalModalOpen && user?.id ? ["user-addresses", user.id] : null,
    () => getUserAddresses(user!.id)
  );

  const addressOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];

    // Add user's saved addresses
    if (userAddresses && userAddresses.length > 0) {
      userAddresses.forEach((addr) => {
        options.push({
          value: addr.address_value,
          label: addr.address_label
            ? `${addr.address_label} (${
                addr.address_is_default ? "Default" : "Secondary"
              })`
            : addr.address_value.substring(0, 50) +
              (addr.address_value.length > 50 ? "..." : ""),
        });
      });
    }

    return options;
  }, [userAddresses]);

  const {
    data: mailItems,
    isLoading: loadingMail,
    mutate,
  } = useSWR(
    user?.id && userDetails?.account.account_number
      ? ["mail-items", user.id, userDetails.account.account_number]
      : null,
    () => getMailItemsByUser(user!.id, userDetails!.account.account_number)
  );

  const mailboxOptions = useMemo(() => {
    if (!mailItems) return [{ value: "all", label: "All" }];
    const labels = Array.from(
      new Set(
        mailItems
          .map((item) => item.mailbox_label)
          .filter((label): label is string => !!label)
      )
    );
    return [
      { value: "all", label: "All" },
      ...labels.map((label) => ({ value: label, label })),
    ];
  }, [mailItems]);

  const typeOptions = [
    { value: "all", label: "All" },
    { value: "mail", label: "Mail" },
    { value: "package", label: "Package" },
  ];

  // Fetch Request Actions for selected item
  console.log("Selected Item ID:", selectedItem?.mail_item_id);

  const {
    data: requestActions,
    isLoading: loadingRequestActions,
    error: requestError,
  } = useSWR(
    selectedItem?.mail_item_id
      ? ["request-actions", selectedItem.mail_item_id]
      : null,
    ([, mailItemId]: [string, string]) => {
      console.log("Fetching actions for:", mailItemId);
      return getMailHasRequestAction(mailItemId);
    }
  );

  console.log("Has Request: ", requestActions);
  if (requestError) console.error("Request Actions SWR Error:", requestError);

  const handleReadStatus = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      if (selectedItem.mail_item_is_read) {
        await markMailItemAsUnread(selectedItem.mail_item_id);
      } else {
        await markMailItemAsRead(selectedItem.mail_item_id);
      }
      notifications.show({
        message: `Marked as ${
          selectedItem.mail_item_is_read ? "unread" : "read"
        }`,
        color: "green",
      });
      mutate();
    } catch {
      notifications.show({
        message: "Failed to mark as unread",
        color: "red",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetArchive = async (isArchive: boolean) => {
    if (!selectedItem) return;
    setActionLoading(true);
    const archiveAction = isArchive ? true : false;
    try {
      await setMailItemArchiveStatus(selectedItem.mail_item_id, archiveAction);
      notifications.show({
        message: `${archiveAction ? "Archived" : "Unarchived"} successfully`,
        color: "green",
      });
      setSelectedItem(null);
      mutate();
    } catch {
      notifications.show({
        message: `${
          archiveAction ? "Failed to archive" : "Failed to unarchive"
        } item`,
        color: "red",
      });
    } finally {
      setActionLoading(false);
      setSelectedItem(null);
    }
  };

  const handleRequestDisposal = async () => {
    if (!selectedItem || !userDetails?.account.account_id) return;

    setActionLoading(true);
    try {
      await requestMailItemDisposal(
        selectedItem.mail_item_id,
        userDetails.account.account_id
      );
      notifications.show({ message: "Disposal requested", color: "green" });
      mutate();
      setDisposalModalOpen(false);
    } catch {
      notifications.show({
        message: "Failed to request disposal",
        color: "red",
      });
    } finally {
      setActionLoading(false);
      setSelectedItem(null);
    }
  };

  const handleRequestRetrieval = async () => {
    if (!selectedItem || !userDetails?.account.account_id) return;

    if (!retrievalAddress) {
      notifications.show({
        message: "Please provide an address",
        color: "red",
      });
      return;
    }

    setActionLoading(true);
    try {
      await requestMailItemRetrieval(
        selectedItem.mail_item_id,
        userDetails.account.account_id,
        retrievalAddress,
        retrievalNotes
      );
      notifications.show({ message: "Retrieval requested", color: "green" });
      mutate();
      setRetrievalModalOpen(false);
      // Reset form
      setRetrievalAddress("");
      setRetrievalNotes("");
    } catch {
      notifications.show({
        message: "Failed to request retrieval",
        color: "red",
      });
    } finally {
      setActionLoading(false);
      setSelectedItem(null);
    }
  };

  const handleRequestScan = async () => {
    if (!selectedItem || !userDetails?.account.account_id) return;

    setActionLoading(true);
    try {
      await requestMailItemScan(
        selectedItem.mail_item_id,
        userDetails.account.account_id,
        scanInstructions
      );
      notifications.show({ message: "Scan requested", color: "green" });
      mutate();
      setScanModalOpen(false);
      setScanInstructions("");
    } catch {
      notifications.show({
        message: "Failed to request scan",
        color: "red",
      });
    } finally {
      setActionLoading(false);
      setSelectedItem(null);
    }
  };

  const handleMarkAsRetrieved = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await markMailItemAsRetrieved(selectedItem.mail_item_id);
      notifications.show({
        message: "Marked as retrieved",
        color: "green",
      });
      setViewRetrievalResultModalOpen(false);
      setSelectedItem(null);
      mutate();
    } catch {
      notifications.show({
        message: "Failed to mark as retrieved",
        color: "red",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmOverrideDisposal = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await cancelDisposalRequest(selectedItem.mail_item_id);
      notifications.show({
        message: "Disposal request canceled",
        color: "green",
      });
      // Proceed with the pending action
      setOverrideDisposalModalOpen(false);
      if (pendingActionType === "scan") {
        setScanModalOpen(true);
      } else if (pendingActionType === "retrieval") {
        setRetrievalModalOpen(true);
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        message: "Failed to cancel disposal request",
        color: "red",
      });
    } finally {
      setActionLoading(false);
      setPendingActionType(null);
      mutate();
    }
  };

  const handleOpenScanModal = () => {
    if (requestActions?.has_request_disposal) {
      setPendingActionType("scan");
      setOverrideDisposalModalOpen(true);
    } else {
      setScanModalOpen(true);
    }
  };

  // Set initial address when opening retrieval modal
  const openRetrievalModal = () => {
    if (requestActions?.has_request_disposal) {
      setPendingActionType("retrieval");
      setOverrideDisposalModalOpen(true);
    } else {
      setRetrievalModalOpen(true);
    }
  };

  const renderValue: DataTableColumn<MailItem>[] = useMemo(
    () => [
      {
        accessor: "mail_attachment_unopened_scan_file_path",
        title: "Receipt",
        width: 80,
        render: (record) => (
          <Image
            src={
              record.mail_attachment_unopened_scan_file_path
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/KEEP-PH-ATTACHMENTS/${record.mail_attachment_unopened_scan_file_path}`
                : ""
            }
            alt="Thumbnail"
            height={50}
            width={50}
            radius="sm"
            fit="cover"
            fallbackSrc="https://placehold.co/50x50?text=No+Image"
          />
        ),
      },
      {
        accessor: "mail_item_received_at",
        title: "Mail Details",
        sortable: true,
        render: (record) => (
          <Box
            onClick={
              record.mail_item_status_value?.toLowerCase() !== "disposed" &&
              record.mail_item_status_value?.toLowerCase() !== "retrieved"
                ? async () => {
                    setSelectedItem(record);

                    if (record.mail_attachment_item_scan_file_path) {
                      setViewContentMode("opened");
                    } else {
                      setViewContentMode("unopened");
                    }

                    if (!record.mail_item_is_read) {
                      try {
                        await markMailItemAsRead(record.mail_item_id);
                        mutate();
                      } catch (error) {
                        console.error("Failed to mark as read", error);
                      }
                    }
                  }
                : undefined
            }
            style={{
              cursor:
                record.mail_item_status_value?.toLowerCase() !== "disposed" &&
                record.mail_item_status_value?.toLowerCase() !== "retrieved"
                  ? "pointer"
                  : "not-allowed",
              position: "relative",
            }}
          >
            {!record.mail_item_is_read && (
              <Box
                style={{
                  position: "absolute",
                  top: -10,
                  right: 0,
                  width: 8,
                  height: 8,
                  backgroundColor: "var(--mantine-color-red-6)",
                  borderRadius: "50%",
                }}
              />
            )}
            <Group justify="space-between" wrap="nowrap">
              <Text fw={600} truncate>
                {record.mail_item_name || "Unknown Name"}
              </Text>
              <Group gap="xs">
                <Badge mt="xs" variant="default">
                  {record.mail_item_type}
                </Badge>
                <Badge
                  mt="xs"
                  color={getStatusFormat(record.mail_item_status_value)}
                >
                  {replaceUnderscore(record.mail_item_status_value)}
                </Badge>
              </Group>
            </Group>
            <Group justify="space-between" mt={4}>
              <Text size="xs" c="dimmed">
                {record.mailbox_label || "No Mailbox"}
              </Text>
              <Text size="xs" c="dimmed">
                {new Date(record.mail_item_received_at).toLocaleDateString()}
              </Text>
            </Group>
          </Box>
        ),
      },
    ],
    []
  );

  const filteredItems = useMemo(() => {
    if (!mailItems) return [];
    return mailItems.filter((item) => {
      const matchesSearch =
        (item.mail_item_sender?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (item.mailbox_label?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        );
      const matchesStatus =
        statusFilter && statusFilter !== "all"
          ? item.mail_item_status_value === statusFilter
          : true;
      const matchesType =
        typeFilter && typeFilter !== "all"
          ? item.mail_item_type?.toLowerCase() === typeFilter.toLowerCase()
          : true;
      const matchesMailbox =
        mailboxFilter && mailboxFilter !== "all"
          ? item.mailbox_label === mailboxFilter
          : true;
      return matchesSearch && matchesStatus && matchesType && matchesMailbox;
    });
  }, [mailItems, searchTerm, statusFilter, typeFilter, mailboxFilter]);

  const handleRefresh = () => {
    mutate();
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setMailboxFilter("all");
    setSearchTerm("");
  };

  const isMobile = useMediaQuery("(max-width: 48em)");

  const detailsContent = selectedItem && (
    <>
      <Group justify="space-between" mb="md" align="flex-start">
        <Box>
          <Title order={3}>
            {selectedItem.mail_item_name || "Unknown Item"}
          </Title>
          <Text size="sm" c="dimmed">
            Sender: {selectedItem.mail_item_sender || "Unknown Sender"}
          </Text>
          <Text size="sm" c="dimmed">
            Received on{" "}
            {new Date(selectedItem.mail_item_received_at).toLocaleDateString()}
          </Text>
          <Group>
            <Badge mt="xs" variant="default">
              {selectedItem.mail_item_type}
            </Badge>
            <Badge
              mt="xs"
              color={getStatusFormat(selectedItem.mail_item_status_value)}
            >
              {replaceUnderscore(selectedItem.mail_item_status_value)}
            </Badge>
          </Group>
        </Box>
        <Group>
          <Tooltip label="Close">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setSelectedItem(null)}
            >
              <IconX size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Divider my="md" />

      {/* Image Preview */}
      <Box
        bg="gray.1"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
          borderRadius: 8,
          overflow: "hidden",
        }}
        mb="xl"
      >
        {(() => {
          const path =
            viewContentMode === "opened"
              ? selectedItem.mail_attachment_item_scan_file_path
              : selectedItem.mail_attachment_unopened_scan_file_path;

          return path ? (
            <Image
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/KEEP-PH-ATTACHMENTS/${path}`}
              alt="Mail Scan"
              fit="contain"
              style={{ maxHeight: 500 }}
            />
          ) : (
            <Stack align="center" c="dimmed">
              <IconMail size={48} />
              <Text>No preview available</Text>
            </Stack>
          );
        })()}
      </Box>

      {/* Actions */}
      <Text fw={500} mb="xs">
        Actions
      </Text>
      <Group>
        <Button
          variant="default"
          fw={500}
          leftSection={<IconMail size={16} />}
          onClick={handleReadStatus}
          loading={actionLoading}
          disabled={actionLoading}
        >
          Mark as {selectedItem.mail_item_is_read ? "unread" : "read"}
        </Button>

        <Button
          variant="default"
          fw={500}
          leftSection={<IconRestore size={16} />}
          onClick={
            selectedItem.mail_item_status_value == "archived"
              ? () => handleSetArchive(false)
              : () => handleSetArchive(true)
          }
          loading={actionLoading}
          disabled={actionLoading}
        >
          {selectedItem.mail_item_status_value == "archived"
            ? "Unarchive"
            : "Archive"}
        </Button>

        {/* Scan Button Logic */}

        {selectedItem.mail_item_type === "MAIL" ? (
          <>
            {selectedItem.mail_attachment_item_scan_file_path ? (
              <Button
                variant="filled"
                color="green"
                fw={500}
                leftSection={<IconEye size={16} />}
                onClick={() => setViewScanResultModalOpen(true)}
              >
                View Scan Result
              </Button>
            ) : (
              <Button
                variant="default"
                fw={500}
                leftSection={<IconScan size={16} />}
                onClick={handleOpenScanModal}
                loading={actionLoading}
                disabled={
                  actionLoading ||
                  loadingRequestActions ||
                  requestActions?.has_request_scan ||
                  requestActions?.has_request_retrieval
                }
              >
                {requestActions?.has_request_scan
                  ? "Scan Requested"
                  : "Request Scan"}
              </Button>
            )}
          </>
        ) : null}

        <Button
          variant="default"
          fw={500}
          leftSection={<IconFileShredder size={16} />}
          onClick={() => setDisposalModalOpen(true)}
          loading={actionLoading}
          disabled={
            actionLoading ||
            loadingRequestActions ||
            requestActions?.has_request_disposal ||
            requestActions?.has_request_retrieval
          }
        >
          {requestActions?.has_request_disposal
            ? "Disposal Requested"
            : "Request Disposal"}
        </Button>

        {/* Retrieval Button Logic */}
        {selectedItem.retrieval_request_label_url ||
        selectedItem.retrieval_request_tracking_number ? (
          <Button
            variant="filled"
            color="blue"
            fw={500}
            leftSection={<IconTruckDelivery size={16} />}
            onClick={() => setViewRetrievalResultModalOpen(true)}
          >
            View Waybill
          </Button>
        ) : (
          <Button
            variant="default"
            fw={500}
            leftSection={<IconTruckDelivery size={16} />}
            onClick={openRetrievalModal}
            loading={actionLoading}
            disabled={
              actionLoading ||
              loadingRequestActions ||
              requestActions?.has_request_retrieval
            }
          >
            {requestActions?.has_request_retrieval
              ? "Retrieval Requested"
              : "Request Retrieval"}
          </Button>
        )}
      </Group>
    </>
  );

  if (loadingDetails || (loadingMail && !mailItems)) {
    return (
      <Center h={"100%"}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container fluid p="md">
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Box>
          <Title order={2}>All Mail</Title>
          <Text c="dimmed" size="sm">
            Browse and manage all your scanned mail items.
          </Text>
        </Box>
        <Group>
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Group>
      </Group>

      <Grid gutter="md">
        {/* Mail List Column */}
        <Grid.Col span={!isMobile && selectedItem ? 5 : 12}>
          <Paper withBorder p="md" radius="md">
            {/* Filters */}
            <Group mb="md" justify="space-between">
              <Group>
                <Select
                  placeholder="Status"
                  leftSection={<IconCheckbox size={16} />}
                  data={[
                    { value: "all", label: "All" },
                    { value: "received", label: "Received" },
                    { value: "archived", label: "Archived" },
                    { value: "scanned", label: "Scanned" },
                    { value: "scanning", label: "Scanning" },
                    { value: "retrieval", label: "Retrieval" },
                    { value: "retrieved", label: "Retrieved" },
                    { value: "transit", label: "In Transit" },
                    { value: "disposal", label: "Disposal" },
                    { value: "disposed", label: "Disposed" },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  allowDeselect={false}
                  w={180}
                  checkIconPosition="right"
                />
                <Select
                  placeholder="Type"
                  leftSection={<IconBox size={16} />}
                  data={typeOptions}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  allowDeselect={false}
                  w={150}
                  checkIconPosition="right"
                />
                <Select
                  placeholder="Mailbox"
                  leftSection={<IconInbox size={16} />}
                  data={mailboxOptions}
                  value={mailboxFilter}
                  onChange={setMailboxFilter}
                  allowDeselect={false}
                  w={150}
                  checkIconPosition="right"
                />
                <Button
                  variant="default"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleResetFilters}
                >
                  Reset
                </Button>
              </Group>
            </Group>

            {/* Search */}
            <TextInput
              placeholder="Search mail..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              mb="md"
            />

            {/* List */}
            <CustomDataTable
              records={filteredItems}
              idAccessor="mail_item_id"
              columns={renderValue}
              pageSize={10}
              selectedRecordId={selectedItem?.mail_item_id}
              initialSortStatus={{
                columnAccessor: "mail_item_received_at",
                direction: "desc",
              }}
            />
          </Paper>
        </Grid.Col>

        {/* Detail Column */}
        {!isMobile && selectedItem && (
          <Grid.Col span={7}>
            <Paper withBorder p="lg" radius="md" h="100%">
              {detailsContent}
            </Paper>
          </Grid.Col>
        )}
      </Grid>

      {/* Mobile Drawer */}
      <Drawer
        opened={!!selectedItem && !!isMobile}
        onClose={() => setSelectedItem(null)}
        position="bottom"
        size="90%"
        withCloseButton={false}
        padding="md"
      >
        {detailsContent}
      </Drawer>

      {/* Disposal Modal */}
      <Modal
        opened={disposalModalOpen}
        onClose={() => setDisposalModalOpen(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
            <Text fw={600}>Confirm Disposal</Text>
          </Group>
        }
        centered
        closeOnClickOutside
      >
        <Stack align="center" py="md">
          <Box
            p="lg"
            bg="red.1"
            style={{ borderRadius: "50%", color: "var(--mantine-color-red-6)" }}
          >
            <IconFileShredder size={40} />
          </Box>
          <Text ta="center" size="lg" fw={500}>
            Are you sure?
          </Text>
          <Text ta="center" c="dimmed" size="sm" px="md">
            You are about to request disposal for{" "}
            <Text span fw={700} c="dark">
              {selectedItem?.mail_item_name}
            </Text>
            . This action cannot be undone and the physical item will be
            destroyed.
          </Text>
        </Stack>
        <Group justify="stretch" mt="md">
          <Button
            variant="default"
            onClick={() => setDisposalModalOpen(false)}
            flex={1}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleRequestDisposal}
            loading={actionLoading}
            flex={1}
          >
            Confirm Disposal
          </Button>
        </Group>
      </Modal>

      {/* Override Disposal Modal */}
      <Modal
        opened={overrideDisposalModalOpen}
        onClose={() => setOverrideDisposalModalOpen(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle
              size={20}
              color="var(--mantine-color-orange-6)"
            />
            <Text fw={600}>Conflicting Request</Text>
          </Group>
        }
        centered
        closeOnClickOutside
      >
        <Stack align="center" py="md">
          <Box
            p="lg"
            bg="orange.1"
            style={{
              borderRadius: "50%",
              color: "var(--mantine-color-orange-6)",
            }}
          >
            <IconAlertTriangle size={40} />
          </Box>
          <Text ta="center" size="lg" fw={500}>
            Pending Disposal Request
          </Text>
          <Text ta="center" c="dimmed" size="sm" px="md">
            You have requested a disposal for this mail. If you request a{" "}
            {pendingActionType === "scan" ? "scan" : "retrieval"}, the pending
            disposal request will be <b>canceled</b>.
          </Text>
          <Text ta="center" size="sm" fw={500}>
            Do you want to proceed?
          </Text>
        </Stack>
        <Group justify="stretch" mt="md">
          <Button
            variant="default"
            onClick={() => setOverrideDisposalModalOpen(false)}
            flex={1}
          >
            Cancel
          </Button>
          <Button
            color="orange"
            onClick={handleConfirmOverrideDisposal}
            loading={actionLoading}
            flex={1}
          >
            Yes, Cancel Disposal
          </Button>
        </Group>
      </Modal>

      {/* View Scan Result Modal */}
      <Modal
        opened={viewScanResultModalOpen}
        onClose={() => setViewScanResultModalOpen(false)}
        title={
          <Group gap="xs">
            <IconFileText size={20} color="var(--mantine-color-green-6)" />
            <Text fw={600}>Scanned Document</Text>
          </Group>
        }
        size="lg"
        centered
      >
        <Stack>
          <Box
            bg="gray.1"
            p="md"
            style={{
              borderRadius: 8,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 300,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          >
            {selectedItem?.mail_attachment_item_scan_file_path && (
              <Image
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/KEEP-PH-ATTACHMENTS/${selectedItem.mail_attachment_item_scan_file_path}`}
                alt="Scanned Document"
                fit="contain"
                style={{ maxHeight: 250 }}
              />
            )}
          </Box>
          <Group justify="space-between">
            <Button
              component="a"
              href={
                selectedItem?.mail_attachment_item_scan_file_path
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/KEEP-PH-ATTACHMENTS/${selectedItem.mail_attachment_item_scan_file_path}`
                  : "#"
              }
              target="_blank"
              leftSection={<IconDownload size={16} />}
              variant="outline"
            >
              Download
            </Button>
            <Button
              variant="light"
              color="grape"
              leftSection={<IconScan size={16} />}
              onClick={() => {
                setViewScanResultModalOpen(false);
                handleOpenScanModal();
              }}
            >
              Request Rescan
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* View Retrieval Result Modal */}
      <Modal
        opened={viewRetrievalResultModalOpen}
        onClose={() => setViewRetrievalResultModalOpen(false)}
        title={
          <Group gap="xs">
            <IconTruckDelivery size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>Delivery Details</Text>
          </Group>
        }
        size="md"
        centered
      >
        <Stack gap="md">
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  Courier:
                </Text>
                <Text fw={600}>
                  {selectedItem?.retrieval_request_courier || "N/A"}
                </Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  Tracking Number:
                </Text>
                <Text fw={600}>
                  {selectedItem?.retrieval_request_tracking_number || "N/A"}
                </Text>
              </Group>
            </Stack>
          </Paper>

          {selectedItem?.retrieval_request_label_url && (
            <>
              <Text fw={500} size="sm">
                Proof of Shipment / Waybill
              </Text>
              <Box
                bg="gray.1"
                p="sm"
                style={{
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Image
                  src={selectedItem.retrieval_request_label_url}
                  alt="Waybill"
                  fit="contain"
                  style={{ maxHeight: 300 }}
                />
              </Box>
              <Button
                component="a"
                href={selectedItem.retrieval_request_label_url}
                target="_blank"
                leftSection={<IconDownload size={16} />}
                variant="outline"
                fullWidth
              >
                Download Waybill
              </Button>
            </>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              color="green"
              leftSection={<IconCheckbox size={16} />}
              loading={actionLoading}
              onClick={handleMarkAsRetrieved}
            >
              Mark as Received
            </Button>
            <Button
              variant="default"
              onClick={() => setViewRetrievalResultModalOpen(false)}
            >
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Retrieval Modal */}
      <Modal
        opened={retrievalModalOpen}
        onClose={() => setRetrievalModalOpen(false)}
        title={
          <Group gap="xs">
            <IconTruckDelivery size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>Request Retrieval</Text>
          </Group>
        }
        size="lg"
        centered
        closeOnClickOutside
      >
        <Stack gap="md" py="sm">
          <Text size="sm" c="dimmed">
            Please select a delivery address and provide any additional
            instructions for the courier.
          </Text>

          <Select
            label="Delivery Address"
            placeholder="Select a saved address"
            leftSection={<IconMapPin size={16} />}
            data={addressOptions}
            value={retrievalAddress}
            onChange={(value) => setRetrievalAddress(value || "")}
            allowDeselect={false}
            disabled={loadingAddresses}
            checkIconPosition="right"
            nothingFoundMessage={
              userAddresses && userAddresses.length === 0
                ? "No saved addresses found"
                : "Loading..."
            }
          />

          <Textarea
            label="Additional Notes"
            placeholder="E.g., 'Leave at front desk', 'Call upon arrival'"
            value={retrievalNotes}
            onChange={(e) => setRetrievalNotes(e.currentTarget.value)}
            minRows={3}
            leftSectionProps={{
              style: { alignItems: "flex-start", paddingTop: "8px" },
            }}
          />

          <Group justify="flex-end" mt="lg">
            <Button
              variant="default"
              onClick={() => setRetrievalModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestRetrieval}
              loading={actionLoading}
              leftSection={<IconTruckDelivery size={16} />}
            >
              Submit Request
            </Button>
          </Group>
        </Stack>
      </Modal>
      {/* Scan Modal */}
      <Modal
        opened={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title={
          <Group gap="xs">
            <IconScan size={20} color="var(--mantine-color-grape-6)" />
            <Text fw={600}>Request Scan</Text>
          </Group>
        }
        centered
        closeOnClickOutside
      >
        <Stack gap="md" py="sm">
          <Text size="sm" c="dimmed">
            Request a digital scan of the contents of this mail item. You can
            provide specific instructions below (e.g., &quot;Scan only the first
            page&quot;).
          </Text>

          <Textarea
            label="Scan Instructions (Optional)"
            placeholder="E.g., 'Scan all pages', 'Color scan preferred'"
            value={scanInstructions}
            onChange={(e) => setScanInstructions(e.currentTarget.value)}
            minRows={3}
          />

          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={() => setScanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestScan}
              loading={actionLoading}
              color="grape"
              leftSection={<IconScan size={16} />}
            >
              Submit Request
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
