"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { useSWRConfig } from "swr";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
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
  Stack,
  Title,
  Divider,
  Alert,
  Overlay,
  Container,
  Progress,
  Box,
} from "@mantine/core";
import { IconCreditCard } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  addMailboxesToAccount,
  checkAndProvisionSubscription,
} from "@/actions/supabase/post";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status");
    const paymentFlow = sessionStorage.getItem("payment_flow");

    if (status === "success" && paymentFlow === "add_mailbox") {
      sessionStorage.removeItem("payment_flow");
      const handleSuccess = async () => {
        notifications.show({
          title: "Payment Successful",
          message: "Mailbox has been added successfully!",
          color: "green",
          autoClose: 5000,
        });
        setIsAddMailboxModalOpen(false);

        // Trigger server-side provision check based on DB state
        await checkAndProvisionSubscription(user.id);

        mutate(["user-full-details", user.id]);
        router.replace("/customer/subscription");
      };
      handleSuccess();
    } else if (status === "failed" && paymentFlow === "add_mailbox") {
      sessionStorage.removeItem("payment_flow");
      notifications.show({
        title: "Payment Failed",
        message: "Your payment could not be processed. Please try again.",
        color: "red",
        autoClose: 10000,
      });
      router.replace("/customer/subscription");
    }
  }, [searchParams, router, user.id, mutate]);

  const [isAddMailboxModalOpen, setIsAddMailboxModalOpen] = useState(false);
  const [numMailboxes, setNumMailboxes] = useState<number>(0);
  const [mailAccessLimit, setMailAccessLimit] = useState<UserMailAccessLimit>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const { data: existingMailbox } = useSWR(
    user ? ["existing-mailbox", user.id] : null,
    () => filterExistingLabel()
  );

  const handleAddMailboxesOpen = async () => {
    if (!userDetails?.account.account_type) return;

    setLoading(true);
    setNumMailboxes(0);
    setActiveStep(0);

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
        message: "Error preparing mailbox addition",
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

    if (numMailboxes <= 0) {
      notifications.show({
        message: "Please select at least 1 mailbox to add.",
        color: "red",
      });
      setIsSubmitting(false);
      return;
    }

    if (numMailboxes > remainingAccess) {
      notifications.show({
        message: `You can only add up to ${remainingAccess} mailboxes.`,
        color: "red",
      });
      setIsSubmitting(false);
      return;
    }

    // Generate mailboxes automatically
    const mailboxes: string[] = [];
    let addedCount = 0;
    for (let page = 1; page <= 4; page++) {
      if (addedCount >= numMailboxes) break;
      const letter = String.fromCharCode(65 + (page - 1));
      for (let i = 1; i <= 15; i++) {
        if (addedCount >= numMailboxes) break;
        const id = `${letter}${i}`;

        // Check if occupied
        const isOccupied = existingMailbox?.some((m) => m.mailbox_label === id);
        if (isOccupied) continue;

        mailboxes.push(id);
        addedCount++;
      }
    }

    const availableMailboxCount = mailboxes.length;

    if (availableMailboxCount < numMailboxes) {
      notifications.show({
        message: `Only ${availableMailboxCount} mailboxes are available. Please select fewer mailboxes.`,
        color: "red",
      });
      setIsSubmitting(false);
      return;
    }

    const currentPlan = plans?.find(
      (p) => p.id === userDetails?.account.account_type
    );
    const pricePerMailbox = currentPlan?.price ?? 0;
    const totalAmount = pricePerMailbox * numMailboxes; // Amount in pesos

    const mailboxPayload = mailboxes.map((label) => ({
      mailbox_status_id: "MBS-ACTIVE",
      mailbox_label: label,
      mailbox_mail_remaining_space:
        mailAccessLimit?.account_max_quantity_storage || 0,
      mailbox_package_remaining_space:
        mailAccessLimit?.account_max_parcel_handling || 0,
    }));

    // If free or price is 0, just add directly
    if (totalAmount === 0) {
      try {
        const result = await addMailboxesToAccount({
          accountId: userDetails.account.account_id,
          mailboxes: mailboxPayload,
        });

        if (result.error) throw result.error;

        notifications.show({
          message: `${availableMailboxCount} mailboxes added successfully`,
          color: "green",
        });

        mutate(["user-full-details", user.id]);
        setIsAddMailboxModalOpen(false);
        setNumMailboxes(0);
        setActiveStep(0);
      } catch (error) {
        console.error("Error adding mailboxes:", error);
        notifications.show({
          message: "Error adding mailboxes",
          color: "red",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Handle Payment
    try {
      const response = await fetch("/api/pay/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: currentPlan?.id || "ADD-ON",
          amount: Math.round(totalAmount * 100), // Cents
          plan_name: `Additional Mailboxes (${numMailboxes})`,
          numMailboxes: numMailboxes,
          provisioning_data: {
            action: "ADD_MAILBOX", // Marker for webhook (optional usage)
            account_id: userDetails.account.account_id,
            mailbox: mailboxPayload,
          },
        }),
      });

      const result = await response.json();

      if (result.error) throw new Error(result.error);

      if (result.checkout_url) {
        sessionStorage.setItem("payment_flow", "add_mailbox");
        window.location.href = result.checkout_url;
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error initiating payment:", error);
      notifications.show({
        message: "Payment initialization failed",
        color: "red",
      });
    }
  };

  const nextStep = () =>
    setActiveStep((current) => (current < 1 ? current + 1 : current));
  const prevStep = () =>
    setActiveStep((current) => (current > 0 ? current - 1 : current));

  const loadingOverlay = loading ? (
    <Overlay>
      <CustomLoader />
    </Overlay>
  ) : null;

  const renderMailboxSummary = () => {
    const currentPlan = plans?.find(
      (p) => p.id === userDetails?.account.account_type
    );
    const totalPrice = (currentPlan?.price ?? 0) * numMailboxes;

    return (
      <Stack align="center" gap="md" w="100%">
        <Title order={4}>Mailbox Addition Summary</Title>
        <Card withBorder radius="md" w="100%" p="lg">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text c="dimmed">Current Plan</Text>
              <Text fw={600}>{currentPlan?.name}</Text>
            </Group>
            <Group justify="space-between">
              <Text c="dimmed">Mailboxes to Add</Text>
              <Text fw={600}>{numMailboxes} mailboxes</Text>
            </Group>
            <Group justify="space-between">
              <Text c="dimmed">Price per Mailbox</Text>
              <Text fw={600}>₱{currentPlan?.price.toLocaleString()}/mo</Text>
            </Group>
            <Group justify="space-between">
              <Text c="dimmed">Total Monthly Cost</Text>
              <Text fw={600}>₱{totalPrice.toLocaleString()}/mo</Text>
            </Group>
          </Stack>
        </Card>
        <Text c="dimmed" size="sm" ta="center">
          This will be added to your existing subscription billing cycle.
        </Text>
      </Stack>
    );
  };

  const renderAddMailboxSelection = () => {
    const remainingAccess =
      userDetails?.account.account_remaining_mailbox_access ?? 0;

    return (
      <Stack align="center" gap="md" w="100%">
        <Title order={4}>Add More Mailboxes</Title>
        <Text c="dimmed" size="sm" ta="center">
          Choose how many mailboxes you want to add.
        </Text>

        <Group justify="center" gap="md">
          <Button
            variant="light"
            size="sm"
            onClick={() => setNumMailboxes(Math.max(0, numMailboxes - 1))}
            disabled={numMailboxes <= 0}
          >
            -
          </Button>
          <Text size="lg" fw={600}>
            {numMailboxes}
          </Text>
          <Button
            variant="light"
            size="sm"
            onClick={() =>
              setNumMailboxes(Math.min(remainingAccess, numMailboxes + 1))
            }
            disabled={numMailboxes >= remainingAccess}
          >
            +
          </Button>
        </Group>
      </Stack>
    );
  };

  const addMailboxModal = (
    <Modal
      opened={isAddMailboxModalOpen}
      onClose={() => {
        setIsAddMailboxModalOpen(false);
        setNumMailboxes(0);
        setActiveStep(0);
      }}
      size="lg"
      centered
      padding="xl"
      radius="lg"
      closeOnClickOutside={false}
      title="Request More Storage"
    >
      <Stack gap="xl">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Step {activeStep + 1} of 2
            </Text>
            <Text size="sm" c="dimmed">
              {activeStep === 0 && "Select Mailboxes"}
              {activeStep === 1 && "Review Summary"}
            </Text>
          </Group>
          <Progress
            value={((activeStep + 1) / 2) * 100}
            size="lg"
            radius="xl"
          />
        </Stack>

        <Box py="md">
          {activeStep === 0 && renderAddMailboxSelection()}
          {activeStep === 1 && renderMailboxSummary()}
        </Box>

        <Group justify="space-between" mt="md">
          <Button
            variant="default"
            onClick={prevStep}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          {activeStep < 1 ? (
            <Button onClick={nextStep} disabled={numMailboxes === 0}>
              Next
            </Button>
          ) : (
            <Button onClick={processAddMailboxes} loading={isSubmitting}>
              Confirm Addition
            </Button>
          )}
        </Group>
      </Stack>
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
                disabled={userDetails.account.account_type_value === "free"}
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
