"use client";

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
  Progress,
  Table,
  Avatar,
  Badge,
  ActionIcon,
  ThemeIcon,
  rem,
} from "@mantine/core";
import {
  IconCopy,
  IconCheck,
  IconMail,
  IconMessageCircle,
  IconShare,
  IconTrophy,
  IconAward,
} from "@tabler/icons-react";

const MOCK_REFERRALS = [
  {
    email: "fr**@email.com",
    status: "Complete",
    date: "2023-10-25",
    reward: "$10 Credit",
  },
  {
    email: "ja**@email.com",
    status: "Complete",
    date: "2023-10-22",
    reward: "$10 Credit",
  },
  {
    email: "al**@email.com",
    status: "Signed Up",
    date: "2023-10-20",
    reward: "Pending",
  },
  {
    email: "mi**@email.com",
    status: "Invited",
    date: "2023-10-15",
    reward: "-",
  },
];

const TOP_REFERRERS = [
  { rank: 1, name: "Olivia R.", count: 24, avatar: null },
  { rank: 2, name: "Noah L.", count: 19, avatar: null },
  { rank: 3, name: "Emma P.", count: 15, avatar: null },
  { rank: 4, name: "Liam K.", count: 11, avatar: null },
  { rank: 5, name: "You", count: 5, avatar: null, isMe: true },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Complete":
      return "green";
    case "Signed Up":
      return "yellow";
    default:
      return "gray";
  }
};

export default function ReferralClient() {
  // In a real app, we'd fetch the user's referral code
  const referralLink = "https://keepph.com/ref/daniel-smith";

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
          {/* Left Column */}
          <Grid.Col span={{ base: 12, md: 8 }}>
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

                  <Group gap="xs">
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
                  </Group>
                </Stack>
              </Card>

              {/* Rewards Section */}
              <Card withBorder radius="md" p="xl">
                <Stack gap="md">
                  <Title order={4}>Unlock Your Rewards</Title>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Card bg="blue.0" radius="md" p="md">
                        <Stack gap="xs">
                          <ThemeIcon variant="light" size="lg" radius="md">
                            <IconAward />
                          </ThemeIcon>
                          <Text size="xs" c="dimmed" fw={500}>
                            Current Tier
                          </Text>
                          <Text fw={700}>Pro Referrer</Text>
                          <Text size="sm" c="dimmed">
                            5 Referrals
                          </Text>
                        </Stack>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Card withBorder radius="md" p="md">
                        <Stack gap="xs">
                          <ThemeIcon
                            variant="light"
                            color="gray"
                            size="lg"
                            radius="md"
                          >
                            <IconTrophy />
                          </ThemeIcon>
                          <Text size="xs" c="dimmed" fw={500}>
                            Next Tier
                          </Text>
                          <Text fw={700}>Expert Referrer</Text>
                          <Text size="sm" c="dimmed">
                            10 Referrals
                          </Text>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  </Grid>

                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        Progress
                      </Text>
                      <Text size="sm" c="dimmed">
                        5/10 Referrals to next tier
                      </Text>
                    </Group>
                    <Progress value={50} size="lg" radius="xl" />
                  </Stack>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>

          {/* Right Column - Top Referrers */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" p="xl" h="100%">
              <Stack gap="md">
                <Title order={4}>Top Referrers</Title>
                <Stack gap="sm">
                  {TOP_REFERRERS.map((referrer) => (
                    <Card
                      key={referrer.rank}
                      withBorder={referrer.isMe}
                      bg={referrer.isMe ? "blue.0" : "transparent"}
                      radius="md"
                      p="sm"
                      style={{
                        border: referrer.isMe
                          ? "1px solid var(--mantine-color-blue-filled)"
                          : "none",
                      }}
                    >
                      <Group justify="space-between">
                        <Group gap="sm">
                          <Avatar src={referrer.avatar} radius="xl" />
                          <Text fw={500} size="sm">
                            {referrer.rank}. {referrer.name}
                          </Text>
                        </Group>
                        <Group gap={4}>
                          {referrer.rank === 1 && (
                            <IconTrophy
                              size={14}
                              color="var(--mantine-color-yellow-6)"
                            />
                          )}
                          <Text fw={600} size="sm">
                            {referrer.count}
                          </Text>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Stack>
            </Card>
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

            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>INVITEE&apos;S EMAIL</Table.Th>
                  <Table.Th>STATUS</Table.Th>
                  <Table.Th>DATE</Table.Th>
                  <Table.Th>REWARD EARNED</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {MOCK_REFERRALS.map((referral) => (
                  <Table.Tr key={referral.email}>
                    <Table.Td>{referral.email}</Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={getStatusColor(referral.status)}
                      >
                        {referral.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td c="dimmed">{referral.date}</Table.Td>
                    <Table.Td fw={500}>
                      {referral.reward === "Pending" ? (
                        <Text c="dimmed" size="sm">
                          Pending
                        </Text>
                      ) : (
                        referral.reward
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
