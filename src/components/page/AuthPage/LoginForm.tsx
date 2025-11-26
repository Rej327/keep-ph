"use client";

import { useWaitClient } from "@/hooks/useWaitClient";
import { BASE_URL } from "@/utils/constant";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import {
  Button,
  Center,
  Container,
  Divider,
  Group,
  LoadingOverlay,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMailFilled } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { useState } from "react";
import { useForm } from "react-hook-form";
import validator from "validator";

type FormValuesType = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValuesType>();

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const topLoader = useTopLoader();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const isClientReady = useWaitClient();

  if (!isClientReady) return null;

  const handleSubmitForm = async (data: FormValuesType) => {
    try {
      topLoader.start();
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithPassword(data);
      if (error) throw error;
      notifications.show({ message: "Login successful", color: "green" });
      router.push("/dashboard");
    } catch (error) {
      if ((error as Error).message.includes("Invalid login credentials")) {
        notifications.show({
          message:
            "Invalid login credentials. Please check if your email or password is correct.",
          color: "red",
        });
      } else {
        notifications.show({
          message: "There was a problem on our end. Please try again later.",
          color: "red",
        });
      }
    } finally {
      topLoader.done();
      setIsLoading(false);
    }
  };

  const handleSigninWithGoogle = async () => {
    try {
      topLoader.start();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${BASE_URL}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch {
      notifications.show({
        message: "Something went wrong. Please try again later.",
        color: "red",
      });
    } finally {
      topLoader.done();
    }
  };

  const handleSigninWithFacebook = async () => {
    try {
      topLoader.start();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${BASE_URL}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch {
      notifications.show({
        message:
          "Something went wrong with Facebook login. Please try again later.",
        color: "red",
      });
    } finally {
      topLoader.done();
    }
  };

  const handleSigninWithAzure = async () => {
    try {
      topLoader.start();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${BASE_URL}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch {
      notifications.show({
        message:
          "Something went wrong with Azure login. Please try again later.",
        color: "red",
      });
    } finally {
      topLoader.done();
    }
  };

  const handleBackHome = () => {
    try {
      topLoader.start();
      router.push("/");
    } catch {
      console.error("Something went wrong while navigating to the Home Page!");
    } finally {
      topLoader.done();
    }
  };

  return (
    <Container h="100vh">
      <LoadingOverlay
        visible={isLoading}
        loaderProps={{ color: "#1966D1", size: 40, variant: "dots" }}
      />
      <Center h="inherit">
        <Paper w={{ base: "100%", md: 420 }} radius="md" p="xl" shadow="md">
          <Group gap={10} mb={30}>
            <IconMailFilled
              onClick={handleBackHome}
              color="#1966D1"
              className="cursor-pointer"
            />
            <Text c={"#14262b"} fw={500} size="1.4rem">
              Keep PH
            </Text>
          </Group>
          <form onSubmit={handleSubmit(handleSubmitForm)}>
            <Stack justify="center" pos="relative">
              <Title
                order={1}
                c={!isDark ? "#14262b" : "#1966D1"}
                style={{
                  textAlign: "left",
                  textTransform: "capitalize",
                  lineHeight: 0.5,
                }}
              >
                Welcome Back
              </Title>
              <Text c={"dimmed"}>Login to manage your digital mail.</Text>

              <TextInput
                label="Email"
                placeholder="Enter your email address"
                {...register("email", {
                  required: "Email is required",
                  validate: (value) =>
                    validator.isEmail(value) || "Email is invalid.",
                })}
                error={errors?.email?.message}
                variant="default"
                styles={() => ({
                  input: {
                    borderColor: "#1966D1",
                    "&:focus": {
                      borderColor: "#1966D1",
                      boxShadow: `0 0 0 2px rgba(81, 152, 173, 0.2)`,
                    },
                  },
                  label: {
                    color: "#14262b",
                  },
                })}
              />
              <Stack gap={2}>
                <Group justify="space-between" mb={0}>
                  <Text fw={600} c="#14262b" size="sm">
                    Password
                  </Text>
                  <Text c="#1a67d2" size="sm">
                    Forgot Password?
                  </Text>
                </Group>
                <PasswordInput
                  placeholder="Enter your password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must have at least 6 characters.",
                    },
                  })}
                  error={errors?.password?.message}
                  variant="default"
                  styles={() => ({
                    input: {
                      borderColor: "#1966D1",
                      "&:focus": {
                        borderColor: "#1966D1",
                        boxShadow: `0 0 0 2px rgba(81, 152, 173, 0.2)`,
                      },
                    },
                    label: {
                      color: "#14262b",
                    },
                  })}
                />
              </Stack>

              <Button
                type="submit"
                fw={400}
                style={{ backgroundColor: "#1966D1" }}
              >
                Login
              </Button>

              <Divider label="Or" labelPosition="center" my="sm" />

              <Button
                type="button"
                variant="outline"
                leftSection={
                  <Image
                    src="/assets/icons/icon-google.png"
                    alt="Google-Icon"
                    width={20}
                    height={20}
                  />
                }
                style={{ borderColor: "#1966D1", color: "#1966D1" }}
                onClick={handleSigninWithGoogle}
              >
                Login with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                leftSection={
                  <Image
                    src="/assets/icons/icon-fb.png"
                    alt="Facebook-Icon"
                    width={20}
                    height={20}
                  />
                }
                style={{ borderColor: "#1966D1", color: "#1966D1" }}
                onClick={handleSigninWithFacebook}
              >
                Login with Facebook
              </Button>
              <Button
                type="button"
                variant="outline"
                leftSection={
                  <Image
                    src="/assets/icons/azuer-logo.webp"
                    alt="Azure-Icon"
                    width={20}
                    height={20}
                  />
                }
                style={{ borderColor: "#1966D1", color: "#1966D1" }}
                onClick={handleSigninWithAzure}
              >
                Login with Azure
              </Button>
              <Text ta="center" my={5} c="dimmed" fz="md">
                Don&apos;t have an account?{" "}
                <Text
                  c="#1966D1"
                  fz="sm"
                  fw="bold"
                  component={Link}
                  href="/signup"
                  span
                >
                  Sign up
                </Text>{" "}
                instead.
              </Text>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Container>
  );
}
