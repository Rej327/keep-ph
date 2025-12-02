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

export default function NotFound() {
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
              404
            </Title>
            <Box
              className="absolute inset-0 flex items-center justify-center"
              style={{ top: "60%" }}
            >
              <Title order={2} ta="center" size="h1">
                Nothing to see here
              </Title>
            </Box>
          </Box>

          <Text
            c="dimmed"
            size="lg"
            ta="center"
            className="max-w-md mx-auto mt-8"
          >
            Page you are trying to open does not exist. You may have mistyped
            the address, or the page has been moved to another URL.
          </Text>
          <Group justify="center" mt="md">
            <Button size="lg" component={Link} href="/mailroom">
              Take me back to home page
            </Button>
          </Group>
        </Stack>
      </SimpleGrid>
    </Container>
  );
}
