"use client";

import { BASE_URL } from "@/utils/constant";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import {
  Button,
  Center,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMail, IconMailForward } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import validator from "validator";

type FormValuesType = {
  email: string;
};

export default function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValuesType>();

  const [step, setStep] = useState<"request" | "success">("request");
  const supabase = createSupabaseBrowserClient();

  const emailValue = watch("email");

  const handleReset = async (data: FormValuesType) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${BASE_URL}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;

      setStep("success");
    } catch (error) {
      notifications.show({
        message:
          (error as Error).message || "Something went wrong. Please try again.",
        color: "red",
      });
    }
  };

  const handleResend = async () => {
    if (!emailValue) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
        redirectTo: `${BASE_URL}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;

      notifications.show({
        message: "Email sent successfully!",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        message: (error as Error).message || "Failed to resend email.",
        color: "red",
      });
    }
  };

  if (step === "success") {
    return (
      <Container h="100vh">
        <Center h="inherit">
          <Paper
            w={{ base: "100%", md: 420 }}
            radius="md"
            p="xl"
            shadow="md"
            withBorder
          >
            <Stack align="center" gap="md">
              <ThemeIcon variant="light" size={60} radius="xl" color="blue">
                <IconMailForward size={30} />
              </ThemeIcon>

              <Title order={2} ta="center">
                Check Your Email
              </Title>

              <Text c="dimmed" ta="center" size="sm">
                We&apos;ve sent a password reset link to <br />
                <Text span fw={600} c="dark">
                  {emailValue}
                </Text>
                . Please check your inbox and spam/junk folder. The link will
                expire in 15 minutes.
              </Text>

              <Button fullWidth onClick={handleResend} loading={isSubmitting}>
                Resend Email
              </Button>

              <Group gap={5}>
                <Link href="/login" style={{ textDecoration: "none" }}>
                  <Text c="blue" size="sm" fw={500}>
                    Back to Login
                  </Text>
                </Link>
              </Group>
            </Stack>
          </Paper>
        </Center>
      </Container>
    );
  }

  return (
    <Container h="100vh">
      <Center h="inherit">
        <Paper
          w={{ base: "100%", md: 420 }}
          radius="md"
          p="xl"
          shadow="md"
          withBorder
        >
          <Stack align="center" mb="lg">
            <ThemeIcon variant="filled" size={50} radius="md" color="blue">
              <IconMail size={28} color="white" />
            </ThemeIcon>
          </Stack>

          <Title order={2} ta="center" mb="xs">
            Reset Your Password
          </Title>

          <Text c="dimmed" size="sm" ta="center" mb="xl">
            No problem. Just enter the email address you used to sign up.
          </Text>

          <form onSubmit={handleSubmit(handleReset)}>
            <Stack>
              <TextInput
                label="Email Address"
                placeholder="you@youremail.com"
                {...register("email", {
                  required: "Email is required",
                  validate: (value) =>
                    validator.isEmail(value) || "Email is invalid",
                })}
                error={errors.email?.message}
                leftSection={<IconMail size={16} />}
              />

              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                color="blue"
              >
                Send Reset Link
              </Button>

              <Group justify="center" gap={5} mt="xs">
                <Text c="dimmed" size="sm">
                  Remember your password?
                </Text>
                <Link href="/login" style={{ textDecoration: "none" }}>
                  <Text c="blue" size="sm" fw={600}>
                    Log In
                  </Text>
                </Link>
              </Group>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Container>
  );
}
