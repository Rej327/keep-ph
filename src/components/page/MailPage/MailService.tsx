"use client";

import { colors } from "@/styles/colors";
import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  rem,
} from "@mantine/core";
import {
  IconCash,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconMailForward,
  IconNote,
  IconScan,
  IconX,
} from "@tabler/icons-react";
import React, { useState } from "react";

const services = [
  {
    id: "scanning",
    title: "Digital Mail Scanning",
    shortDescription:
      "We open, scan, and deliver your postal mail to you as a searchable PDF.",
    description:
      "Enjoy the benefits of instant access, secure digital archiving, and a clutter-free office. Our process ensures the highest level of security for your sensitive documents.",
    price: "Starts at ₱299/month",
    buttonText: "View Scanning Plans",
    icon: IconScan,
  },
  {
    id: "forwarding",
    title: "Mail Forwarding",
    shortDescription:
      "Have your mail and packages forwarded anywhere in the world.",
    description:
      "Flexible forwarding options to any address worldwide. You choose the carrier and speed.",
    price: "Pay per shipment",
    buttonText: "View Forwarding Options",
    icon: IconMailForward,
  },
  {
    id: "check-deposit",
    title: "Check Deposit",
    shortDescription:
      "We'll securely deposit checks you receive into your bank account.",
    description:
      "Secure and fast check processing directly to your bank. Never miss a deposit again.",
    price: "₱250 per check",
    buttonText: "Setup Check Deposit",
    icon: IconCash,
  },
];

const comparisonData = {
  plans: [
    { name: "Digital", price: "₱299/mo", color: "blue" },
    { name: "Personal", price: "₱499/mo", color: "red" },
    { name: "Business", price: "₱2,999/mo", color: "blue" },
  ],
  sections: [
    {
      title: "Mail Services",
      rows: [
        { feature: "Mail scanning & digitization", values: [true, true, true] },
        { feature: "Access via web app", values: [true, true, true] },
        {
          feature: "Scan quality",
          values: ["Standard quality", "High quality", "High quality"],
        },
        { feature: "Notification on new mail", values: [true, true, true] },
      ],
    },
    {
      title: "Storage",
      rows: [
        { feature: "Digital storage limit", values: ["5GB", "20GB", "200GB"] },
        {
          feature: "Digital storage duration",
          values: ["Indefinite", "Indefinite", "Indefinite"],
        },
        {
          feature: "Scanned pages (approx.)",
          values: ["~5,000 pages", "~20,000 pages", "~200,000 pages"],
        },
        {
          feature: "What happens when I exceed my storage limit?",
          values: [
            "We continue receiving and scanning your mail. You can delete old mail, or buy more storage to access your new mail.",
            "We continue receiving and scanning your mail. You can delete old mail, or buy more storage to access your new mail.",
            "We continue receiving and scanning your mail. You can delete old mail, or buy more storage to access your new mail.",
          ],
          isNote: true,
        },
        {
          feature: "Physical mail retention",
          values: ["7 days", "90 days", "365 days"],
        },
        {
          feature: "What happens when retention is reached?",
          values: [null, "We shred and dispose the mail", null],
          isNote: true,
          colSpan: [1, 2, 0], // Custom spanning if needed, or just text logic
        },
        {
          feature: "Can I pick up my mail in person?",
          values: [true, true, true],
        },
        {
          feature: "Can I have mail delivered to an address?",
          values: [true, true, true],
        },
      ],
    },
    {
      title: "Package Handling",
      rows: [
        { feature: "Parcel acceptance", values: [false, true, true] },
        { feature: "Package storage", values: [false, true, true] },
        {
          feature: "Package pickup/forwarding",
          values: [false, "Available", "Available"],
        },
      ],
    },
    {
      title: "Additional Features",
      rows: [
        { feature: "Starter kit", values: [false, true, true] },
        { feature: "Virtual office address", values: [false, false, true] },
        { feature: "Business registration use", values: [false, false, true] },
        {
          feature: "Support",
          values: ["Standard", "Standard", "Standard"],
        },
      ],
    },
    {
      title: "Usage Restrictions",
      rows: [
        { feature: "Allowed for personal use", values: [true, true, true] },
        { feature: "Allowed for business use", values: [false, false, true] },
      ],
    },
  ],
};

export default function MailService() {
  const [showComparison, setShowComparison] = useState(false);

  const renderCell = (value: boolean | string | null) => {
    if (value === true) return <IconCheck size={18} color="teal" />;
    if (value === false) return <IconX size={18} color="gray" />;
    if (value === null) return null;
    return (
      <Text size="xs" fw={500} ta="center">
        {value}
      </Text>
    );
  };

  const renderServicesContent = () => (
    <Stack gap="lg">
      {services.map((service) => (
        <Paper key={service.id} p="md" withBorder radius="md">
          <Group wrap="nowrap" align="flex-start" mb="md">
            <ThemeIcon
              size={40}
              radius="md"
              variant="light"
              color="blue"
              style={{ flexShrink: 0 }}
            >
              <service.icon
                style={{ width: rem(20), height: rem(20) }}
                stroke={1.5}
              />
            </ThemeIcon>
            <div>
              <Text fw={600} size="lg" mb={4}>
                {service.title}
              </Text>
              <Text size="sm" c="dimmed" lh={1.4}>
                {service.shortDescription}
              </Text>
            </div>
          </Group>

          <Stack gap="md" pl={56}>
            <Text size="sm" c="dimmed" lh={1.6}>
              {service.description}
            </Text>
            <Group justify="space-between" align="center">
              <Text fw={600} size="sm">
                {service.price}
              </Text>
              <Button color="#1966D1" size="sm" variant="outline">
                {service.buttonText}
              </Button>
            </Group>

            {service.id === "scanning" && (
              <Box mt="md">
                <Button
                  variant="subtle"
                  size="sm"
                  color="gray"
                  rightSection={
                    showComparison ? (
                      <IconChevronUp size={16} />
                    ) : (
                      <IconChevronDown size={16} />
                    )
                  }
                  onClick={() => setShowComparison((prev) => !prev)}
                >
                  {showComparison
                    ? "Hide detailed feature comparison"
                    : "Show detailed feature comparison"}
                </Button>

                <Collapse in={showComparison}>
                  <Paper withBorder p="md" mt="xs" radius="md" bg="gray.0">
                    <Box style={{ overflowX: "auto" }}>
                      <Table
                        highlightOnHover
                        verticalSpacing="xs"
                        withColumnBorders
                        bg="white"
                        style={{ minWidth: 700 }}
                      >
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Features</Table.Th>
                            {comparisonData.plans.map((plan) => (
                              <Table.Th key={plan.name} ta="center">
                                <Stack gap={0}>
                                  <Badge
                                    variant="filled"
                                    color={plan.color}
                                    radius="sm"
                                    size="lg"
                                    fullWidth
                                  >
                                    {plan.name}
                                  </Badge>
                                  <Text size="xs" mt={4} fw={700} c="dimmed">
                                    {plan.price}
                                  </Text>
                                </Stack>
                              </Table.Th>
                            ))}
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {comparisonData.sections.map((section) => (
                            <React.Fragment key={section.title}>
                              <Table.Tr bg="gray.1">
                                <Table.Td
                                  colSpan={4}
                                  fw={700}
                                  c="#1966D1"
                                  style={{ fontSize: "0.9rem" }}
                                >
                                  {section.title}
                                </Table.Td>
                              </Table.Tr>
                              {section.rows.map(
                                (
                                  row: {
                                    feature: string;
                                    values: (boolean | string | null)[];
                                    isNote?: boolean;
                                  },
                                  idx
                                ) => (
                                  <React.Fragment key={idx}>
                                    <Table.Tr>
                                      <Table.Td>
                                        <Text
                                          size="sm"
                                          fw={500}
                                          c={row.isNote ? "#1966D1" : "dark"}
                                          bg={
                                            row.isNote ? "#e8f0fe" : undefined
                                          }
                                          style={
                                            row.isNote
                                              ? {
                                                  display: "inline-block",
                                                  padding: "2px 4px",
                                                }
                                              : undefined
                                          }
                                        >
                                          {row.feature}
                                        </Text>
                                      </Table.Td>
                                      {row.values.map(
                                        (
                                          val: boolean | string | null,
                                          vIdx: number
                                        ) => {
                                          // Special handling for notes spanning multiple columns or specific text
                                          if (row.isNote && val === null)
                                            return <Table.Td key={vIdx} />;
                                          // Simplified logic: just render cell
                                          if (
                                            row.feature ===
                                              "What happens when retention is reached?" &&
                                            vIdx === 0
                                          )
                                            return <Table.Td key={vIdx} />;
                                          if (
                                            row.feature ===
                                              "What happens when retention is reached?" &&
                                            vIdx === 2
                                          )
                                            return <Table.Td key={vIdx} />;

                                          return (
                                            <Table.Td key={vIdx} ta="center">
                                              {row.isNote ? (
                                                <Text
                                                  size="xs"
                                                  c="white"
                                                  bg="#1966D1"
                                                  p={4}
                                                  style={{ borderRadius: 4 }}
                                                >
                                                  {val}
                                                </Text>
                                              ) : (
                                                renderCell(val)
                                              )}
                                            </Table.Td>
                                          );
                                        }
                                      )}
                                    </Table.Tr>
                                  </React.Fragment>
                                )
                              )}
                            </React.Fragment>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  </Paper>
                </Collapse>
              </Box>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );

  return (
    <Stack gap="xl" maw={1200} mx="auto" py="xl">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Title order={2}>Mailroom Service</Title>
        <Button
          component="a"
          href="/customer/subscription"
          color={colors.main}
          size="md"
          radius="md"
        >
          Subscribe to Mailroom Service
        </Button>
      </Group>

      {/* Alert Note */}
      <Alert
        variant="light"
        color="red"
        title="Note"
        icon={<IconNote size={16} />}
        radius="md"
        bg="#FFF5F5"
        styles={{
          message: { color: "#FA5252" },
          title: { color: "#FA5252" },
        }}
      >
        We have office addresses across the Philippines including Carmona, San
        Juan, Mandaluyong and more.
      </Alert>

      {/* Main Accordion */}
      <Paper radius="md" withBorder>
        <Accordion
          variant="default"
          defaultValue="document-service"
          styles={{
            item: {
              borderBottom: "1px solid #dee2e6",
            },
            control: {
              backgroundColor: "#f8f9fa",
              padding: "1rem",
              "&:hover": {
                backgroundColor: "#f1f3f5",
              },
            },
            content: {
              padding: "1.5rem",
            },
            label: {
              fontWeight: 600,
              color: "#495057",
            },
          }}
        >
          <Accordion.Item value="document-service">
            <Accordion.Control>Document Mailroom Service</Accordion.Control>
            <Accordion.Panel>{renderServicesContent()}</Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="conditions">
            <Accordion.Control>
              Document Mailroom Service Conditions
            </Accordion.Control>
            <Accordion.Panel>
              <Text c="dimmed">Conditions content goes here...</Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="benefits">
            <Accordion.Control>
              Who can benefit from a virtual mailbox?
            </Accordion.Control>
            <Accordion.Panel>
              <Text c="dimmed">Benefits content goes here...</Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="terms">
            <Accordion.Control>Terms of Service</Accordion.Control>
            <Accordion.Panel>
              <Text c="dimmed">Terms of Service content goes here...</Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="definitions">
            <Accordion.Control>Terms and Definitions</Accordion.Control>
            <Accordion.Panel>
              <Text c="dimmed">Terms and Definitions content goes here...</Text>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Paper>

      {/* <Group justify="flex-end">
        <Button color={colors.main} size="md" radius="md">
          Get Started
        </Button>
      </Group> */}
    </Stack>
  );
}
