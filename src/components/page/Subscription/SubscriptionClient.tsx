"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import useSWR from "swr";
import {
  getUserFullDetails,
  getMailAccessLimit,
  filterExistingLabel,
  getSubscriptionPlans,
  getVirtualAddressLocations,
  SubscriptionPlan,
  VirtualAddressLocation,
} from "@/actions/supabase/get";
import {
  Container,
  Card,
  Text,
  Button,
  ThemeIcon,
  Badge,
  Progress,
  Group,
  Modal,
  Box,
  Stack,
  SimpleGrid,
  UnstyledButton,
  Title,
  Overlay,
  Loader,
} from "@mantine/core";
import { IconCheck, IconMapPin } from "@tabler/icons-react";
import CustomLoader from "@/components/common/CustomLoader";

import { notifications } from "@mantine/notifications";
import {
  createUserSubscriptionAccount,
  CreateUserSubscriptionAccount,
} from "@/actions/supabase/post";

// Removed Plan type and PLANS constant as they are now fetched from DB

export default function SubscriptionClient({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<string[]>([]);
  const [mailboxPage, setMailboxPage] = useState(1);
  const [mailAccessLimit, setMailAccessLimit] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedLocation, setSelectedLocation] =
    useState<VirtualAddressLocation | null>(null);

  const { data: userDetails, isLoading } = useSWR(
    user ? ["user-full-details", user.id] : null,
    ([, userId]) => getUserFullDetails(userId)
  );
  const { data: existingMailbox, isLoading: existingMailboxLoading } = useSWR(
    user ? ["existing-mailbox", user.id] : null,
    () => filterExistingLabel()
  );

  const { data: plans, isLoading: plansLoading } = useSWR(
    "subscription-plans",
    getSubscriptionPlans
  );

  const { data: addressLocations, isLoading: addressLocationsLoading } = useSWR(
    "virtual-address-locations",
    getVirtualAddressLocations
  );

  const processSubscription = async (
    plan: SubscriptionPlan,
    mailboxes: string[] = []
  ) => {
    setIsSubmitting(true);

    if (mailboxes.length > mailAccessLimit) {
      notifications.show({
        message: `You can only select up to ${mailAccessLimit} mailboxes for your plan.`,
        color: "red",
      });
      setIsSubmitting(false);
      return;
    }

    const availableMailboxCount = mailboxes.length;

    const defaultLocation = addressLocations?.find(
      (l) => l.mailroom_address_key === "Gold"
    );
    const locationToUse = selectedLocation || defaultLocation;

    const subscriptionData = {
      userId: user.id,
      account: {
        account_type: plan.id,
        account_is_subscribed: true,
        account_subscription_ends_at: null,
        account_remaining_mailbox_access:
          mailAccessLimit - availableMailboxCount,
        account_subscription_status_id: "SST-ACTIVE",
      },
      mailbox: mailboxes.map((mailroom) => ({
        mailbox_status_id: "MBS-ACTIVE",
        mailbox_label: mailroom,
        mailbox_space_remaining:
          userDetails?.account.account_max_quantity_storage || 0,
      })),
      virtual_address: {
        key: locationToUse?.mailroom_address_key || "Gold",
        address:
          locationToUse?.mailroom_address_value ||
          "15 Annapolis St., Greenhills, Gold Building",
      },
    };

    try {
      const result = await createUserSubscriptionAccount(
        subscriptionData as CreateUserSubscriptionAccount
      );

      if (result.error) {
        notifications.show({
          message: "Error creating subscription",
          color: "red",
        });
        setIsSubmitting(false);
        return;
      }

      notifications.show({
        message: "Subscription created successfully",
        color: "green",
      });
      console.log("Subscription created successfully:", result.data);
      setSelectedMailboxIds([]);
      setIsModalOpen(false);
      setIsSubmitting(false);
      // TODO: Redirect to success page or update UI
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error in subscription creation:", error);
      notifications.show({
        message: "An unexpected error occurred",
        color: "red",
      });
    }
  };

  const handleChoosePlan = async (plan: SubscriptionPlan) => {
    setLoading(true);
    setSelectedPlan(plan);
    setSelectedMailboxIds([]);
    setMailboxPage(1);
    setActiveStep(0);
    setSelectedLocation(null);

    try {
      const limit = await getMailAccessLimit(user.id, plan.id);
      console.log("Mail Available: ", limit);
      setMailAccessLimit(limit);

      if (plan.id === "AT-FREE") {
        // Immediate creation for AT-FREE
        await processSubscription(plan, []);
      } else {
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching plan mail access limit:", error);
      setMailAccessLimit(1); // Default fallback
      // Still open modal or try process if free?
      // If error on free plan limit fetch, maybe safer not to auto-create?
      // But assuming it works:
      if (plan.id === "AT-FREE") {
        await processSubscription(plan, []);
      } else {
        setIsModalOpen(true);
      }
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

  const nextStep = () =>
    setActiveStep((current) => (current < 2 ? current + 1 : current));
  const prevStep = () =>
    setActiveStep((current) => (current > 0 ? current - 1 : current));

  const handleConfirmSelection = async () => {
    if (selectedPlan) {
      await processSubscription(selectedPlan, selectedMailboxIds);
    }
  };

  if (isLoading || plansLoading) {
    return <CustomLoader />;
  }

  const loadingOverlay = loading ? (
    <Overlay>
      <CustomLoader />
    </Overlay>
  ) : null;

  const renderMailboxSelection = () => (
    <Stack align="center" gap="md" w="100%">
      <Title order={4}>Select Your Mailbox IDs</Title>
      <Text c="dimmed" size="sm" ta="center">
        Choose up to {mailAccessLimit} mailboxes.
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
        <SimpleGrid cols={5} spacing="xs">
          {Array.from({ length: 15 }).map((_, i) => {
            const letter = String.fromCharCode(65 + (mailboxPage - 1)); // A for page 1, B for page 2, etc.
            const number = i + 1;
            const id = `${letter}${number}`;
            const isSelected = selectedMailboxIds.includes(id);
            const isDisabled =
              (!isSelected && selectedMailboxIds.length >= mailAccessLimit) ||
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
    </Stack>
  );

  const renderVirtualAddressSelection = () => (
    <Stack align="center" gap="md" w="100%">
      <Title order={4}>Select Virtual Address Location</Title>
      <Text c="dimmed" size="sm" ta="center">
        Choose the location for your virtual address.
      </Text>
      {addressLocationsLoading ? (
        <Loader size="sm" />
      ) : (
        <Stack w="100%">
          <SimpleGrid cols={1} w="100%">
            {addressLocations?.map((loc) => (
              <UnstyledButton
                key={loc.mailroom_address_id}
                onClick={() => setSelectedLocation(loc)}
                style={{
                  border: `1px solid ${
                    selectedLocation?.mailroom_address_id ===
                    loc.mailroom_address_id
                      ? "var(--mantine-color-blue-6)"
                      : "var(--mantine-color-gray-3)"
                  }`,
                  borderRadius: "var(--mantine-radius-md)",
                  padding: "16px",
                  backgroundColor:
                    selectedLocation?.mailroom_address_id ===
                    loc.mailroom_address_id
                      ? "var(--mantine-color-blue-0)"
                      : "transparent",
                  textAlign: "left",
                }}
              >
                <Group wrap="nowrap" gap="md" align="flex-start">
                  <ThemeIcon
                    variant="light"
                    color={
                      selectedLocation?.mailroom_address_id ===
                      loc.mailroom_address_id
                        ? "blue"
                        : "gray"
                    }
                  >
                    <IconMapPin size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600}>{loc.mailroom_address_key}</Text>
                    <Text size="sm" c="dimmed">
                      {loc.mailroom_address_value}
                    </Text>
                  </Box>
                </Group>
              </UnstyledButton>
            ))}
          </SimpleGrid>
          {selectedLocation?.mailroom_address_link && (
            <Card withBorder radius="md" p={0} h={300}>
              <iframe
                src={selectedLocation.mailroom_address_link}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Card>
          )}
        </Stack>
      )}
    </Stack>
  );

  const renderSummary = () => (
    <Stack align="center" gap="md" w="100%">
      <Title order={4}>Subscription Summary</Title>
      <Card withBorder radius="md" w="100%" p="lg">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text c="dimmed">Plan</Text>
            <Text fw={600}>{selectedPlan?.name}</Text>
          </Group>
          <Group justify="space-between">
            <Text c="dimmed">Price</Text>
            <Text fw={600}>₱{selectedPlan?.price.toLocaleString()}/mo</Text>
          </Group>
          <Group justify="space-between">
            <Text c="dimmed">Location</Text>
            <Stack gap={0} align="flex-end">
              <Text fw={600}>
                {selectedLocation?.mailroom_address_key || "Not selected"}
              </Text>
              <Text size="xs" c="dimmed" maw={200} ta="right">
                {selectedLocation?.mailroom_address_value}
              </Text>
            </Stack>
          </Group>
          <Group justify="space-between" align="flex-start">
            <Text c="dimmed">Mailboxes</Text>
            <Group gap={4} justify="flex-end" style={{ maxWidth: "60%" }}>
              {selectedMailboxIds.map((id) => (
                <Badge key={id} variant="outline">
                  {id}
                </Badge>
              ))}
            </Group>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );

  const mailboxSelectionModal = (
    <Modal
      opened={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      size="lg"
      centered
      padding="xl"
      radius="lg"
      closeOnClickOutside={false}
    >
      <Stack gap="xl">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Step {activeStep + 1} of 3
            </Text>
            <Text size="sm" c="dimmed">
              {activeStep === 0 && "Select Mailbox"}
              {activeStep === 1 && "Select Address"}
              {activeStep === 2 && "Review Summary"}
            </Text>
          </Group>
          <Progress
            value={((activeStep + 1) / 3) * 100}
            size="lg"
            radius="xl"
          />
        </Stack>

        <Box py="md">
          {activeStep === 0 && renderMailboxSelection()}
          {activeStep === 1 && renderVirtualAddressSelection()}
          {activeStep === 2 && renderSummary()}
        </Box>

        <Group justify="space-between" mt="md">
          <Button
            variant="default"
            onClick={prevStep}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          {activeStep < 2 ? (
            <Button
              onClick={nextStep}
              disabled={
                (activeStep === 0 && selectedMailboxIds.length === 0) ||
                (activeStep === 1 && !selectedLocation)
              }
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleConfirmSelection} loading={isSubmitting}>
              Confirm Subscription
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );

  // if (isSubscribed) {
  //   return (
  //     <Container size="lg" py="xl">
  //       <Stack gap="lg">
  //         <div>
  //           <Title order={2}>Subscription Management</Title>
  //           <Text c="dimmed">
  //             View and manage your current subscription plan and billing
  //             details.
  //           </Text>
  //         </div>

  //         <Card withBorder radius="md" p="xl">
  //           <Stack gap="xs">
  //             <Stack gap={"xs"}>
  //               <Text c="dimmed" size="sm">
  //                 Current Plan
  //               </Text>
  //               <Group>
  //                 <Title order={3}>
  //                   {getPlanDisplayName(
  //                     userDetails?.account.account_type_value
  //                   )}
  //                 </Title>
  //                 <Badge color="green" variant="light">
  //                   Active
  //                 </Badge>
  //               </Group>
  //               <Text c="dimmed" size="sm">
  //                 Your plan expires on{" "}
  //                 {userDetails?.account.account_subscription_ends_at
  //                   ? new Date(
  //                       userDetails.account.account_subscription_ends_at
  //                     ).toLocaleDateString()
  //                   : "N/A"}
  //                 .
  //               </Text>
  //             </Stack>
  //             <Stack mt="md" justify="flex-end">
  //               <Button
  //                 variant="default"
  //                 color={colors.background}
  //                 onClick={() => {
  //                   const currentPlan = PLANS.find(
  //                     (p) => p.id === userDetails.account.account_type
  //                   );
  //                   if (currentPlan) {
  //                     handleChoosePlan(currentPlan);
  //                   }
  //                 }}
  //               >
  //                 Get More Storage
  //               </Button>
  //               {/* <Button variant="default">Change Plan</Button> */}
  //             </Stack>
  //           </Stack>
  //         </Card>

  //         <Card withBorder radius="md" p="xl">
  //           <Stack gap="md">
  //             <div>
  //               <Title order={4}>Billing Details</Title>
  //               <Text c="dimmed" size="sm">
  //                 Manage your payment methods and view your invoice history.
  //               </Text>
  //             </div>

  //             <Divider />

  //             <Group justify="space-between">
  //               <Text size="sm">Payment Method</Text>
  //               <Group>
  //                 <IconCreditCard size={20} />
  //                 <Text size="sm">Visa ending in 1234</Text>
  //                 <Text size="sm" c="blue" style={{ cursor: "pointer" }}>
  //                   Update
  //                 </Text>
  //               </Group>
  //             </Group>

  //             <Divider />

  //             <Group justify="space-between">
  //               <Text size="sm">Invoice History</Text>
  //               <Text size="sm" c="blue" style={{ cursor: "pointer" }}>
  //                 View Invoices
  //               </Text>
  //             </Group>
  //           </Stack>
  //         </Card>

  //         <Alert
  //           color="red"
  //           title="Cancel Subscription"
  //           variant="light"
  //           radius="md"
  //         >
  //           <Stack gap="xs">
  //             <Text size="sm">
  //               Cancelling your subscription will result in the loss of access
  //               to your digital mailbox and all associated services at the end
  //               of your billing cycle. This action cannot be undone.
  //             </Text>
  //             <Button color="red" w="fit-content">
  //               Cancel Subscription
  //             </Button>
  //           </Stack>
  //         </Alert>
  //       </Stack>
  //       {mailboxSelectionModal}
  //       {loadingOverlay}
  //     </Container>
  //   );
  // }

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
        {plans?.map((plan) => (
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
                <Group
                  key={feature.feature_label}
                  gap="xs"
                  align="flex-start"
                  wrap="nowrap"
                >
                  <ThemeIcon
                    size={20}
                    radius="xl"
                    color={plan.popular ? "blue" : "green"}
                    variant="light"
                  >
                    <IconCheck size={12} stroke={3} />
                  </ThemeIcon>
                  <Text size="sm">{feature.display_text}</Text>
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
              {plan.button_text || "Choose Plan"}
            </Button>
          </Card>
        ))}
      </SimpleGrid>

      {mailboxSelectionModal}
      {loadingOverlay}
    </Container>
  );
}
