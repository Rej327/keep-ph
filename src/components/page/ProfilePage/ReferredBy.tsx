"use client";

import { Paper, Title, Group, TextInput } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";

type Props = {
  referredBy: string | null;
};

export default function ReferredBy({ referredBy }: Props) {
  if (!referredBy) return null;

  return (
    <Paper p="xl" radius="md" withBorder mt="lg">
      <Title order={4} mb="md">
        Referred By
      </Title>
      <Group>
        <TextInput
          label="Referred By"
          value={referredBy}
          readOnly
          variant="filled"
          w="100%"
          leftSection={<IconUser size={16} />}
        />
      </Group>
    </Paper>
  );
}
