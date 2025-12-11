"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import useSWR, { useSWRConfig } from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getUserFullDetails,
  getMailAccessLimit,
  filterExistingLabel,
  getSubscriptionPlans,
  getVirtualAddressLocations,
  getAllFreeSubscribers,
  SubscriptionPlan,
  VirtualAddressLocation,
  UserMailAccessLimit,
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
  Select,
} from "@mantine/core";
import { IconCheck, IconMapPin } from "@tabler/icons-react";
import CustomLoader from "@/components/common/CustomLoader";

import { notifications } from "@mantine/notifications";
import {
  createUserSubscriptionAccount,
  checkAndProvisionSubscription,
} from "@/actions/supabase/post";
import SubscriptionManagement from "./SubscriptionManagement";
import UserVerificationStep from "../AuthPage/UserVerificationStep";

export default function SubscriptionClient({ user }: { user: User }) {
  const { mutate } = useSWRConfig();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status");
    const paymentFlow = sessionStorage.getItem("payment_flow");

    if (status === "success" && paymentFlow === "new_subscription") {
      sessionStorage.removeItem("payment_flow");
      const handleSuccess = async () => {
        notifications.show({
          title: "Payment Successful",
          message: "Your Subscription has been activated!",
          color: "green",
          autoClose: 5000,
        });
        setIsModalOpen(false);

        // Trigger server-side provision check based on DB state
        await checkAndProvisionSubscription(user.id);

        // Poll for subscription status or reload user details
        mutate(["user-full-details", user.id]);

        // Clean URL
        router.replace("/customer/subscription");
      };
      handleSuccess();
    } else if (status === "failed" && paymentFlow === "new_subscription") {
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

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFreeModalOpen, setIsFreeModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [numMailboxes, setNumMailboxes] = useState<number>(0);
  const [mailAccessLimit, setMailAccessLimit] = useState<UserMailAccessLimit>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedLocation, setSelectedLocation] =
    useState<VirtualAddressLocation | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<string | null>(null);

  const { data: userDetails, isLoading: userDetailsLoading } = useSWR(
    user ? ["user-full-details", user.id] : null,
    ([, userId]) => getUserFullDetails(userId)
  );
  const { data: existingMailbox } = useSWR(
    user ? ["existing-mailbox", user.id] : null,
    () => filterExistingLabel()
  );

  const { data: plans } = useSWR("subscription-plans", getSubscriptionPlans);

  const { data: addressLocations, isLoading: addressLocationsLoading } = useSWR(
    "virtual-address-locations",
    getVirtualAddressLocations
  );

  const { data: freeSubscribers, isLoading: freeSubscribersLoading } = useSWR(
    "free-subscribers",
    getAllFreeSubscribers
  );

  const processSubscription = async (
    plan: SubscriptionPlan,
    numMailboxes: number = 0
  ) => {
    setIsSubmitting(true);

    const maxAccess = mailAccessLimit?.account_max_mailbox_access ?? 0;
    if (numMailboxes > maxAccess) {
      notifications.show({
        message: `You can only select up to ${maxAccess} mailboxes for your plan.`,
        color: "red",
      });
      setIsSubmitting(false);
      return;
    }

    // Generate mailboxes automatically
    const mailboxes: string[] = [];
    if (numMailboxes > 0) {
      let addedCount = 0;
      for (let page = 1; page <= 4; page++) {
        if (addedCount >= numMailboxes) break;
        const letter = String.fromCharCode(65 + (page - 1));
        for (let i = 1; i <= 15; i++) {
          if (addedCount >= numMailboxes) break;
          const id = `${letter}${i}`;

          // Check if occupied
          const isOccupied = existingMailbox?.some(
            (m) => m.mailbox_label === id
          );
          if (isOccupied) continue;

          mailboxes.push(id);
          addedCount++;
        }
      }
    }

    const availableMailboxCount = mailboxes.length;

    const defaultLocation = addressLocations?.find(
      (l) => l.mailroom_address_key === "Gold"
    );
    const locationToUse = selectedLocation || defaultLocation;

    const now = new Date();
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(
      now.getDate() + (mailAccessLimit?.account_duration_days ?? 0)
    );

    // Prepare Provisioning Data (Flat structure for RPC)
    const provisioningData = {
      user_id: user.id,
      referred_by: selectedReferral || null,
      account_type: plan.id,
      account_is_subscribed: true,
      account_subscription_ends_at: subscriptionEndsAt.toISOString(),
      account_remaining_mailbox_access:
        (mailAccessLimit?.account_max_mailbox_access ?? 0) -
        availableMailboxCount,
      account_subscription_status_id: "SST-ACTIVE",
      account_address_key: locationToUse?.mailroom_address_key,
      mailbox: mailboxes.map((mailroom) => ({
        mailbox_status_id: "MBS-ACTIVE",
        mailbox_label: mailroom,
        mailbox_mail_remaining_space:
          mailAccessLimit?.account_max_quantity_storage || 0,
        mailbox_package_remaining_space:
          mailAccessLimit?.account_max_parcel_handling || 0,
      })),
    };

    // Handle Free Plan
    if (plan.price === 0) {
      try {
        const result = await createUserSubscriptionAccount({
          userId: user.id,
          referralCode: selectedReferral,
          account: {
            account_type: plan.id,
            account_is_subscribed: true,
            account_subscription_ends_at: subscriptionEndsAt.toISOString(),
            account_remaining_mailbox_access:
              (mailAccessLimit?.account_max_mailbox_access ?? 0) -
              availableMailboxCount,
            account_subscription_status_id: "SST-ACTIVE",
            account_address_key: locationToUse?.mailroom_address_key || "",
          },
          mailbox: provisioningData.mailbox,
        });

        if (result.error) {
          throw result.error;
        }

        notifications.show({
          message: "Subscription created successfully",
          color: "green",
        });

        mutate(["user-full-details", user.id]);
        setNumMailboxes(0);
        setIsModalOpen(false);
        setIsFreeModalOpen(false);
        setIsSubmitting(false);
        setSelectedReferral(null);
      } catch (error) {
        setIsSubmitting(false);
        console.error("Error in subscription creation:", error);
        notifications.show({
          message: "An unexpected error occurred",
          color: "red",
        });
      }
      return;
    }

    // Handle Paid Plan via PayMongo
    try {
      const response = await fetch("/api/pay/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: plan.id,
          amount: Math.round((plan.price ?? 0) * numMailboxes * 100), // Cents
          plan_name: plan.name,
          provisioning_data: provisioningData,
        }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.checkout_url) {
        // Redirect to PayMongo
        sessionStorage.setItem("payment_flow", "new_subscription");
        window.location.href = result.checkout_url;
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error in payment initialization:", error);
      notifications.show({
        message:
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
        color: "red",
      });
    }
  };

  const handleChoosePlan = async (plan: SubscriptionPlan) => {
    // Check verification status
    if (userDetails && !userDetails.user.user_is_verified) {
      notifications.show({
        title: "Verification Required",
        message: "You need to verify your identity before purchasing a plan.",
        color: "yellow",
        autoClose: 5000,
      });
      setIsVerificationModalOpen(true);
      return;
    }

    setLoading(true);
    setSelectedPlan(plan);
    setNumMailboxes(0);
    setActiveStep(0);
    setSelectedLocation(null);

    try {
      const limit = await getMailAccessLimit(user.id, plan.id);
      console.log("Mail Available: ", limit);
      setMailAccessLimit(limit);

      if (plan.id === "AT-FREE") {
        // Immediate creation for AT-FREE
        setIsFreeModalOpen(true);
      } else {
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching plan mail access limit:", error);
      setMailAccessLimit({
        account_max_mailbox_access: 1,
        account_max_quantity_storage: 0,
        account_max_gb_storage: 0,
        account_max_parcel_handling: 0,
        account_duration_days: 0,
      }); // Default fallback
      // Still open modal or try process if free?
      // If error on free plan limit fetch, maybe safer not to auto-create?
      // But assuming it works:
      if (plan.id === "AT-FREE") {
        setIsFreeModalOpen(true);
      } else {
        setIsModalOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () =>
    setActiveStep((current) => (current < 3 ? current + 1 : current));
  const prevStep = () =>
    setActiveStep((current) => (current > 0 ? current - 1 : current));

  const handleConfirmSelection = async () => {
    if (selectedPlan) {
      await processSubscription(selectedPlan, numMailboxes);
    }
  };

  const isSubscribed = userDetails?.account?.account_is_subscribed;

  if (userDetailsLoading) {
    return <CustomLoader />;
  }

  if (isSubscribed && userDetails) {
    return (
      <SubscriptionManagement
        user={user}
        userDetails={userDetails}
        plans={plans}
      />
    );
  }

  const loadingOverlay = loading ? (
    <Overlay>
      <CustomLoader />
    </Overlay>
  ) : null;

  const renderMailboxSelection = () => (
    <Stack align="center" gap="md" w="100%">
      <Title order={4}>Select Number of Mailboxes</Title>
      <Text c="dimmed" size="sm" ta="center">
        Choose how many mailboxes you want
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
            setNumMailboxes(
              Math.min(
                mailAccessLimit?.account_max_mailbox_access ?? 0,
                numMailboxes + 1
              )
            )
          }
          disabled={
            numMailboxes >= (mailAccessLimit?.account_max_mailbox_access ?? 0)
          }
        >
          +
        </Button>
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

  const renderReferralSelection = () => (
    <Stack align="center" gap="md" w="100%">
      <Title order={4}>Referral (Optional)</Title>
      <Text c="dimmed" size="sm" ta="center">
        If you were referred by an existing user, please select their email
        below.
      </Text>
      {freeSubscribersLoading ? (
        <Loader size="sm" />
      ) : (
        <Select
          label="Referred by"
          placeholder="Select a referrer"
          data={
            freeSubscribers
              ?.filter((s) => s.user_referral_code)
              .map((s) => ({
                value: s.user_referral_code,
                label: s.user_referral_code,
              })) || []
          }
          value={selectedReferral}
          onChange={setSelectedReferral}
          searchable
          clearable
          nothingFoundMessage="No users found"
          w="100%"
          maxDropdownHeight={200}
        />
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
            <Text fw={600}>
              ₱
              {(
                (selectedPlan?.price ?? 0) * numMailboxes || 0
              ).toLocaleString()}
              /mo
            </Text>
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
          <Group justify="space-between">
            <Text c="dimmed">Mailboxes</Text>
            <Text fw={600}>{numMailboxes} mailboxes</Text>
          </Group>
          <Group justify="space-between">
            <Text c="dimmed">Referral</Text>
            <Text fw={600}>{selectedReferral || "None"}</Text>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );

  const handleConfirmFreePlan = async () => {
    if (selectedPlan) {
      await processSubscription(selectedPlan, 0);
    }
  };

  const freePlanModal = (
    <Modal
      opened={isFreeModalOpen}
      onClose={() => setIsFreeModalOpen(false)}
      centered
      radius="lg"
    >
      <Stack align="center" gap="md">
        <Title order={3}>Confirm Subscription</Title>
        <Text c="dimmed" ta="center">
          You are about to subscribe to the{" "}
          <Text span fw={700}>
            {selectedPlan?.name} Plan
          </Text>
        </Text>
        {selectedPlan?.features.map((feature) => (
          <Group
            key={feature.feature_label}
            justify="start"
            gap="xs"
            wrap="nowrap"
          >
            <ThemeIcon size={20} radius="xl" color="green" variant="light">
              <IconCheck size={12} stroke={3} />
            </ThemeIcon>
            <Text size="sm">{feature.display_text}</Text>
          </Group>
        ))}
        <Group w="100%" my="md">
          <Button
            variant="default"
            flex={1}
            onClick={() => setIsFreeModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            flex={1}
            onClick={handleConfirmFreePlan}
            loading={isSubmitting}
          >
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
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
              Step {activeStep + 1} of 4
            </Text>
            <Text size="sm" c="dimmed">
              {activeStep === 0 && "Select Address"}
              {activeStep === 1 && "Select Mailbox"}
              {activeStep === 2 && "Select Referral"}
              {activeStep === 3 && "Review Summary"}
            </Text>
          </Group>
          <Progress
            value={((activeStep + 1) / 4) * 100}
            size="lg"
            radius="xl"
          />
        </Stack>

        <Box py="md">
          {activeStep === 0 && renderVirtualAddressSelection()}
          {activeStep === 1 && renderMailboxSelection()}
          {activeStep === 2 && renderReferralSelection()}
          {activeStep === 3 && renderSummary()}
        </Box>

        <Group justify="space-between" mt="md">
          <Button
            variant="default"
            onClick={prevStep}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          {activeStep < 3 ? (
            <Button
              onClick={nextStep}
              disabled={
                (activeStep === 0 && !selectedLocation) ||
                (activeStep === 1 && numMailboxes === 0)
              }
            >
              {activeStep === 2 ? "Skip / Next" : "Next"}
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

  const verificationModal = (
    <Modal
      opened={isVerificationModalOpen}
      onClose={() => setIsVerificationModalOpen(false)}
      size="lg"
      centered
      title="Identity Verification"
    >
      <UserVerificationStep
        userId={user.id}
        onComplete={() => {
          setIsVerificationModalOpen(false);
          mutate(["user-full-details", user.id]); // Refresh user details
          notifications.show({
            message: "Verification submitted! You can now proceed.",
            color: "teal",
          });
        }}
        onSkip={() => setIsVerificationModalOpen(false)}
      />
    </Modal>
  );

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
      {freePlanModal}
      {verificationModal}
      {loadingOverlay}
    </Container>
  );
}
