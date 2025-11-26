import {
  Container,
  SimpleGrid,
  Text,
  Title,
  ThemeIcon,
  Paper,
  Stack,
} from "@mantine/core";
import {
  IconScan,
  IconCloudLock,
  IconMailForward,
  IconTrash,
  IconCashBanknote,
  IconSearch,
} from "@tabler/icons-react";

const features = [
  {
    icon: IconScan,
    title: "Scan & Digitize",
    description:
      "Use our high-resolution PDF scans of your mail envelopes and contents directly to your inbox.",
    color: "blue",
  },
  {
    icon: IconCloudLock,
    title: "Secure Cloud Storage",
    description:
      "All your digital mail is stored securely in the cloud with bank-level encryption, accessible 24/7.",
    color: "cyan",
  },
  {
    icon: IconMailForward,
    title: "Mail Forwarding",
    description:
      "Need the original document? We can forward your physical mail to any address worldwide.",
    color: "indigo",
  },
  {
    icon: IconTrash,
    title: "Secure Shredding",
    description:
      "Securely dispose of unwanted physical mail with our certified shredding service.",
    color: "red",
  },
  {
    icon: IconCashBanknote,
    title: "Check Deposits",
    description:
      "We'll deposit checks you receive directly into your bank account, saving you a trip.",
    color: "green",
  },
  {
    icon: IconSearch,
    title: "Searchable Archive",
    description:
      "Find any document in seconds with our powerful full-text search capabilities.",
    color: "violet",
  },
];

export function LandingFeatures() {
  return (
    <Container bg="gray.0" fluid>
      <Container size="xl" py={80} id="features">
        <Stack align="center" mb={50}>
          <Title order={2} ta="center">
            Everything You Need for a Paperless Life
          </Title>
          <Text c="dimmed" ta="center" maw={600}>
            Our powerful features are designed to give you complete control over
            your mail, securely and efficiently.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={30}>
          {features.map((feature) => (
            <Paper
              key={feature.title}
              p="xl"
              radius="md"
              withBorder
              shadow="sm"
            >
              <ThemeIcon
                size={50}
                radius="md"
                variant="light"
                color={feature.color}
                mb="md"
              >
                <feature.icon size={28} stroke={1.5} />
              </ThemeIcon>
              <Text fw={700} size="lg" mb="xs">
                {feature.title}
              </Text>
              <Text c="dimmed" size="sm" lh={1.6}>
                {feature.description}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Container>
    </Container>
  );
}
