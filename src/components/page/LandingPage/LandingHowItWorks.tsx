import {
  Container,
  Title,
  Text,
  SimpleGrid,
  ThemeIcon,
  Stack,
  rem,
} from "@mantine/core";
import { IconMail, IconScan, IconDeviceLaptop } from "@tabler/icons-react";

const steps = [
  {
    icon: IconMail,
    title: "Step 1: Mail Arrives",
    description:
      "Your mail is sent to your new secure digital address provided by Keep PH.",
    color: "blue",
  },
  {
    icon: IconScan,
    title: "Step 2: We Scan & Notify",
    description:
      "We scan the exterior and notify you immediately. You decide if we open and scan the contents.",
    color: "cyan",
  },
  {
    icon: IconDeviceLaptop,
    title: "Step 3: You Manage Online",
    description:
      "Access your mail online. Request to forward, shred, or store any item with one click.",
    color: "indigo",
  },
];

export function LandingHowItWorks() {
  return (
    <Container size="xl" py={80} id="how-it-works">
      <Stack align="center" mb={50}>
        <Title order={2} ta="center">
          How It Works
        </Title>
        <Text c="dimmed" ta="center" maw={600}>
          Get started in just three simple steps.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing={50}>
        {steps.map((step, index) => (
          <Stack key={index} align="center" gap="md">
            <ThemeIcon
              size={80}
              radius="50%"
              variant="light"
              color={step.color}
            >
              <step.icon
                style={{ width: rem(40), height: rem(40) }}
                stroke={1.5}
              />
            </ThemeIcon>
            <Title order={4} ta="center">
              {step.title}
            </Title>
            <Text c="dimmed" ta="center" size="sm" maw={300}>
              {step.description}
            </Text>
          </Stack>
        ))}
      </SimpleGrid>
    </Container>
  );
}
