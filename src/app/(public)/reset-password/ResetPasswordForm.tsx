"use client";

import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import {
  Button,
  Center,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Popover,
  Progress,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX, IconInfoCircle } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

type FormValuesType = {
  password: "";
  confirmPassword: "";
};

export default function ResetPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
  } = useForm<FormValuesType>();

  const [step, setStep] = useState<"reset" | "success">("reset");
  const [popoverOpened, setPopoverOpened] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const passwordValue = watch("password", "");

  function PasswordRequirement({
    meets,
    label,
  }: {
    meets: boolean;
    label: string;
  }) {
    return (
      <Text
        c={meets ? "teal" : "red"}
        style={{ display: "flex", alignItems: "center" }}
        mt={7}
        size="sm"
      >
        {meets ? <IconCheck size={14} /> : <IconX size={14} />}
        <span className="ml-[10px]">{label}</span>
      </Text>
    );
  }

  const requirements = [
    { re: /[0-9]/, label: "Includes number" },
    { re: /[a-z]/, label: "Includes lowercase letter" },
    { re: /[A-Z]/, label: "Includes uppercase letter" },
    { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: "Includes special symbol" },
  ];

  function getStrength(password: string) {
    let multiplier = password.length > 5 ? 0 : 1;

    requirements.forEach((requirement) => {
      if (!requirement.re.test(password)) {
        multiplier += 1;
      }
    });

    return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
  }

  const strength = getStrength(passwordValue);
  let strengthColor = "red";
  if (strength === 100) strengthColor = "teal";
  else if (strength > 50) strengthColor = "yellow";

  const handleResetPassword = async (data: FormValuesType) => {
    if (data.password !== data.confirmPassword) {
      notifications.show({
        message: "Passwords do not match.",
        color: "red",
      });
      return;
    }

    const failed: string[] = [];
    if (data.password.length < 6)
      failed.push("Password must have at least 6 characters.");
    if (!/[0-9]/.test(data.password)) failed.push("Include number");
    if (!/[a-z]/.test(data.password)) failed.push("Include lowercase letter");
    if (!/[A-Z]/.test(data.password)) failed.push("Include uppercase letter");
    if (!/[$&+,:;=?@#|'<>.^*()%!-]/.test(data.password))
      failed.push("Include special symbol");

    if (failed.length > 0) {
      setError("password", {
        type: "manual",
        message: "Password does not meet minimum requirements.",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      setStep("success");
    } catch (error) {
      notifications.show({
        message: (error as Error).message || "Failed to reset password.",
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
              <ThemeIcon
                variant="light"
                size={80}
                radius="xl"
                color="green"
                bg="green.1"
              >
                <IconCheck size={40} color="green" />
              </ThemeIcon>

              <Title order={2} ta="center">
                Password Reset Successfully!
              </Title>

              <Text c="dimmed" ta="center" size="sm">
                You can now use your new password to log in to your account.
              </Text>

              <Link
                href="/login"
                style={{ width: "100%", textDecoration: "none" }}
              >
                <Button fullWidth size="md" color="blue">
                  Log In Now
                </Button>
              </Link>
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
            <ThemeIcon variant="transparent" size={50}>
              <IconInfoCircle size={40} color="#1966D1" />
            </ThemeIcon>
          </Stack>

          <Title order={2} ta="center" mb="xs">
            Set a New Password
          </Title>

          <Text c="dimmed" size="sm" ta="center" mb="xl">
            Your new password must be different from previously used passwords.
          </Text>

          <form onSubmit={handleSubmit(handleResetPassword)}>
            <Stack>
              <Popover
                opened={popoverOpened}
                position="bottom"
                width="target"
                transitionProps={{ transition: "pop" }}
              >
                <Popover.Target>
                  <div
                    onFocusCapture={() => setPopoverOpened(true)}
                    onBlurCapture={() => setPopoverOpened(false)}
                  >
                    <PasswordInput
                      label="New Password"
                      placeholder="Enter your password"
                      {...register("password", {
                        required: "Password is required",
                      })}
                      error={errors.password?.message}
                      styles={() => ({
                        label: {
                          fontWeight: 600,
                        },
                      })}
                    />
                  </div>
                </Popover.Target>
                <Popover.Dropdown>
                  <Progress
                    color={strengthColor}
                    value={strength}
                    size={5}
                    mb="xs"
                  />
                  <PasswordRequirement
                    label="Includes at least 6 characters"
                    meets={passwordValue.length > 5}
                  />
                  {requirements.map((req, i) => (
                    <PasswordRequirement
                      key={i}
                      label={req.label}
                      meets={req.re.test(passwordValue)}
                    />
                  ))}
                </Popover.Dropdown>
              </Popover>

              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm your password"
                {...register("confirmPassword", {
                  required: "Confirm Password is required",
                })}
                error={errors.confirmPassword?.message}
                styles={() => ({
                  label: {
                    fontWeight: 600,
                  },
                })}
              />

              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                color="blue"
                mt="md"
              >
                Reset Password
              </Button>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Container>
  );
}
