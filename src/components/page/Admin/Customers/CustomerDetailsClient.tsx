"use client";

import {
  Container,
  Grid,
  Paper,
  Text,
  Group,
  Stack,
  Avatar,
  Button,
  Badge,
  Title,
  Table,
  Box,
  Center,
} from "@mantine/core";
import {
  IconPlayerPause,
  IconRefresh,
  IconHistory,
  IconTrash,
} from "@tabler/icons-react";
import useSWR from "swr";
import {
  getAdminCustomerDetails,
  AdminCustomerDetails,
} from "@/actions/supabase/get";
import { getStatusFormat, replaceUnderscore } from "@/utils/function";
import CustomLoader from "@/components/common/CustomLoader";

export default function CustomerDetailsClient({
  customerId,
}: {
  customerId: string;
}) {
  const { data, isLoading, error } = useSWR<AdminCustomerDetails>(
    ["admin-customer-details", customerId],
    () => getAdminCustomerDetails(customerId)
  );

  if (isLoading) {
    return (
      <Center h="100vh">
        <CustomLoader />
      </Center>
    );
  }

  if (error || !data) {
    return (
      <Container fluid py="xl">
        <Text c="red">Error loading customer details</Text>
      </Container>
    );
  }

  const { customer, subscription, mail_history } = data;

  return (
    <Container fluid py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group>
            <Avatar
              src={customer.avatar_url}
              size={60}
              color="blue"
              radius="xl"
            >
              {customer.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)}
            </Avatar>
            <Stack gap={0}>
              <Title order={2}>{customer.full_name}</Title>
            </Stack>
          </Group>
          <Group>
            <Button color="yellow" leftSection={<IconPlayerPause size={16} />}>
              Suspend Account
            </Button>
          </Group>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="lg">
              {/* Customer Information */}
              <Paper p="lg" radius="md" withBorder>
                <Title order={4} mb="md">
                  Customer Information
                </Title>
                <Grid>
                  <Grid.Col span={6}>
                    <Stack gap={4}>
                      <Text size="sm" c="dimmed">
                        Full Name
                      </Text>
                      <Text fw={500}>{customer.full_name}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Stack gap={4}>
                      <Text size="sm" c="dimmed">
                        Email Address
                      </Text>
                      <Text fw={500}>{customer.email}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Stack gap={4}>
                      <Text size="sm" c="dimmed">
                        Phone Number
                      </Text>
                      <Text fw={500}>{customer.phone || "N/A"}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Stack gap={4}>
                      <Text size="sm" c="dimmed">
                        Mailing Address
                      </Text>
                      <Text fw={500}>{customer.address || "N/A"}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Stack gap={4}>
                      <Text size="sm" c="dimmed">
                        Account No.
                      </Text>
                      <Text fw={500}>{customer.account_number}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Stack gap={4}>
                      <Text size="sm" c="dimmed">
                        Date Joined
                      </Text>
                      <Text fw={500}>
                        {new Date(customer.date_joined).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Stack gap={4}>
                      <Text size="sm" c="dimmed">
                        Verification Status
                      </Text>
                      <Badge color={customer.is_verified ? "green" : "red"}>
                        {customer.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </Stack>
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* Mail History */}
              <Paper p="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Stack gap={0}>
                    <Title order={4}>Mail History</Title>
                    <Text size="sm" c="dimmed">
                      Recent mail items received for this customer.
                    </Text>
                  </Stack>
                  <Button variant="subtle" size="xs">
                    View All Mail
                  </Button>
                </Group>

                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>MAIL ID</Table.Th>
                      <Table.Th>DATE RECEIVED</Table.Th>
                      <Table.Th>SENDER</Table.Th>
                      <Table.Th>STATUS</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {mail_history.length > 0 ? (
                      mail_history.map((item) => (
                        <Table.Tr key={item.mail_item_id}>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {item.mail_item_id.substring(0, 8).toUpperCase()}
                              ...
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {new Date(
                                item.mail_item_received_at
                              ).toLocaleDateString()}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {item.mail_item_sender || "Unknown Sender"}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              size="sm"
                              color={getStatusFormat(
                                item.mail_item_status_value
                              )}
                            >
                              {replaceUnderscore(item.mail_item_status_value)}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    ) : (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Text ta="center" c="dimmed" size="sm" py="md">
                            No mail history found.
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg">
              {/* Subscription Details */}
              <Paper p="lg" radius="md" withBorder>
                <Title order={4} mb="md">
                  Subscription Details
                </Title>
                <Stack gap="md">
                  <Box>
                    <Text size="sm" c="dimmed">
                      Subscription Type
                    </Text>
                    <Text fw={600} size="lg">
                      {replaceUnderscore(subscription.type)}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Subscription Status
                    </Text>
                    <Badge mt={4} color={getStatusFormat(subscription.status)}>
                      {replaceUnderscore(subscription.status)}
                    </Badge>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Next Billing Date
                    </Text>
                    <Text fw={500}>
                      {subscription.next_billing_date
                        ? new Date(
                            subscription.next_billing_date
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "N/A"}
                    </Text>
                  </Box>
                  <Button variant="default" fullWidth mt="xs">
                    Change Subscription
                  </Button>
                </Stack>
              </Paper>

              {/* Admin Tools */}
              <Paper p="lg" radius="md" withBorder>
                <Title order={4} mb="md">
                  Admin Tools
                </Title>
                <Stack gap="sm">
                  <Button
                    variant="subtle"
                    justify="flex-start"
                    leftSection={<IconRefresh size={18} />}
                  >
                    Send Password Reset
                  </Button>
                  <Button
                    variant="subtle"
                    justify="flex-start"
                    leftSection={<IconHistory size={18} />}
                  >
                    View Login History
                  </Button>
                  <Button
                    variant="subtle"
                    color="red"
                    justify="flex-start"
                    leftSection={<IconTrash size={18} />}
                  >
                    Delete Account
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
