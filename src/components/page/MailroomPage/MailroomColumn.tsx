import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Box, Text, Paper, Group } from "@mantine/core";
import { MailroomColumn as ColumnType, MailItem } from "./types";
import MailroomCard from "./MailroomCard";
import { UserFullDetails } from "@/actions/supabase/get";

type MailroomColumnProps = {
  column: ColumnType;
  items: MailItem[];
  userDetails: UserFullDetails;
  onMoveClick: (itemId: string) => void;
};

export default function MailroomColumn({
  column,
  items,
  // userDetails,
  onMoveClick,
}: MailroomColumnProps) {
  // const mailCount = items.filter((i) => i.mail_item_type === "MAIL").length;
  // const packageCount = items.filter(
  //   (i) => i.mail_item_type === "PACKAGE"
  // ).length;

  // Calculate limits based on current count + remaining space
  // const mailLimit = column.account_max_quantity_storage;
  // const packageLimit = column.account_max_parcel_handling;

  // Calculate remaining space
  // const mailRemaining =
  //   column.mail_remaining !== undefined ? column.mail_remaining : 0;
  // const packageRemaining =
  //   column.package_remaining !== undefined ? column.package_remaining : 0;
  // const mailFontWeight = mailCount === mailLimit ? "bold" : "normal";
  // const mailFontColor = mailCount === mailLimit ? "red" : "dimmed";
  // const mailIsFull = mailCount === mailLimit ? "Full" : "";

  // const packageFontWeight = packageCount === packageLimit ? "bold" : "normal";
  // const packageFontColor = packageCount === packageLimit ? "red" : "dimmed";
  // const packageIsFull = packageCount === packageLimit ? "Full" : "";

  return (
    <Paper
      p="md"
      radius="md"
      bg="white"
      h="100%"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Group justify="space-between" align="center">
        <Text fw={700} size="lg" mb="xs">
          {column.title}
        </Text>

        {/* <Group mb="md" gap="lg">
          <Group gap={4}>
            <IconMail size={16} color="gray" />
            <Text size="sm" c={mailFontColor} fw={mailFontWeight}>
              {mailCount}/{mailLimit} {mailIsFull}
            </Text>
          </Group>
          {userDetails.account.account_type_sort_order >= 3 && (
            <Group gap={4}>
              <IconPackage size={16} color="gray" />
              <Text size="sm" c={packageFontColor} fw={packageFontWeight}>
                {packageCount}/{packageLimit} {packageIsFull}
                ({packageRemaining} free)
              </Text>
            </Group>
          )}
        </Group> */}
      </Group>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              flexGrow: 1,
              minHeight: 100,
              padding: 4,
              backgroundColor: snapshot.isDraggingOver
                ? "var(--mantine-color-gray-0)"
                : "transparent",
              borderRadius: 8,
              border:
                items.length === 0
                  ? "1px dashed var(--mantine-color-gray-4)"
                  : undefined,
            }}
          >
            {items.length === 0 && !snapshot.isDraggingOver && (
              <Text size="sm" c="dimmed" ta="center" mt="xl">
                Drop mail items here
              </Text>
            )}

            {items.map((item, index) => (
              <MailroomCard
                key={item.mail_item_id}
                item={item}
                index={index}
                onMoveClick={onMoveClick}
              />
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </Paper>
  );
}
