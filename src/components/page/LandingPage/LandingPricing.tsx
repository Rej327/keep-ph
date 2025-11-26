"use client";

import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Card,
  Badge,
  List,
  ThemeIcon,
  rem,
  Switch,
  SimpleGrid,
  Stack,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";

const plans = [
  {
    title: "Free (Affiliate)",
    price: "0",
    description: "Earn while you refer",
    features: [
      "Affiliate link access",
      "5% cashback per referral",
      "Track your referrals",
      "No mail services",
    ],
    buttonText: "Get Started",
    buttonVariant: "default",
    highlight: false,
  },
  {
    title: "Digital",
    price: "299",
    description: "For individuals who just need their mail digitized",
    features: [
      "Mail scanning & digitization",
      "10GB digital storage",
      "7-day physical retention",
      "View all features",
    ],
    buttonText: "Choose Plan",
    buttonVariant: "light",
    highlight: false,
  },
  {
    title: "Personal",
    price: "499",
    description: "Complete mail management solution",
    features: [
      "Everything in Digital",
      "25GB digital storage",
      "Parcel handling",
      "View all features",
    ],
    buttonText: "Choose Plan",
    buttonVariant: "filled",
    highlight: true,
  },
  {
    title: "Business",
    price: "2,999",
    description: "Professional virtual office solution",
    features: [
      "Everything in Personal",
      "200GB digital storage",
      "Virtual office address",
      "View all features",
    ],
    buttonText: "Choose Plan",
    buttonVariant: "default",
    highlight: false,
  },
];

export function LandingPricing() {
  const [billing, setBilling] = useState("monthly");

  return (
    <Container bg="gray.0" fluid>
      <Container size="xl" py={80} id="pricing">
        <Stack align="center" mb={50}>
          <Title order={2} ta="center">
            Simple, Transparent Pricing
          </Title>
          <Text c="dimmed" ta="center" maw={600}>
            Choose a plan that fits your needs. No hidden fees.
          </Text>

          <Group mt="md">
            <Text
              size="sm"
              fw={500}
              c={billing === "monthly" ? "black" : "dimmed"}
            >
              Monthly
            </Text>
            <Switch
              size="md"
              checked={billing === "annually"}
              onChange={(event) =>
                setBilling(event.currentTarget.checked ? "annually" : "monthly")
              }
            />
            <Text
              size="sm"
              fw={500}
              c={billing === "annually" ? "black" : "dimmed"}
            >
              Annually
            </Text>
            <Badge variant="light" color="blue">
              Save 20%
            </Badge>
          </Group>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {plans.map((plan) => (
            <Card
              key={plan.title}
              shadow="sm"
              padding="xl"
              radius="md"
              withBorder
              style={
                plan.highlight
                  ? { borderColor: "#1966D1", borderWidth: 2 }
                  : undefined
              }
            >
              {plan.highlight && (
                <Badge
                  variant="filled"
                  color="blue"
                  style={{ position: "absolute", top: 10, right: 10 }}
                >
                  Popular
                </Badge>
              )}

              <Stack gap="xs" mb="md">
                <Text fw={700} size="lg">
                  {plan.title}
                </Text>
                <Text c="dimmed" size="xs" h={35}>
                  {plan.description}
                </Text>
              </Stack>

              <Group align="flex-end" gap={5} mb="xl">
                <Text
                  fw={700}
                  size="xl"
                  style={{ fontSize: rem(32), lineHeight: 1 }}
                >
                  P{plan.price}
                </Text>
                <Text c="dimmed" fw={500} mb={5} size="sm">
                  /month
                </Text>
              </Group>

              <List
                spacing="sm"
                size="sm"
                center
                mb="xl"
                icon={
                  <ThemeIcon color="blue" size={20} radius="xl">
                    <IconCheck
                      style={{ width: rem(12), height: rem(12) }}
                      stroke={3}
                    />
                  </ThemeIcon>
                }
              >
                {plan.features.map((feature, index) => (
                  <List.Item key={index}>{feature}</List.Item>
                ))}
              </List>

              <Button
                fullWidth
                variant={plan.buttonVariant}
                color={plan.highlight ? "blue" : "gray"}
                radius="md"
              >
                {plan.buttonText}
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Container>
  );
}
