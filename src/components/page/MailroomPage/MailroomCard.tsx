import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Paper, Text, Group, Badge, ActionIcon } from "@mantine/core";
import { IconArrowsMove } from "@tabler/icons-react";
import { MailItem } from "./types";

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
            backgroundColor: snapshot.isDragging ? "#ecececff" : "#fcfcfcff",
            boxShadow: snapshot.isDragging
              ? "var(--mantine-shadow-md)"
              : undefined,
            cursor: "grab",
          }}
        >
          <Group justify="space-between" align="flex-start" mb="sm" c="dimmed">
            <div style={{ flex: 1 }}>
              <Text fw={700} size="md" lineClamp={1}>
                {item.mail_item_sender || "Unknown Sender"}
              </Text>
              <Text size="sm" c="dimmed">
                Received:{" "}
                {new Date(item.mail_item_received_at).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </Text>
            </div>
            <ActionIcon
              variant="subtle"
              color="blue"
              size="md"
              onClick={() => onMoveClick(item.mail_item_id)}
              hiddenFrom="sm"
            >
              <IconArrowsMove size={18} />
            </ActionIcon>
          </Group>

          <Group gap="xs">
            <Badge variant="light" color="gray" radius="sm" tt="capitalize">
              {item.mail_item_type.toLowerCase()}
            </Badge>
            <Badge variant="light" color="blue" radius="sm" tt="capitalize">
              {item.mail_item_status_value}
            </Badge>
          </Group>
        </Paper>
      )}
    </Draggable>
  );
}
