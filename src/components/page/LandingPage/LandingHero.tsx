import {
  Container,
  Title,
  Text,
  Button,
  Grid,
  GridCol,
  Stack,
  Paper,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";

export function LandingHero() {
  return (
    <Container size="xl" py={100}>
      <Grid gutter={50} align="center">
        <GridCol span={{ base: 12, md: 6 }}>
          <Stack gap="lg">
            <Title order={1} style={{ fontSize: "3.5rem", lineHeight: 1.1 }}>
              Manage Your Physical Mail, Digitally.
            </Title>
            <Text size="xl" c="dimmed" maw={500}>
              Keep PH scans, digitizes, and organizes your mail, so you can
              access it from anywhere, anytime. Declutter your life and never
              miss an important document again.
            </Text>
            <Button
              component={Link}
              href="/signup"
              size="md"
              color="#1966D1"
              radius="md"
              w={250}
            >
              Get Started{" "}
              <IconArrowRight size={20} style={{ marginLeft: 10 }} />
            </Button>
          </Stack>
        </GridCol>
        <GridCol span={{ base: 12, md: 6 }}>
          {/* Placeholder for the hero image */}
          <Paper
            shadow="lg"
            w={{ base: 360, md: 560 }}
            h={{ base: 200, md: 315 }}
          >
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/6bnBc4x5V1k?si=FdoWDh8Btk1Ios8F&amp;controls=0"
              style={{ border: 0, borderRadius: 10 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <Text ta={"center"} c={"dimmed"} mt={10}>
              Get a quick overview of how we digitize and deliver your mail
              through our secure online platform.
            </Text>
          </Paper>
        </GridCol>
      </Grid>
    </Container>
  );
}
