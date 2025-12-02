"use client";

import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import {
  Button,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Title,
  Popover,
  Progress,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

type Props = {
  email: string;
};

type FormValues = {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangePassword({ email }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>();

  const newPassword = watch("newPassword", "");

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

  const strength = getStrength(newPassword);
  let strengthColor = "red";
  if (strength === 100) strengthColor = "teal";
  else if (strength > 50) strengthColor = "yellow";

  const onSubmit = async (data: FormValues) => {
    // Validate password strength
    const failed: string[] = [];
    if (data.newPassword.length < 6) failed.push("Length < 6");
    requirements.forEach((req) => {
      if (!req.re.test(data.newPassword)) failed.push(req.label);
    });

    if (failed.length > 0) {
      setError("newPassword", {
        type: "manual",
        message: "Password does not meet minimum requirements.",
      });
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      setError("confirmPassword", { message: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    try {
      // If current password is provided, verify it
      if (data.currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: data.currentPassword,
        });

        if (signInError) {
          throw new Error("Incorrect current password");
        }
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      notifications.show({
        title: "Success",
        message: "Password updated successfully",
        color: "green",
      });
      reset();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to update password",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper p="xl" radius="md" withBorder mt="lg">
      <Title order={4} mb="lg">
        Change Password
      </Title>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          <PasswordInput
            label="Current Password"
            placeholder="Enter current password"
            {...register("currentPassword")}
            error={errors.currentPassword?.message}
          />
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
                  placeholder="Enter new password"
                  {...register("newPassword", {
                    required: "New password is required",
                  })}
                  error={errors.newPassword?.message}
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
                meets={newPassword.length > 5}
              />
              {requirements.map((req, i) => (
                <PasswordRequirement
                  key={i}
                  label={req.label}
                  meets={req.re.test(newPassword)}
                />
              ))}
            </Popover.Dropdown>
          </Popover>
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            {...register("confirmPassword", {
              required: "Please confirm new password",
              validate: (val) =>
                val === newPassword || "Passwords do not match",
            })}
            error={errors.confirmPassword?.message}
          />
          <Group justify="flex-end">
            <Button type="submit" loading={isLoading} color="blue">
              Update Password
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
