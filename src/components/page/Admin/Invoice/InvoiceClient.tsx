"use client";

import {
  Container,
  Title,
  Text,
  Group,
  Select,
  Badge,
  Stack,
  TextInput,
  Box,
  Grid,
  Paper,
  SimpleGrid,
  ThemeIcon,
  rem,
} from "@mantine/core";
import { CustomDataTable } from "@/components/common/CustomDataTable";
import {
  getAllPayments,
  getPaymentStats,
  PaymentApiResponse,
  PaymentStats,
} from "@/actions/supabase/get";
import { useState } from "react";
import useSWR from "swr";
import { getStatusFormat, replaceUnderscore } from "@/utils/function";
import {
  IconReceipt,
  IconCurrencyPeso,
  IconCheck,
  IconX,
  IconUser,
  IconCreditCard,
  IconFileInfo,
} from "@tabler/icons-react";
import { DataTableColumn } from "mantine-datatable";

export default function InvoiceClient() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentApiResponse | null>(null);

  // Fetch payments
  const {
    data: payments,
    error,
    isLoading,
  } = useSWR<PaymentApiResponse[]>(
    ["payments", search, statusFilter, sortOrder],
    () =>
      getAllPayments({
        search,
        status_filter: statusFilter,
        sort_order: sortOrder,
      }),
    { revalidateOnFocus: false }
  );

  // Fetch stats
  const { data: stats } = useSWR<PaymentStats>(
    ["payment-stats"],
    () => getPaymentStats(),
    { revalidateOnFocus: false }
  );

  const transformedData = payments || [];

  const columns: DataTableColumn<PaymentApiResponse>[] = [
    {
      accessor: "user_full_name",
      title: "CUSTOMER",
      render: (record) => (
        <Stack gap={0}>
          <Text size="sm" fw={500}>
            {record.user_full_name}
          </Text>
          <Text size="xs" c="dimmed">
            {record.user_email}
          </Text>
        </Stack>
      ),
    },
    {
      accessor: "total_amount",
      title: "TOTAL AMOUNT",
      render: (record) => (
        <Text size="sm" fw={600}>
          ₱{(record.total_amount / 100).toLocaleString()}
        </Text>
      ),
    },
    {
      accessor: "status",
      title: "LATEST STATUS",
      render: (record) => (
        <Badge color={getStatusFormat(record.status)} size="sm" variant="light">
          {replaceUnderscore(record.status)}
        </Badge>
      ),
    },
    {
      accessor: "last_payment_at",
      title: "LAST PAYMENT",
      render: (record) => (
        <Text size="sm" c="dimmed">
          {new Date(record.last_payment_at).toLocaleDateString()}
        </Text>
      ),
    },
  ];

  const StatCard = ({
    title,
    value,
    icon,
    color,
    subtext,
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtext?: string;
  }) => (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
            {title}
          </Text>
          <Text fw={700} fz="xl">
            {value}
          </Text>
          {subtext && (
            <Text c="dimmed" fz="xs" mt={4}>
              {subtext}
            </Text>
          )}
        </div>
        <ThemeIcon
          color={color}
          variant="light"
          style={{
            color,
          }}
          size={38}
          radius="md"
        >
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );

  return (
    <Container fluid py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={2}>Invoice & Payments</Title>
            <Text c="dimmed">
              Monitor revenue and manage customer payment records.
            </Text>
          </Box>
        </Group>

        {/* Stats Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <StatCard
            title="Total Revenue"
            value={`₱${((stats?.total_revenue || 0) / 100).toLocaleString()}`}
            icon={
              <IconCurrencyPeso style={{ width: rem(20), height: rem(20) }} />
            }
            color="teal"
            subtext="All time succeeded payments"
          />
          <StatCard
            title="Total Transactions"
            value={stats?.total_transactions || 0}
            icon={<IconReceipt style={{ width: rem(20), height: rem(20) }} />}
            color="blue"
          />
          <StatCard
            title="Successful"
            value={stats?.successful_transactions || 0}
            icon={<IconCheck style={{ width: rem(20), height: rem(20) }} />}
            color="green"
          />
          <StatCard
            title="Failed/Pending"
            value={stats?.failed_transactions || 0}
            icon={<IconX style={{ width: rem(20), height: rem(20) }} />}
            color="red"
          />
        </SimpleGrid>

        <Grid gutter="md">
          {/* Left Column: Data Table */}
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Stack gap="md">
              <Group gap="md">
                <TextInput
                  placeholder="Search by name, email, or ID..."
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Select
                  placeholder="Status"
                  data={[
                    { value: "", label: "All Statuses" },
                    { value: "succeeded", label: "Succeeded" },
                    { value: "pending", label: "Pending" },
                    { value: "failed", label: "Failed" },
                  ]}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value || "")}
                  w={150}
                />
                <Select
                  placeholder="Sort"
                  data={[
                    { value: "desc", label: "Newest First" },
                    { value: "asc", label: "Oldest First" },
                  ]}
                  value={sortOrder}
                  onChange={(value) => setSortOrder(value as "asc" | "desc")}
                  w={150}
                />
              </Group>

              <CustomDataTable
                records={transformedData}
                columns={columns}
                idAccessor="user_id"
                isRecordLoading={isLoading}
                pageSize={10}
                rowStyle={() => ({ cursor: "pointer" })}
                onRowClick={(record) => setSelectedPayment(record)}
                selectedRecordId={selectedPayment?.user_id}
              />

              {error && (
                <Text c="red" ta="center">
                  Error loading payments: {error.message}
                </Text>
              )}
            </Stack>
          </Grid.Col>

          {/* Right Column: Details & History */}
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="md">
              <Paper withBorder p="md" radius="md">
                <Title order={4} mb="md">
                  Customer Summary
                </Title>
                {selectedPayment ? (
                  <Stack gap="sm">
                    <Box>
                      <Text
                        size="xs"
                        c="dimmed"
                        tt="uppercase"
                        fw={700}
                        mb="xs"
                      >
                        Customer Information
                      </Text>
                      <Group gap="xs" mb={4}>
                        <IconUser size={14} style={{ opacity: 0.7 }} />
                        <Text size="sm">{selectedPayment.user_full_name}</Text>
                      </Group>
                      <Group gap="xs">
                        <IconCreditCard size={14} style={{ opacity: 0.7 }} />
                        <Text size="sm">{selectedPayment.user_email}</Text>
                      </Group>
                    </Box>

                    <Group justify="space-between" mt="xs">
                      <Text size="sm" c="dimmed">
                        Total Spent
                      </Text>
                      <Text size="lg" fw={700}>
                        ₱{(selectedPayment.total_amount / 100).toLocaleString()}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Latest Payment
                      </Text>
                      <Text size="sm">
                        {new Date(
                          selectedPayment.last_payment_at
                        ).toLocaleString()}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Latest Status
                      </Text>
                      <Badge
                        color={getStatusFormat(selectedPayment.status)}
                        size="sm"
                        variant="light"
                      >
                        {replaceUnderscore(selectedPayment.status)}
                      </Badge>
                    </Group>
                  </Stack>
                ) : (
                  <Stack align="center" py="xl" c="dimmed">
                    <IconUser size={48} stroke={1.5} />
                    <Text size="sm">Select a customer to view details</Text>
                  </Stack>
                )}
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Title order={4} mb="md">
                  Payment History
                </Title>
                {selectedPayment ? (
                  <Stack
                    gap="md"
                    style={{ maxHeight: "400px", overflowY: "auto" }}
                  >
                    {selectedPayment.history.map((payment) => (
                      <Paper
                        key={payment.payment_id}
                        withBorder
                        p="sm"
                        radius="sm"
                      >
                        <Group
                          justify="space-between"
                          align="flex-start"
                          mb="xs"
                        >
                          <Box>
                            <Text
                              size="sm"
                              fw={500}
                              style={{ fontFamily: "monospace" }}
                            >
                              {payment.intent_id.slice(0, 16)}...
                            </Text>
                            <Text size="xs" c="dimmed">
                              {new Date(payment.created_at).toLocaleString()}
                            </Text>
                          </Box>
                          <Badge
                            color={getStatusFormat(payment.status)}
                            size="xs"
                            variant="light"
                          >
                            {replaceUnderscore(payment.status)}
                          </Badge>
                        </Group>
                        <Group justify="space-between" align="center">
                          <Group gap={4}>
                            <IconFileInfo size={14} style={{ opacity: 0.7 }} />
                            <Text size="xs">
                              {payment.subscription_plan
                                ? replaceUnderscore(payment.subscription_plan)
                                : "N/A"}
                            </Text>
                          </Group>
                          <Text size="sm" fw={600}>
                            ₱{(payment.amount / 100).toLocaleString()}
                          </Text>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    Select a customer to view payment history
                  </Text>
                )}
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
