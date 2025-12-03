import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Paper, Text, Group, Badge, ActionIcon } from "@mantine/core";
import { IconArrowsMove } from "@tabler/icons-react";
import { MailItem } from "./data";

type MailroomCardProps = {
  item: MailItem;
  index: number;
  onMoveClick: (itemId: string) => void;
};

export default function MailroomCard({
  item,
  index,
  onMoveClick,
}: MailroomCardProps) {
  return (
    <Draggable draggableId={item.mail_item_id} index={index}>
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          p="md"
          radius="md"
          withBorder
          mb="sm"
          style={{
            ...provided.draggableProps.style,
            backgroundColor: snapshot.isDragging
              ? "var(--mantine-color-blue-0)"
              : "white",
            boxShadow: snapshot.isDragging
              ? "var(--mantine-shadow-md)"
              : undefined,
            cursor: "grab",
          }}
        >
          <Group justify="space-between" align="flex-start" mb="xs">
            <div style={{ flex: 1 }}>
              <Text fw={700} size="sm" lineClamp={1}>
                {item.mail_item_sender || "Unknown Sender"}
              </Text>
              <Text size="xs" c="dimmed" fw={500}>
                #{item.mail_item_id.split("-")[1] || item.mail_item_id}
              </Text>
            </div>
            <ActionIcon
              variant="subtle"
              color="blue"
              size="sm"
              onClick={() => onMoveClick(item.mail_item_id)}
              hiddenFrom="sm"
            >
              <IconArrowsMove size={16} />
            </ActionIcon>
          </Group>

          <Text size="xs" c="dimmed" mb="md">
            Received:{" "}
            {new Date(item.mail_item_received_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>

          <Group gap="xs">
            <Badge
              variant="light"
              color="gray"
              size="sm"
              radius="sm"
              tt="capitalize"
            >
              {item.mail_item_type.toLowerCase()}
            </Badge>
            <Badge
              variant="light"
              color="blue"
              size="sm"
              radius="sm"
              tt="capitalize"
            >
              {item.mail_item_status_value}
            </Badge>
          </Group>
        </Paper>
      )}
    </Draggable>
  );
}
