"use client";

import {
  Container,
  Group,
  Button,
  Text,
  Box,
  Burger,
  Drawer,
  ScrollArea,
  Divider,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { IconMail } from "@tabler/icons-react";

export function LandingHeader() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);

  return (
    <Box>
      <header
        style={{
          height: 60,
          paddingLeft: 16,
          paddingRight: 16,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%">
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <Group gap="xs" style={{ cursor: "pointer" }}>
                <IconMail size={24} color="#1966D1" />
                <Text fw={700} size="lg">
                  Keep PH
                </Text>
              </Group>
            </Link>

            <Group gap={30} visibleFrom="sm">
              <Link href="#features" style={{ textDecoration: "none" }}>
                <Text size="sm" fw={500} c="dimmed">
                  Features
                </Text>
              </Link>
              <Link href="#how-it-works" style={{ textDecoration: "none" }}>
                <Text size="sm" fw={500} c="dimmed">
                  How it Works
                </Text>
              </Link>
              <Link href="#pricing" style={{ textDecoration: "none" }}>
                <Text size="sm" fw={500} c="dimmed">
                  Pricing
                </Text>
              </Link>
              <Link href="#faq" style={{ textDecoration: "none" }}>
                <Text size="sm" fw={500} c="dimmed">
                  FAQ
                </Text>
              </Link>
            </Group>

            <Group visibleFrom="sm">
              <Button
                variant="subtle"
                color="gray"
                component={Link}
                href="/login"
              >
                Login
              </Button>
              <Button color="#1966D1" component={Link} href="/signup">
                Get Started
              </Button>
            </Group>

            <Burger
              opened={drawerOpened}
              onClick={toggleDrawer}
              hiddenFrom="sm"
            />
          </Group>
        </Container>
      </header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title="Navigation"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h={`calc(100vh - ${rem(80)})`} mx="-md">
          <Divider my="sm" />
          <Link
            href="#how-it-works"
            style={{ textDecoration: "none" }}
            onClick={closeDrawer}
          >
            <Text py="md" px="md" fw={500}>
              How it Works
            </Text>
          </Link>
          <Link
            href="#features"
            style={{ textDecoration: "none" }}
            onClick={closeDrawer}
          >
            <Text py="md" px="md" fw={500}>
              Features
            </Text>
          </Link>
          <Link
            href="#pricing"
            style={{ textDecoration: "none" }}
            onClick={closeDrawer}
          >
            <Text py="md" px="md" fw={500}>
              Pricing
            </Text>
          </Link>
          <Link
            href="#faq"
            style={{ textDecoration: "none" }}
            onClick={closeDrawer}
          >
            <Text py="md" px="md" fw={500}>
              FAQ
            </Text>
          </Link>

          <Divider my="sm" />

          <Group justify="center" grow pb="xl" px="md">
            <Button
              variant="default"
              component={Link}
              href="/login"
              onClick={closeDrawer}
            >
              Log in
            </Button>
            <Button
              color="#1966D1"
              component={Link}
              href="/signup"
              onClick={closeDrawer}
            >
              Get Started
            </Button>
          </Group>
        </ScrollArea>
      </Drawer>
    </Box>
  );
}
