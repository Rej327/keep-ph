import { colors } from "@/styles/colors";
import { Button, Flex, Title, Text } from "@mantine/core";
import Link from "next/link";

export default function Home() {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      h="100vh"
      gap="md"
      style={{ padding: 24 }}
    >
      <Title order={1}>KeepPH</Title>
      <Text c="dimmed" ta="center" maw={640}>
        KeepPH is a platform for HR professionals to manage their applicants,
        workflows, and interviews. Log in to your account or create a new one to
        get started.
      </Text>

      <Flex gap="sm">
        <Button
          c={"#5198ad"}
          style={{ borderColor: colors.main }}
          component={Link}
          href="/login"
          variant="outline"
        >
          Login
        </Button>
        <Button bg={colors.main} component={Link} href="/signup">
          Sign up
        </Button>
      </Flex>
    </Flex>
  );
}
