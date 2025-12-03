"use client";

import { deleteUserFromAuth } from "@/actions/supabase/delete";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import {
  Button,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  CopyButton,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  email: string;
  userId: string;
};

export default function DeleteAccount({ email, userId }: Props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmEmail !== email) return;

    setIsLoading(true);
    try {
      // Delete user account (this calls the API route and handles signOut)
      const result = await deleteUserFromAuth(userId);

      if (result.error) {
        throw result.error;
      }

      notifications.show({
        title: "Account Deleted",
        message: "Your account has been permanently deleted.",
        color: "blue",
      });
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete account";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <Paper
        p="xl"
        radius="md"
        withBorder
        mt="lg"
        style={{ borderColor: "var(--mantine-color-red-3)" }}
      >
        <Title order={4} c="red" mb="md">
          Delete Account
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Once you delete your account, there is no going back. Please be
          certain.
        </Text>
        <Button color="red" variant="outline" onClick={open}>
          Delete Account
        </Button>
      </Paper>

      <Modal opened={opened} onClose={close} title="Delete Account" centered>
        <Stack>
          <Text size="sm">
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </Text>
          <Text size="sm" fw={500}>
            To confirm, please copy the email below and paste it in the input
            field.
          </Text>

          <Paper
            p="xs"
            bg="gray.1"
            withBorder
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text size="sm" style={{ wordBreak: "break-all" }}>
              {email}
            </Text>
            <CopyButton value={email} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip
                  label={copied ? "Copied" : "Copy"}
                  withArrow
                  position="right"
                >
                  <ActionIcon
                    color={copied ? "teal" : "gray"}
                    variant="subtle"
                    onClick={copy}
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Paper>

          <TextInput
            placeholder="Paste your email here"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.currentTarget.value)}
            error={
              confirmEmail && confirmEmail !== email
                ? "Email does not match"
                : null
            }
          />

          <Button
            color="red"
            disabled={confirmEmail !== email}
            loading={isLoading}
            onClick={handleDelete}
            fullWidth
          >
            Delete Account
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
