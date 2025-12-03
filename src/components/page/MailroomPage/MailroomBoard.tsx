"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import {
  Container,
  Grid,
  Title,
  Button,
  Group,
  Alert,
  Select,
  Text,
  SegmentedControl,
  Modal,
  UnstyledButton,
  Box,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconMail,
  IconPackage,
  IconArrowRight,
  IconArrowsMove,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import useSWR from "swr";
import useAuthStore from "@/zustand/stores/useAuthStore";
import { getUserFullDetails } from "@/actions/supabase/get";
import {
  getMailroomData,
  updateMailItemLocations,
  MailItemMove,
} from "@/actions/supabase/mailroom";
import { MailroomData } from "./data";
import MailroomColumn from "./MailroomColumn";

export default function MailroomBoard() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<MailroomData | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedMoveItemId, setSelectedMoveItemId] = useState<string | null>(
    null
  );
  const [unsavedMoves, setUnsavedMoves] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: userDetails } = useSWR(
    user?.id ? ["user-details", user.id] : null,
    () => getUserFullDetails(user!.id)
  );

  const {
    data: serverData,
    isLoading,
    mutate,
  } = useSWR(
    userDetails?.account.account_id
      ? ["mailroom-data", userDetails.account.account_id]
      : null,
    () => getMailroomData(userDetails!.account.account_id),
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (serverData) {
      if (Object.keys(unsavedMoves).length === 0) {
        // Process the data to ensure mail_remaining and package_remaining are set correctly
        const processedData = { ...serverData };

        // For each column, set mail_remaining and package_remaining from the first item in the column
        Object.keys(processedData.columns).forEach((columnId) => {
          const column = processedData.columns[columnId];
          const columnItems = column.itemIds.map(
            (id) => processedData.items[id]
          );

          if (columnItems.length > 0) {
            const firstItem = columnItems[0];
            if (column.mail_remaining === undefined) {
              column.mail_remaining = firstItem.mailbox_mail_remaining_space;
            }
            if (column.package_remaining === undefined) {
              column.package_remaining =
                firstItem.mailbox_package_remaining_space;
            }
          }
        });

        setData(processedData);
      }
    }
  }, [serverData, unsavedMoves]);

  const handleMoveClick = (itemId: string) => {
    setSelectedMoveItemId(itemId);
    setMoveModalOpen(true);
  };

  const handleMoveConfirm = (targetColumnId: string) => {
    if (!selectedMoveItemId || !data) return;

    // Find current column of the item
    let sourceColumnId = "";
    Object.entries(data.columns).forEach(([colId, col]) => {
      if (col.itemIds.includes(selectedMoveItemId)) {
        sourceColumnId = colId;
      }
    });

    if (!sourceColumnId || sourceColumnId === targetColumnId) {
      setMoveModalOpen(false);
      setSelectedMoveItemId(null);
      return;
    }

    const startColumn = data.columns[sourceColumnId];
    const endColumn = data.columns[targetColumnId];
    const item = data.items[selectedMoveItemId];
    const isMail = item.mail_item_type === "MAIL";

    // Check if the target column would exceed its limits
    const targetItems = endColumn.itemIds.map((id) => data.items[id]);
    const mailCountInTarget = targetItems.filter(
      (i) => i.mail_item_type === "MAIL"
    ).length;
    const packageCountInTarget = targetItems.filter(
      (i) => i.mail_item_type === "PACKAGE"
    ).length;
    const mailLimit = endColumn.account_max_quantity_storage;
    const packageLimit = endColumn.account_max_parcel_handling;

    if (isMail && mailCountInTarget + 1 > mailLimit) {
      notifications.show({
        message: "Cannot move: Target mailbox is full for mail items.",
        color: "red",
      });
      setMoveModalOpen(false);
      setSelectedMoveItemId(null);
      return;
    }

    if (!isMail && packageCountInTarget + 1 > packageLimit) {
      notifications.show({
        message: "Cannot move: Target mailbox is full for packages.",
        color: "red",
      });
      setMoveModalOpen(false);
      setSelectedMoveItemId(null);
      return;
    }

    const newStartItemIds = Array.from(startColumn.itemIds).filter(
      (id) => id !== selectedMoveItemId
    );
    const newStart = {
      ...startColumn,
      itemIds: newStartItemIds,
      mail_remaining: isMail
        ? (startColumn.mail_remaining !== undefined
            ? startColumn.mail_remaining
            : 0) + 1
        : startColumn.mail_remaining,
      package_remaining: !isMail
        ? (startColumn.package_remaining !== undefined
            ? startColumn.package_remaining
            : 0) + 1
        : startColumn.package_remaining,
    };

    const newEndItemIds = Array.from(endColumn.itemIds);
    newEndItemIds.push(selectedMoveItemId);
    const newEnd = {
      ...endColumn,
      itemIds: newEndItemIds,
      mail_remaining: isMail
        ? (endColumn.mail_remaining !== undefined
            ? endColumn.mail_remaining
            : 0) - 1
        : endColumn.mail_remaining,
      package_remaining: !isMail
        ? (endColumn.package_remaining !== undefined
            ? endColumn.package_remaining
            : 0) - 1
        : endColumn.package_remaining,
    };

    setData((prev) =>
      prev
        ? {
            ...prev,
            columns: {
              ...prev.columns,
              [newStart.id]: newStart,
              [newEnd.id]: newEnd,
            },
          }
        : null
    );

    setUnsavedMoves((prev) => ({
      ...prev,
      [selectedMoveItemId]: targetColumnId,
    }));

    setMoveModalOpen(false);
    setSelectedMoveItemId(null);
  };

  const handleSaveChanges = async () => {
    if (Object.keys(unsavedMoves).length === 0) return;
    setIsSaving(true);

    const moves: MailItemMove[] = Object.entries(unsavedMoves).map(
      ([itemId, colId]) => ({
        mail_item_id: itemId,
        mailbox_id: colId,
      })
    );

    try {
      await updateMailItemLocations(moves);
      notifications.show({
        message: "Changes saved successfully",
        color: "green",
      });
      setUnsavedMoves({});
      mutate(); // Refresh from server
    } catch (error) {
      console.error(error);
      notifications.show({ message: "Failed to save changes", color: "red" });
    } finally {
      setIsSaving(false);
    }
  };

  const getColumnStats = (columnId: string) => {
    if (!data) return { mailCount: 0, packageCount: 0 };
    const column = data.columns[columnId];
    const items = column.itemIds.map((id) => data.items[id]);
    const mailCount = items.filter((i) => i.mail_item_type === "MAIL").length;
    const packageCount = items.filter(
      (i) => i.mail_item_type === "PACKAGE"
    ).length;
    return { mailCount, packageCount };
  };

  const onDragEnd = (result: DropResult) => {
    if (!data) return;
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const startColumn = data.columns[source.droppableId];
    const endColumn = data.columns[destination.droppableId];

    // Moving within the same column
    if (startColumn === endColumn) {
      const newItemIds = Array.from(startColumn.itemIds);
      newItemIds.splice(source.index, 1);
      newItemIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...startColumn,
        itemIds: newItemIds,
      };

      setData((prev) =>
        prev
          ? {
              ...prev,
              columns: {
                ...prev.columns,
                [newColumn.id]: newColumn,
              },
            }
          : null
      );
      return;
    }

    // Moving from one column to another
    const item = data.items[draggableId];
    const isMail = item.mail_item_type === "MAIL";

    // Check if the target column would exceed its limits
    const targetItems = endColumn.itemIds.map((id) => data.items[id]);
    const mailCountInTarget = targetItems.filter(
      (i) => i.mail_item_type === "MAIL"
    ).length;
    const packageCountInTarget = targetItems.filter(
      (i) => i.mail_item_type === "PACKAGE"
    ).length;
    const mailLimit = endColumn.account_max_quantity_storage;
    const packageLimit = endColumn.account_max_parcel_handling;

    if (isMail && mailCountInTarget + 1 > mailLimit) {
      notifications.show({
        message: "Cannot move: Target mailbox is full for mail items.",
        color: "red",
      });
      return;
    }

    if (!isMail && packageCountInTarget + 1 > packageLimit) {
      notifications.show({
        message: "Cannot move: Target mailbox is full for packages.",
        color: "red",
      });
      return;
    }

    const startItemIds = Array.from(startColumn.itemIds);
    startItemIds.splice(source.index, 1);
    const newStart = {
      ...startColumn,
      itemIds: startItemIds,
      mail_remaining: isMail
        ? (startColumn.mail_remaining !== undefined
            ? startColumn.mail_remaining
            : 0) + 1
        : startColumn.mail_remaining,
      package_remaining: !isMail
        ? (startColumn.package_remaining !== undefined
            ? startColumn.package_remaining
            : 0) + 1
        : startColumn.package_remaining,
    };

    const endItemIds = Array.from(endColumn.itemIds);
    endItemIds.splice(destination.index, 0, draggableId);
    const newEnd = {
      ...endColumn,
      itemIds: endItemIds,
      mail_remaining: isMail
        ? (endColumn.mail_remaining !== undefined
            ? endColumn.mail_remaining
            : 0) - 1
        : endColumn.mail_remaining,
      package_remaining: !isMail
        ? (endColumn.package_remaining !== undefined
            ? endColumn.package_remaining
            : 0) - 1
        : endColumn.package_remaining,
    };

    setData((prev) =>
      prev
        ? {
            ...prev,
            columns: {
              ...prev.columns,
              [newStart.id]: newStart,
              [newEnd.id]: newEnd,
            },
          }
        : null
    );

    setUnsavedMoves((prev) => ({
      ...prev,
      [draggableId]: endColumn.id,
    }));
  };

  if (isLoading || !data) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  const hasUnsavedChanges = Object.keys(unsavedMoves).length > 0;

  return (
    <Container fluid p="md">
      {/* Header */}
      <Group justify="space-between" align="center" mb="lg">
        <Group>
          <Title order={2}>Mailroom</Title>
          <SegmentedControl
            data={["All", "Mail", "Packages"]}
            defaultValue="All"
          />
          <Select
            placeholder="All Status"
            data={["All Status", "Received", "Processing", "Shipped"]}
            defaultValue="All Status"
            w={150}
          />
        </Group>
        <Group>
          <Text size="sm" c="dimmed">
            Remaining Access:{" "}
            <Text span fw={700} c="dark">
              {userDetails?.account.account_remaining_mailbox_access !==
              undefined
                ? userDetails.account.account_remaining_mailbox_access
                : "-"}
            </Text>
          </Text>
          <Button
            color="blue"
            onClick={handleSaveChanges}
            loading={isSaving}
            disabled={!hasUnsavedChanges}
          >
            Save Changes
          </Button>
        </Group>
      </Group>

      {/* Alert */}
      <Alert
        variant="light"
        color="yellow"
        title="Staging Mode"
        icon={<IconInfoCircle />}
        mb="xl"
        styles={{
          root: { backgroundColor: "#FFF9DB", borderColor: "transparent" },
          title: { color: "#E67700", fontWeight: 700 },
          message: { color: "#E67700" },
        }}
      >
        All changes made by dragging and dropping mail items are temporary.
        Click &apos;Save Changes&apos; to confirm your new mailroom
        organization.
      </Alert>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Grid gutter="md">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            const items = column.itemIds.map((itemId) => data.items[itemId]);

            return (
              <Grid.Col key={column.id} span={{ base: 12, md: 6, lg: 3 }}>
                <MailroomColumn
                  column={column}
                  items={items}
                  userDetails={userDetails!}
                  onMoveClick={handleMoveClick}
                />
              </Grid.Col>
            );
          })}
        </Grid>
      </DragDropContext>

      {/* Move Modal */}
      <Modal
        opened={moveModalOpen}
        onClose={() => {
          setMoveModalOpen(false);
          setSelectedMoveItemId(null);
        }}
        title={
          <Group gap="xs">
            <IconArrowsMove size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={700} size="lg">
              Move Item
            </Text>
          </Group>
        }
        centered
        size="lg"
        radius="md"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      >
        {selectedMoveItemId && (
          <Box mb="md">
            <Text size="sm" c="dimmed">
              Moving item:
            </Text>
            <Text fw={600}>
              {data.items[selectedMoveItemId]?.mail_item_sender ||
                "Unknown Item"}
            </Text>
          </Box>
        )}

        <Text fw={500} mb="xs">
          Select Destination Mailbox:
        </Text>
        <Grid gutter="sm">
          {data.columnOrder.map((colId) => {
            const col = data.columns[colId];
            const stats = getColumnStats(colId);
            const isCurrent = col.itemIds.includes(selectedMoveItemId || "");

            if (isCurrent) return null;

            return (
              <Grid.Col key={colId} span={6}>
                <UnstyledButton
                  onClick={() => handleMoveConfirm(colId)}
                  w="100%"
                  p="md"
                  style={{
                    backgroundColor: "white",
                    borderRadius: "var(--mantine-radius-md)",
                    border: "1px solid var(--mantine-color-gray-3)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--mantine-color-blue-5)";
                    e.currentTarget.style.backgroundColor =
                      "var(--mantine-color-blue-0)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "var(--mantine-shadow-xs)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--mantine-color-gray-3)";
                    e.currentTarget.style.backgroundColor = "white";
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={700} size="md" c="dark">
                      {col.title}
                    </Text>
                    <IconArrowRight
                      size={18}
                      color="var(--mantine-color-gray-5)"
                    />
                  </Group>

                  <Group gap="sm">
                    <Group gap={4}>
                      <IconMail size={14} color="var(--mantine-color-gray-6)" />
                      <Text size="sm" c="dimmed">
                        {stats.mailCount} Mail
                      </Text>
                    </Group>
                    <Group gap={4}>
                      <IconPackage
                        size={14}
                        color="var(--mantine-color-gray-6)"
                      />
                      <Text size="sm" c="dimmed">
                        {stats.packageCount} Pkg
                      </Text>
                    </Group>
                  </Group>
                </UnstyledButton>
              </Grid.Col>
            );
          })}
        </Grid>
      </Modal>
    </Container>
  );
}
