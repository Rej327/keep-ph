"use client";

import useAuthStore from "@/zustand/stores/useAuthStore";
import {
  Container,
  Grid,
  Card,
  Text,
  Title,
  Group,
  Stack,
  TextInput,
  Button,
  CopyButton,
  Badge,
  // ActionIcon,
  rem,
} from "@mantine/core";
import {
  IconCopy,
  IconCheck,
  // IconMail,
  // IconMessageCircle,
  // IconShare,
} from "@tabler/icons-react";
import { useShallow } from "zustand/shallow";
import useSWR from "swr";
import { getUserReferrals } from "@/actions/supabase/get";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import { getStatusFormat, replaceUnderscore } from "@/utils/function";

export default function ReferralClient() {
  // In a real app, we'd fetch the user's referral code
  const user = useAuthStore(useShallow((state) => state.user));
  const referralLink = user?.email as string;

  const { data: referrals, isLoading } = useSWR(
    user ? ["user-referrals", user.id] : null,
    ([, userId]) => getUserReferrals(userId)
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2}>Refer Friends, Get Rewarded</Title>
          <Text c="dimmed">
            Share your link to give friends a discount and earn rewards.
          </Text>
        </div>

        <Grid>
          <Grid.Col span={12}>
            <Stack gap="md">
              {/* Share Link Section */}
              <Card withBorder radius="md" p="xl">
                <Stack gap="md">
                  <div>
                    <Title order={4}>Share Your Unique Link</Title>
                    <Text c="dimmed" size="sm" mt={4}>
                      Copy your personal referral link and share it with
                      friends. They&apos;ll get a special offer, and you&apos;ll
                      earn rewards when they sign up!
                    </Text>
                  </div>

                  <Group gap="xs">
                    <TextInput
                      value={referralLink}
                      readOnly
                      style={{ flex: 1 }}
                      leftSection={
                        <IconCopy style={{ width: rem(16), height: rem(16) }} />
                      }
                    />
                    <CopyButton value={referralLink} timeout={2000}>
                      {({ copied, copy }) => (
                        <Button
                          color={copied ? "teal" : "blue"}
                          onClick={copy}
                          leftSection={
                            copied ? (
                              <IconCheck style={{ width: rem(16) }} />
                            ) : (
                              <IconCopy style={{ width: rem(16) }} />
                            )
                          }
                        >
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      )}
                    </CopyButton>
                  </Group>

                  {/* <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      Share via:
                    </Text>
                    <ActionIcon variant="light" color="gray" radius="xl">
                      <IconMail style={{ width: rem(18) }} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="gray" radius="xl">
                      <IconMessageCircle style={{ width: rem(18) }} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="gray" radius="xl">
                      <IconShare style={{ width: rem(18) }} />
                    </ActionIcon>
                  </Group> */}
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>

        {/* Referral History */}
        <Card withBorder radius="md" p="xl">
          <Stack gap="md">
            <div>
              <Title order={4}>Your Referral History</Title>
              <Text c="dimmed" size="sm">
                Track the status of your invitations and rewards
              </Text>
            </div>

            <CustomDataTable
              records={referrals || []}
              idAccessor="referral_id"
              isRecordLoading={isLoading}
              columns={[
                {
                  accessor: "invitee_email",
                  title: "INVITEE'S EMAIL",
                  render: ({ invitee_email }) => {
                    if (!invitee_email) return "-";
                    const emailStr = invitee_email as string;
                    const [name, domain] = emailStr.split("@");
                    return `${name.slice(0, 2)}**@${domain}`;
                  },
                },
                {
                  accessor: "status",
                  title: "STATUS",
                  render: ({ status }) => (
                    <Badge
                      variant="light"
                      color={getStatusFormat((status as string) || "")}
                    >
                      {replaceUnderscore((status as string) || "Pending")}
                    </Badge>
                  ),
                },
                {
                  accessor: "account_type_value",
                  title: "PLAN",
                  render: ({ account_type_value }) => (
                    <Badge variant="outline" color="blue">
                      {replaceUnderscore(account_type_value as string) ||
                        "NO SUBSCRIPTION"}
                    </Badge>
                  ),
                },
                {
                  accessor: "account_updated_at",
                  title: "DATE",
                  render: ({ account_updated_at }) =>
                    account_updated_at
                      ? new Date(
                          account_updated_at as string
                        ).toLocaleDateString()
                      : "-",
                },
                {
                  accessor: "reward",
                  title: "REWARD EARNED",
                  render: ({ status }) => (
                    <Text fw={500}>
                      {status === "active" ? (
                        "Not implemented"
                      ) : (
                        <Text c="dimmed" size="sm" span>
                          Pending
                        </Text>
                      )}
                    </Text>
                  ),
                },
              ]}
            />
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
