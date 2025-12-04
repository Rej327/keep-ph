"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { useSWRConfig } from "swr";
import useSWR from "swr";
import {
  getMailAccessLimit,
  filterExistingLabel,
  SubscriptionPlan,
  UserMailAccessLimit,
  UserFullDetails,
} from "@/actions/supabase/get";
import {
  Card,
  Text,
  Button,
  Badge,
  Group,
  Modal,
  Box,
  Stack,
  SimpleGrid,
  UnstyledButton,
  Title,
  Divider,
  Alert,
  Overlay,
  Container,
} from "@mantine/core";
import { IconCreditCard } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { addMailboxesToAccount } from "@/actions/supabase/post";
import CustomLoader from "@/components/common/CustomLoader";

type SubscriptionManagementProps = {
  user: User;
  userDetails: UserFullDetails;
  plans: SubscriptionPlan[] | undefined;
};

export default function SubscriptionManagement({
  user,
  userDetails,
  plans,
}: SubscriptionManagementProps) {
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);
  const [isAddMailboxModalOpen, setIsAddMailboxModalOpen] = useState(false);
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<string[]>([]);
  const [mailboxPage, setMailboxPage] = useState(1);
  const [mailAccessLimit, setMailAccessLimit] = useState<UserMailAccessLimit>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: existingMailbox, isLoading: existingMailboxLoading } = useSWR(
    user ? ["existing-mailbox", user.id] : null,
    () => filterExistingLabel()
  );

  const handleAddMailboxesOpen = async () => {
    if (!userDetails?.account.account_type) return;

    setLoading(true);
    setSelectedMailboxIds([]);
    setMailboxPage(1);

    try {
      const limit = await getMailAccessLimit(
        user.id,
        userDetails.account.account_type
      );
      setMailAccessLimit(limit);
      setIsAddMailboxModalOpen(true);
    } catch (error) {
      console.error("Error fetching limits", error);
      notifications.show({
        message: "Error preparing mailbox selection",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAddMailboxes = async () => {
    if (!userDetails?.account.account_id) return;

    setIsSubmitting(true);

    const remainingAccess =
      userDetails.account.account_remaining_mailbox_access ?? 0;

    if (selectedMailboxIds.length > remainingAccess) {
      notifications.show({
        message: `You can only add up to ${remainingAccess} more mailboxes.`,
        color: "red",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await addMailboxesToAccount({
        accountId: userDetails.account.account_id,
        mailboxes: selectedMailboxIds.map((label) => ({
          mailbox_status_id: "MBS-ACTIVE",
          mailbox_label: label,
          mailbox_mail_remaining_space:
            mailAccessLimit?.account_max_quantity_storage || 0,
          mailbox_package_remaining_space:
            mailAccessLimit?.account_max_parcel_handling || 0,
        })),
      });

      if (result.error) {
        throw result.error;
      }

      notifications.show({
        message: "Mailboxes added successfully",
        color: "green",
      });

      mutate(["user-full-details", user.id]);
      setIsAddMailboxModalOpen(false);
      setSelectedMailboxIds([]);
    } catch (error) {
      console.error("Error adding mailboxes:", error);
      notifications.show({
        message: "Error adding mailboxes",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMailboxToggleAdd = (id: string) => {
    setSelectedMailboxIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((mailboxId) => mailboxId !== id);
      } else if (
        prev.length <
        (userDetails?.account.account_remaining_mailbox_access ?? 0)
      ) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleAutoSelect = () => {
    const maxAccess =
      userDetails?.account.account_remaining_mailbox_access ?? 0;
    const currentSelected = selectedMailboxIds.length;
    const needed = maxAccess - currentSelected;

    if (needed <= 0) return;

    const newSelection = [...selectedMailboxIds];
    let addedCount = 0;

    // Iterate through pages 1-4 to find available mailboxes
    for (let page = 1; page <= 4; page++) {
      if (addedCount >= needed) break;
      const letter = String.fromCharCode(65 + (page - 1));
      for (let i = 1; i <= 15; i++) {
        if (addedCount >= needed) break;
        const id = `${letter}${i}`;

        // Check if already selected
        if (newSelection.includes(id)) continue;

        // Check if occupied
        const isOccupied = existingMailbox?.some((m) => m.mailbox_label === id);
        if (isOccupied) continue;

        newSelection.push(id);
        addedCount++;
      }
    }

    setSelectedMailboxIds(newSelection);
  };

  const loadingOverlay = loading ? (
    <Overlay>
      <CustomLoader />
    </Overlay>
  ) : null;

  const renderAddMailboxSelection = () => (
    <Stack align="center" gap="md" w="100%">
      <Title order={4}>Add More Mailboxes</Title>
      <Text c="dimmed" size="sm" ta="center">
        You can add up to{" "}
        {userDetails?.account.account_remaining_mailbox_access ?? 0} more
        mailboxes.
      </Text>

      <Group justify="center" gap="xs">
        <Text size="sm" fw={500}>
          Selected: {selectedMailboxIds.length} /{" "}
          {userDetails?.account.account_remaining_mailbox_access ?? 0}
        </Text>
        <Badge
          color={
            selectedMailboxIds.length ===
            (userDetails?.account.account_remaining_mailbox_access ?? 0)
              ? "green"
              : "blue"
          }
          size="sm"
        >
          {selectedMailboxIds.length ===
          (userDetails?.account.account_remaining_mailbox_access ?? 0)
            ? "Max Reached"
            : "Select More"}
        </Badge>
      </Group>

      <Button
        variant="light"
        size="xs"
        onClick={handleAutoSelect}
        disabled={
          selectedMailboxIds.length >=
            (userDetails?.account.account_remaining_mailbox_access ?? 0) ||
          existingMailboxLoading
        }
      >
        Auto Select
      </Button>

      <Box w="100%">
        <SimpleGrid cols={5} spacing="xs">
          {Array.from({ length: 15 }).map((_, i) => {
            const letter = String.fromCharCode(65 + (mailboxPage - 1));
            const number = i + 1;
            const id = `${letter}${number}`;
            const isSelected = selectedMailboxIds.includes(id);
            const isDisabled =
              (!isSelected &&
                selectedMailboxIds.length >=
                  (userDetails?.account.account_remaining_mailbox_access ??
                    0)) ||
              (existingMailbox &&
                existingMailbox.some(
                  (mailbox: { mailbox_label: string }) =>
                    mailbox.mailbox_label === id
                ));

            let borderColor: string;
            if (isSelected) {
              borderColor = "var(--mantine-color-blue-6)";
            } else if (isDisabled) {
              borderColor = "var(--mantine-color-gray-4)";
            } else {
              borderColor = "var(--mantine-color-gray-3)";
            }

            let backgroundColor: string;
            if (isSelected) {
              backgroundColor = "var(--mantine-color-blue-0)";
            } else if (isDisabled) {
              backgroundColor = "var(--mantine-color-gray-1)";
            } else {
              backgroundColor = "transparent";
            }

            let textColor: string;
            if (isSelected) {
              textColor = "var(--mantine-color-blue-7)";
            } else if (isDisabled) {
              textColor = "var(--mantine-color-gray-5)";
            } else {
              textColor = "inherit";
            }

            return (
              <UnstyledButton
                key={id}
                onClick={() => !isDisabled && handleMailboxToggleAdd(id)}
                disabled={isDisabled || existingMailboxLoading}
                style={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: "var(--mantine-radius-md)",
                  padding: "8px",
                  textAlign: "center",
                  backgroundColor,
                  color: textColor,
                  fontWeight: isSelected ? 600 : 400,
                  opacity: isDisabled ? 0.6 : 1,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                }}
              >
                {id}
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
      </Box>

      <Group justify="center" w="100%" mt="sm">
        <UnstyledButton
          disabled={mailboxPage === 1}
          onClick={() => setMailboxPage((p) => p - 1)}
          style={{ opacity: mailboxPage === 1 ? 0.5 : 1 }}
        >
          ←
        </UnstyledButton>
        <Text size="sm">Page {mailboxPage} of 4</Text>
        <UnstyledButton
          onClick={() => setMailboxPage((p) => p + 1)}
          disabled={mailboxPage === 4}
          style={{ opacity: mailboxPage === 4 ? 0.5 : 1 }}
        >
          →
        </UnstyledButton>
      </Group>

      <Group justify="flex-end" w="100%" mt="md">
        <Button
          variant="default"
          onClick={() => setIsAddMailboxModalOpen(false)}
        >
          Cancel
        </Button>
        <Button
          onClick={processAddMailboxes}
          loading={isSubmitting}
          disabled={selectedMailboxIds.length === 0}
        >
          Confirm
        </Button>
      </Group>
    </Stack>
  );

  const addMailboxModal = (
    <Modal
      opened={isAddMailboxModalOpen}
      onClose={() => setIsAddMailboxModalOpen(false)}
      size="lg"
      centered
      padding="xl"
      radius="lg"
      closeOnClickOutside={false}
      title="Request More Storage"
    >
      {renderAddMailboxSelection()}
    </Modal>
  );

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Subscription Management</Title>
          <Text c="dimmed">
            View and manage your current subscription plan and billing details.
          </Text>
        </div>

        <Card withBorder radius="md" p="xl">
          <Stack gap="xs">
            <Stack gap={"xs"}>
              <Text c="dimmed" size="sm">
                Current Plan
              </Text>
              <Group>
                <Title order={3}>
                  {plans?.find(
                    (p) => p.id === userDetails?.account.account_type
                  )?.name || userDetails?.account.account_type}
                </Title>
                <Badge color="green" variant="light">
                  Active
                </Badge>
              </Group>
              <Text c="dimmed" size="sm">
                Your plan expires on{" "}
                {userDetails?.account.account_subscription_ends_at
                  ? new Date(
                      userDetails.account.account_subscription_ends_at
                    ).toLocaleDateString()
                  : "N/A"}
                .
              </Text>
            </Stack>
            <Stack mt="md" justify="flex-end">
              <Button
                variant="default"
                onClick={handleAddMailboxesOpen}
                disabled={
                  (userDetails?.account.account_remaining_mailbox_access ??
                    0) <= 0
                }
              >
                Request More Storage
              </Button>
              {/* <Button variant="default">Change Plan</Button> */}
            </Stack>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="xl">
          <Stack gap="md">
            <div>
              <Title order={4}>Billing Details</Title>
              <Text c="dimmed" size="sm">
                Manage your payment methods and view your invoice history.
              </Text>
            </div>

            <Divider />

            <Group justify="space-between">
              <Text size="sm">Payment Method</Text>
              <Group>
                <IconCreditCard size={20} />
                <Text size="sm">Visa ending in 1234</Text>
                <Text size="sm" c="blue" style={{ cursor: "pointer" }}>
                  Update
                </Text>
              </Group>
            </Group>

            <Divider />

            <Group justify="space-between">
              <Text size="sm">Invoice History</Text>
              <Text size="sm" c="blue" style={{ cursor: "pointer" }}>
                View Invoices
              </Text>
            </Group>
          </Stack>
        </Card>

        <Alert
          color="red"
          title="Cancel Subscription"
          variant="light"
          radius="md"
        >
          <Stack gap="xs">
            <Text size="sm">
              Cancelling your subscription will result in the loss of access to
              your digital mailbox and all associated services at the end of
              your billing cycle. This action cannot be undone.
            </Text>
            <Button color="red" w="fit-content">
              Cancel Subscription
            </Button>
          </Stack>
        </Alert>
      </Stack>
      {addMailboxModal}
      {loadingOverlay}
    </Container>
  );
}
