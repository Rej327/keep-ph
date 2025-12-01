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
  Menu,
  Tooltip,
  SegmentedControl,
  Modal,
  Textarea,
} from "@mantine/core";
import {
  IconSearch,
  IconFilter,
  IconSortDescending,
  IconSortAscending,
  IconMail,
  IconX,
  IconTruckDelivery,
  IconFileShredder,
  IconRefresh,
  IconRestore,
} from "@tabler/icons-react";
import useSWR from "swr";
import useAuthStore from "@/zustand/stores/useAuthStore";
import {
  getUserFullDetails,
  getMailItemsByUser,
  MailItem,
} from "@/actions/supabase/get";
import {
  markMailItemAsUnread,
  setMailItemArchiveStatus,
  requestMailItemDisposal,
  requestMailItemRetrieval,
} from "@/actions/supabase/update";
import { notifications } from "@mantine/notifications";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import { DataTableColumn } from "mantine-datatable";
import { getStatusFormat } from "@/utils/function";

export default function MailroomClient() {
  const user = useAuthStore((state) => state.user);
  const [selectedItem, setSelectedItem] = useState<MailItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewContentMode, setViewContentMode] = useState<"unopened" | "opened">(
    "unopened"
  );
  const [actionLoading, setActionLoading] = useState(false);

  // Modal States
  const [disposalModalOpen, setDisposalModalOpen] = useState(false);
  const [retrievalModalOpen, setRetrievalModalOpen] = useState(false);

  // Retrieval Form State
  const [retrievalAddress, setRetrievalAddress] = useState("");
  const [retrievalNotes, setRetrievalNotes] = useState("");

  // Fetch User Details
  const { data: userDetails, isLoading: loadingDetails } = useSWR(
    user?.id ? ["user-details", user.id] : null,
    () => getUserFullDetails(user!.id)
  );

  // Fetch Mail Items
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

  const handleMarkAsUnread = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await markMailItemAsUnread(selectedItem.mail_item_id);
      notifications.show({ message: "Marked as unread", color: "green" });
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

  // Set initial address when opening retrieval modal
  const openRetrievalModal = () => {
    if (userDetails?.virtual_address?.virtual_address_address) {
      setRetrievalAddress(userDetails.virtual_address.virtual_address_address);
    }
    setRetrievalModalOpen(true);
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
        accessor: "mail_item_sender",
        title: "Mail Details",
        render: (record) => (
          <Box
            onClick={
              record.mail_item_status_value?.toLowerCase() !== "disposed"
                ? () => {
                    setSelectedItem(record);
                    // Reset view mode based on availability
                    if (record.mail_attachment_item_scan_file_path) {
                      setViewContentMode("opened");
                    } else {
                      setViewContentMode("unopened");
                    }
                  }
                : undefined
            }
            style={{
              cursor:
                record.mail_item_status_value?.toLowerCase() !== "disposed"
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Text fw={600} truncate>
                {record.mail_item_sender || "Unknown Sender"}
              </Text>
              <Badge
                size="sm"
                variant="light"
                color={getStatusFormat(record.mail_item_status_value)}
              >
                {record.mail_item_status_value}
              </Badge>
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
    return mailItems
      .filter((item) => {
        const matchesSearch =
          (item.mail_item_sender?.toLowerCase() || "").includes(
            searchTerm.toLowerCase()
          ) ||
          (item.mailbox_label?.toLowerCase() || "").includes(
            searchTerm.toLowerCase()
          );
        const matchesStatus = statusFilter
          ? item.mail_item_status_value === statusFilter
          : true;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.mail_item_received_at).getTime();
        const dateB = new Date(b.mail_item_received_at).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
  }, [mailItems, searchTerm, statusFilter, sortOrder]);

  const handleRefresh = () => {
    mutate();
  };

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
        <Grid.Col span={selectedItem ? 5 : 12}>
          <Paper withBorder p="md" radius="md">
            {/* Filters */}
            <Group mb="md" justify="space-between">
              <Group>
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <Button
                      variant="default"
                      leftSection={<IconFilter size={16} />}
                    >
                      Filter
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Status</Menu.Label>
                    <Menu.Item onClick={() => setStatusFilter(null)}>
                      All
                    </Menu.Item>
                    <Menu.Item onClick={() => setStatusFilter("received")}>
                      New / Received
                    </Menu.Item>
                    <Menu.Item onClick={() => setStatusFilter("archived")}>
                      Archived
                    </Menu.Item>
                    <Menu.Item onClick={() => setStatusFilter("sorted")}>
                      Sorted
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                <Button
                  variant="default"
                  leftSection={
                    sortOrder === "desc" ? (
                      <IconSortDescending size={16} />
                    ) : (
                      <IconSortAscending size={16} />
                    )
                  }
                  onClick={() =>
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                  }
                >
                  Sort
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
            />
          </Paper>
        </Grid.Col>

        {/* Detail Column */}
        {selectedItem && (
          <Grid.Col span={7}>
            <Paper withBorder p="lg" radius="md" h="100%">
              <Group justify="space-between" mb="md" align="flex-start">
                <Box>
                  <Title order={3}>
                    {selectedItem.mail_item_sender || "Unknown Sender"}
                  </Title>
                  <Text size="sm" c="dimmed">
                    Received on{" "}
                    {new Date(
                      selectedItem.mail_item_received_at
                    ).toLocaleDateString()}
                  </Text>
                  <Badge
                    mt="xs"
                    color={getStatusFormat(selectedItem.mail_item_status_value)}
                  >
                    {selectedItem.mail_item_status_value}
                  </Badge>
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

              {/* Image Preview Switch */}
              <Group justify="center" mb="md">
                <SegmentedControl
                  value={viewContentMode}
                  onChange={(value) =>
                    setViewContentMode(value as "unopened" | "opened")
                  }
                  data={[
                    { label: "Unopened Scan", value: "unopened" },
                    {
                      label: "Opened Content",
                      value: "opened",
                      disabled:
                        !selectedItem.mail_attachment_item_scan_file_path,
                    },
                  ]}
                  size="md"
                />
              </Group>

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
                  variant="light"
                  leftSection={<IconMail size={16} />}
                  onClick={handleMarkAsUnread}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  Mark as Unread
                </Button>

                <Button
                  variant="light"
                  color="orange"
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

                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconFileShredder size={16} />}
                  onClick={() => setDisposalModalOpen(true)}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  Request Disposal
                </Button>
                <Button
                  variant="filled"
                  color="blue"
                  leftSection={<IconTruckDelivery size={16} />}
                  onClick={openRetrievalModal}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  Request Retrieval
                </Button>
              </Group>
            </Paper>
          </Grid.Col>
        )}
      </Grid>

      {/* Disposal Modal */}
      <Modal
        opened={disposalModalOpen}
        onClose={() => setDisposalModalOpen(false)}
        title="Request Disposal"
        centered
        closeOnClickOutside
      >
        <Text mb="md">
          Are you sure you want to request disposal for this item? This action
          cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDisposalModalOpen(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleRequestDisposal}
            loading={actionLoading}
          >
            Confirm Disposal
          </Button>
        </Group>
      </Modal>

      {/* Retrieval Modal */}
      <Modal
        opened={retrievalModalOpen}
        onClose={() => setRetrievalModalOpen(false)}
        title="Request Retrieval"
        size="lg"
        centered
        closeOnClickOutside
      >
        <Stack>
          <TextInput
            label="Delivery Address"
            placeholder="Enter full address"
            value={retrievalAddress}
            onChange={(e) => setRetrievalAddress(e.currentTarget.value)}
          />

          <Textarea
            label="Follow-up Address / Notes"
            placeholder="Additional instructions or secondary address details"
            value={retrievalNotes}
            onChange={(e) => setRetrievalNotes(e.currentTarget.value)}
            minRows={2}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setRetrievalModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRequestRetrieval} loading={actionLoading}>
              Submit Request
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
