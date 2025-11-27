"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import useSWR from "swr";
import {
  getUserFullDetails,
  getMailAccessLimit,
  filterExistingLabel,
} from "@/actions/supabase/get";
import {
  Container,
  Card,
  Text,
  Button,
  ThemeIcon,
  Badge,
  Group,
  Modal,
  Box,
  Stack,
  Divider,
  Alert,
  SimpleGrid,
  UnstyledButton,
  Title,
  Overlay,
  Loader,
} from "@mantine/core";
import { IconCheck, IconCreditCard, IconBox } from "@tabler/icons-react";
import CustomLoader from "@/components/common/CustomLoader";
import {
  createMailboxWithAccountUpdate,
  CreateMailboxWithAccountUpdateParams,
} from "@/actions/supabase/post";
import { notifications } from "@mantine/notifications";

type Plan = {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
  color?: string;
};

const PLANS: Plan[] = [
  {
    id: "AT-FREE",
    name: "Free",
    price: 0,
    description: "For starters and personal use.",
    features: ["1 User", "1 GB Storage", "Limited Scans"],
  },
  {
    id: "AT-DIGITAL",
    name: "Digital",
    price: 299,
    description: "Perfect for individuals going paperless.",
    features: [
      "1 User",
      "10 GB Storage",
      "Unlimited Scans",
      "Email Forwarding",
    ],
    popular: true,
    color: "blue",
  },
  {
    id: "AT-PERSONAL",
    name: "Personal",
    price: 499,
    description: "For professionals and power users.",
    features: [
      "5 Users",
      "50 GB Storage",
      "Unlimited Scans & Forwarding",
      "Shredding Service",
    ],
  },
  {
    id: "AT-BUSINESS",
    name: "Business",
    price: 2999,
    description: "For teams and small businesses.",
    features: [
      "Unlimited Users",
      "200 GB Storage",
      "All Personal Plan Features",
      "Priority Support",
    ],
  },
];

export default function SubscriptionClient({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<string[]>([]);
  const [mailboxPage, setMailboxPage] = useState(1);
  const [mailAccessLimit, setMailAccessLimit] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: userDetails, isLoading } = useSWR(
    user ? ["user-full-details", user.id] : null,
    ([, userId]) => getUserFullDetails(userId)
  );
  const { data: existingMailbox, isLoading: existingMailboxLoading } = useSWR(
    user ? ["existing-mailbox", user.id] : null,
    () => filterExistingLabel()
  );

  const handleChoosePlan = async (plan: Plan) => {
    setLoading(true);
    setSelectedPlan(plan);
    setIsModalOpen(true);
    setSelectedMailboxIds([]);
    setMailboxPage(1);

    try {
      const limit = await getMailAccessLimit(user.id, plan.id);
      console.log("Mail Available: ", limit);
      setMailAccessLimit(limit);
    } catch (error) {
      console.error("Error fetching plan mail access limit:", error);
      setMailAccessLimit(1); // Default fallback
    } finally {
      setLoading(false);
    }
  };

  const handleMailboxToggle = (id: string) => {
    setSelectedMailboxIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((mailboxId) => mailboxId !== id);
      } else if (prev.length < mailAccessLimit) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const availableMailbox = selectedMailboxIds.length;

  const handleConfirmSelection = async () => {
    setIsSubmitting(true);
    if (!selectedPlan || availableMailbox === 0) return;

    if (selectedMailboxIds.length > mailAccessLimit) {
      console.log(
        `You can only select up to ${mailAccessLimit} mailboxes for your plan.`
      );
      return;
    }

    const subscriptionData = {
      accountId: userDetails?.account.account_id,
      account: {
        account_type: selectedPlan.id,
        account_is_subscribed: true,
        account_subscription_ends_at: null,
        account_remaining_mailbox_access: mailAccessLimit - availableMailbox,
        account_subscription_status_id: "SST-ACTIVE",
      },
      mailbox: selectedMailboxIds.map((mailroom) => ({
        mailbox_account_id: userDetails?.account.account_id,
        mailbox_status_id: "MBS-ACTIVE",
        mailbox_label: mailroom,
        mailbox_space_remaining:
          userDetails?.account.account_max_quantity_storage || 5,
      })),
    };

    try {
      const result = await createMailboxWithAccountUpdate(
        subscriptionData as CreateMailboxWithAccountUpdateParams
      );

      if (result.error) {
        notifications.show({
          message: "Error creating subscription",
          color: "red",
        });

        // TODO: Show error message to user
        return;
      }

      notifications.show({
        message: "Subscription created successfully",
        color: "green",
      });
      console.log("Subscription created successfully:", result.data);
      setSelectedMailboxIds([]);
      setIsModalOpen(false);
      // TODO: Redirect to success page or update UI
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error in subscription creation:", error);
      // TODO: Show error message to user
    }
  };

  if (isLoading) {
    return <CustomLoader />;
  }

  if (loading) {
    return (
      <Overlay>
        <CustomLoader />
      </Overlay>
    );
  }

  const isSubscribed = userDetails?.account.account_is_subscribed;

  const getPlanDisplayName = (type: string | undefined) => {
    switch (type) {
      case "digital":
        return "Digital Plan";
      case "personal":
        return "Personal Plan";
      case "business":
        return "Business Plan";
      case "free":
        return "Free Plan";
      default:
        return "Pro Plan";
    }
  };

  if (isSubscribed) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="lg">
          <div>
            <Title order={2}>Subscription Management</Title>
            <Text c="dimmed">
              View and manage your current subscription plan and billing
              details.
            </Text>
          </div>

          <Card withBorder radius="md" p="xl">
            <Stack gap="xs">
              <Text c="dimmed" size="sm">
                Current Plan
              </Text>
              <Group>
                <Title order={3}>
                  {getPlanDisplayName(userDetails?.account.account_type_value)}
                </Title>
                <Badge color="green" variant="light">
                  Active
                </Badge>
              </Group>
              <Text c="dimmed" size="sm">
                Your plan renews on{" "}
                {userDetails?.account.account_subscription_ends_at
                  ? new Date(
                      userDetails.account.account_subscription_ends_at
                    ).toLocaleDateString()
                  : "N/A"}
                .
              </Text>
              <Group mt="md" justify="flex-end">
                <Button variant="default">Change Plan</Button>
              </Group>
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
                Cancelling your subscription will result in the loss of access
                to your digital mailbox and all associated services at the end
                of your billing cycle. This action cannot be undone.
              </Text>
              <Button color="red" w="fit-content">
                Cancel Subscription
              </Button>
            </Stack>
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack align="center" mb={50}>
        <Title order={1}>Find the Right Plan for You</Title>
        <Text c="dimmed" size="lg" ta="center">
          Choose a plan that fits your needs. You can always upgrade or
          downgrade later.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            padding="xl"
            radius="md"
            withBorder
            style={{
              borderColor: plan.popular
                ? "var(--mantine-color-blue-6)"
                : undefined,
              borderWidth: plan.popular ? 2 : 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {plan.popular && (
              <Badge
                variant="filled"
                color="blue"
                style={{
                  position: "absolute",
                  top: 10,
                  right: -40,
                  transform: "translateX(-50%)",
                }}
              >
                MOST POPULAR
              </Badge>
            )}

            <Text fw={700} size="xl" mt={plan.popular ? "xs" : 0}>
              {plan.name}
            </Text>
            <Text c="dimmed" size="sm" mt="xs" h={50}>
              {plan.description}
            </Text>

            <Group align="flex-end" gap={4} mt="md">
              <Text fw={700} size="xl" style={{ fontSize: 32 }}>
                ₱{plan.price.toLocaleString()}
              </Text>
              <Text c="dimmed" mb={6} size="sm">
                /month
              </Text>
            </Group>

            <Stack mt="xl" gap="md" style={{ flex: 1 }}>
              {plan.features.map((feature) => (
                <Group key={feature} gap="xs" align="flex-start" wrap="nowrap">
                  <ThemeIcon
                    size={20}
                    radius="xl"
                    color={plan.popular ? "blue" : "green"}
                    variant="light"
                  >
                    <IconCheck size={12} stroke={3} />
                  </ThemeIcon>
                  <Text size="sm">{feature}</Text>
                </Group>
              ))}
            </Stack>

            <Button
              fullWidth
              mt="xl"
              radius="md"
              variant={plan.popular ? "filled" : "light"}
              color={plan.popular ? "blue" : "gray"}
              onClick={() => handleChoosePlan(plan)}
            >
              Choose Plan
            </Button>
          </Card>
        ))}
      </SimpleGrid>

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="md"
        centered
        padding={0}
        radius="lg"
        withCloseButton={false}
      >
        <Stack align="center" p="xl" gap="md">
          <ThemeIcon size={60} radius="xl" variant="light" color="blue">
            <IconBox size={32} />
          </ThemeIcon>

          <Title order={3} ta="center">
            Select Your Mailbox IDs
          </Title>
          <Text c="dimmed" size="sm" ta="center" maw={300}>
            Choose up to {mailAccessLimit} mailboxes for your permanent mail
            storage.
          </Text>

          <Group justify="center" gap="xs">
            <Text size="sm" fw={500}>
              Selected: {selectedMailboxIds.length} / {mailAccessLimit}
            </Text>
            <Badge
              color={
                selectedMailboxIds.length === mailAccessLimit ? "green" : "blue"
              }
              size="sm"
            >
              {selectedMailboxIds.length === mailAccessLimit
                ? "Complete"
                : "Select More"}
            </Badge>
          </Group>

          <Box w="100%">
            <Text size="xs" fw={500} mb="xs">
              Available Mailbox IDs
            </Text>
            <SimpleGrid cols={5} spacing="xs">
              {Array.from({ length: 15 }).map((_, i) => {
                const letter = String.fromCharCode(65 + (mailboxPage - 1)); // A for page 1, B for page 2, etc.
                const number = i + 1;
                const id = `${letter}${number}`;
                const isSelected = selectedMailboxIds.includes(id);
                const isDisabled =
                  (!isSelected &&
                    selectedMailboxIds.length >= mailAccessLimit) ||
                  (existingMailbox &&
                    existingMailbox.some(
                      (mailbox) => mailbox.mailbox_label === id
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
                    onClick={() => !isDisabled && handleMailboxToggle(id)}
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
            <Text size="sm">Page {mailboxPage} of 25</Text>
            <UnstyledButton onClick={() => setMailboxPage((p) => p + 1)}>
              →
            </UnstyledButton>
          </Group>

          <Group w="100%" mt="md">
            <Button
              fullWidth
              onClick={handleConfirmSelection}
              disabled={selectedMailboxIds.length === 0 || isSubmitting}
            >
              {isSubmitting ? <Loader size="sm" /> : "Confirm Selection"}
            </Button>
            <Button
              disabled={isSubmitting}
              fullWidth
              variant="default"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
