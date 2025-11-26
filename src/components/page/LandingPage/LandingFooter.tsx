import { Group, ActionIcon, Text, Stack, Title } from "@mantine/core";
import {
  IconBrandTwitter,
  IconBrandYoutube,
  IconBrandInstagram,
  IconMail,
} from "@tabler/icons-react";
import Link from "next/link";

const footerLinks = [
  {
    title: "Contact Us",
    links: [
      { label: "Email", link: "#" },
      { label: "admin@keep.ph", link: "#" },
      { label: "Text, Viber, or WhatsApp", link: "#" },
      { label: "(0968) 008 1818", link: "#" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer
      style={{
        backgroundColor: "#f8f9fa",
        borderTop: "1px solid #e9ecef",
        paddingTop: 60,
        paddingBottom: 60,
      }}
    >
      <Group justify="space-between" px={{ sm: 10, md: 20 }}>
        <Stack w={"50%"} gap="lg">
          <Group gap="xs">
            <IconMail size={28} color="#1966D1" />
            <Text fw={700} size="xl">
              Keep PH
            </Text>
          </Group>
          <Text size="md" c="dimmed" maw={300}>
            Your physical mailbox, reimagined for the digital age. Manage your
            mail from anywhere, anytime.
          </Text>
          <Text size="md" c="dimmed" maw={300}>
            Gold Building, 15 Annapolis St., Greenhills, San Juan, Metro Manila
          </Text>
          <Group gap={0} className="footer-social">
            <ActionIcon size="lg" color="gray" variant="subtle">
              <IconBrandTwitter size={18} stroke={1.5} />
            </ActionIcon>
            <ActionIcon size="lg" color="gray" variant="subtle">
              <IconBrandYoutube size={18} stroke={1.5} />
            </ActionIcon>
            <ActionIcon size="lg" color="gray" variant="subtle">
              <IconBrandInstagram size={18} stroke={1.5} />
            </ActionIcon>
          </Group>
        </Stack>

        {footerLinks.map((group) => (
          <Stack w={"40%"} key={group.title}>
            <Title order={5} mb="md">
              {group.title}
            </Title>
            <Stack gap="xs">
              {group.links.map((link, index) => (
                <Text
                  key={index}
                  component={Link}
                  href={link.link}
                  c="dimmed"
                  size="md"
                  style={{ textDecoration: "none" }}
                >
                  {link.label}
                </Text>
              ))}
            </Stack>
          </Stack>
        ))}
      </Group>

      <Stack
        gap="xs"
        mt={60}
        style={{ borderTop: "1px solid #e9ecef" }}
        pt="md"
        px={{ sm: 10, md: 20 }}
      >
        <Group justify="space-between">
          <Text c="dimmed" size="md">
            © 2024 Keep PH. All rights reserved.
          </Text>
          <Group gap="xs">
            <Text
              c="dimmed"
              size="md"
              component={Link}
              href="#"
              style={{ textDecoration: "none" }}
            >
              Terms
            </Text>
            <Text
              c="dimmed"
              size="md"
              component={Link}
              href="#"
              style={{ textDecoration: "none" }}
            >
              Privacy
            </Text>
          </Group>
        </Group>
      </Stack>
    </footer>
  );
}
