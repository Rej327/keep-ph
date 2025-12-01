"use client";

import {
  Container,
  Title,
  Text,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Box,
} from "@mantine/core";
import Link from "next/link";
import { IconLock } from "@tabler/icons-react";

export default function Unauthorized() {
  return (
    <Container className="py-32 relative">
      <SimpleGrid cols={{ base: 1, sm: 1 }} spacing={50}>
        <Stack align="center" justify="center" gap="xl">
          <Box className="relative">
            <Title
              className="text-[12rem] font-black text-gray-100 leading-none select-none"
              style={{
                fontSize: "clamp(8rem, 20vw, 14rem)",
                color: "var(--mantine-color-gray-1)",
              }}
            >
              401
            </Title>
            <Box
              className="absolute inset-0 flex items-center justify-center"
              style={{ top: "60%" }}
            >
              <Group gap="xs">
                <IconLock size={32} />
                <Title order={2} ta="center" size="h1">
                  Access Restricted
                </Title>
              </Group>
            </Box>
          </Box>

          <Text
            c="dimmed"
            size="lg"
            ta="center"
            className="max-w-md mx-auto mt-8"
          >
            You do not have permission to access this page. Please sign in to
            continue or contact support if you believe this is an error.
          </Text>
          <Group justify="center" mt="md">
            <Button size="lg" component={Link} href="/auth/login">
              Sign In
            </Button>
            <Button
              size="lg"
              variant="subtle"
              component={Link}
              href="/"
              color="gray"
            >
              Back to Home
            </Button>
          </Group>
        </Stack>
      </SimpleGrid>
    </Container>
  );
}
