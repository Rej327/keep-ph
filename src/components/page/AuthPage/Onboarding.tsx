"use client";

import { createUserProfile } from "@/actions/supabase/post";
import { useWaitClient } from "@/hooks/useWaitClient";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import {
  Avatar,
  Button,
  Center,
  Checkbox,
  Container,
  FileButton,
  Group,
  LoadingOverlay,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCircleCheck, IconMailFilled } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import UserVerificationStep from "./UserVerificationStep";

type FormValuesType = {
  firstName: string;
  lastName: string;
  email: string;
  terms: boolean;
  avatar?: File | null;
};

export default function Onboarding() {
  const [activeStep, setActiveStep] = useState(1); // Start at step 1 (Profile)
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValuesType>();

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const topLoader = useTopLoader();
  const isClientReady = useWaitClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // const { data } = await supabase.rpc("get_user", {
        //   input_user_id: userId,
        // });

        // if (data) {
        //   router.push("/customer/mails");
        //   return;
        // }

        if (!user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email || "");
        setValue("email", user.email || "");

        // Pre-fill name if available from metadata
        if (user.user_metadata?.first_name) {
          setValue("firstName", user.user_metadata.first_name);
        }
        if (user.user_metadata?.last_name) {
          setValue("lastName", user.user_metadata.last_name);
        }

        // Check if profile already exists, if so redirect to dashboard
        const { data: profile } = await supabase
          .from("user_table")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          router.push("/customer/dashboard");
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isClientReady) {
      checkUser();
    }
  }, [isClientReady, router, supabase, setValue]);

  if (!isClientReady) return null;

  const handleProfileSubmit = async (data: FormValuesType) => {
    if (!userId) return;

    try {
      topLoader.start();
      setIsLoading(true);

      let avatarPath: string | undefined;
      let fileExt: string | undefined;

      if (avatarFile) {
        fileExt = avatarFile.name.split(".").pop();
        avatarPath = `${userId}/avatar.${fileExt}`;
      }

      const result = await createUserProfile({
        userId: userId,
        email: userEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        avatar: avatarPath,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (avatarFile && avatarPath) {
        const { error: uploadError } = await supabase.storage
          .from("USER-AVATARS")
          .upload(avatarPath, avatarFile);

        if (uploadError) throw uploadError;
      }

      setActiveStep(2);
    } catch (error) {
      console.error(error);
      notifications.show({
        message: "Failed to create profile. Please try again.",
        color: "red",
      });
    } finally {
      topLoader.done();
      setIsLoading(false);
    }
  };

  const handleBackHome = () => {
    router.push("/");
  };

  return (
    <Container size="lg" mih="100vh">
      <LoadingOverlay
        visible={isLoading}
        loaderProps={{ color: "#1966D1", size: 40, variant: "dots" }}
      />
      <Center mih="100vh" py="xl">
        {showSignupSuccess ? (
          <Paper
            w={{ base: "100%", md: 600 }}
            radius="md"
            p={40}
            shadow="md"
            withBorder
          >
            <Stack align="center" gap="xl">
              <IconCircleCheck
                color="#22c55e"
                size={80}
                style={{
                  backgroundColor: "#dcfce7",
                  borderRadius: "50%",
                  padding: "10px",
                }}
              />

              <Stack gap="xs" align="center">
                <Title order={2}>Sign-up complete!</Title>
                <Text ta="center" c="dimmed" maw={400}>
                  Welcome to Keep PH! Your digital mailbox is ready. You can now
                  start forwarding your mail or explore your new dashboard.
                </Text>
              </Stack>
              <Button
                size="md"
                color="#1966D1"
                onClick={() => router.push("/customer/subscription")}
                fullWidth
                maw={300}
              >
                Go to Subscription
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Stack w={{ base: "100%", md: 800 }} gap="xl">
            {/* Stepper Progress */}
            <Stack gap="xs">
              <Text size="sm" ta="center" fw={500}>
                Step {activeStep} of 2
              </Text>

              <Progress
                value={(activeStep / 2) * 100}
                color="#1966D1"
                size="sm"
              />
            </Stack>

            <Paper radius="md" p={40} shadow="md" withBorder>
              <Group justify="center" mb={10} gap={10}>
                <IconMailFilled
                  onClick={handleBackHome}
                  color="#1966D1"
                  className="cursor-pointer"
                />
                <Text c={"#14262b"} fw={500} size="1.4rem">
                  Keep PH
                </Text>
              </Group>

              {activeStep === 1 && (
                <form onSubmit={handleSubmit(handleProfileSubmit)}>
                  <Stack gap="md">
                    <Stack gap="xs" align="center">
                      <Title order={2}>Complete Profile</Title>
                      <Text c="dimmed">Please complete your information</Text>
                    </Stack>

                    <Center>
                      <Stack align="center" gap="xs">
                        <FileButton
                          onChange={setAvatarFile}
                          accept="image/png,image/jpeg,image/webp"
                        >
                          {(props) => (
                            <Avatar
                              {...props}
                              src={
                                avatarFile
                                  ? URL.createObjectURL(avatarFile)
                                  : null
                              }
                              size={120}
                              radius={120}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              color="#1966d1"
                              name={`${watch("firstName") || ""} ${
                                watch("lastName") || ""
                              }`}
                            />
                          )}
                        </FileButton>
                        <Text size="sm" c="dimmed">
                          Click to upload profile picture
                        </Text>
                      </Stack>
                    </Center>

                    <TextInput
                      label="Email"
                      value={userEmail}
                      disabled
                      size="md"
                      styles={() => ({
                        label: {
                          fontWeight: 600,
                        },
                      })}
                    />

                    <SimpleGrid
                      cols={{ base: 1, md: 2 }}
                      spacing="md"
                      verticalSpacing="xs"
                    >
                      <TextInput
                        label="First Name"
                        placeholder="Enter your first name"
                        {...register("firstName", {
                          required: "First name is required",
                        })}
                        error={errors.firstName?.message}
                        size="md"
                        styles={() => ({
                          label: {
                            fontWeight: 600,
                          },
                        })}
                      />
                      <TextInput
                        label="Last Name"
                        placeholder="Enter your last name"
                        {...register("lastName", {
                          required: "Last name is required",
                        })}
                        error={errors.lastName?.message}
                        size="md"
                        styles={() => ({
                          label: {
                            fontWeight: 600,
                          },
                        })}
                      />
                    </SimpleGrid>

                    <Checkbox
                      label={
                        <Text size="sm">
                          I agree to the{" "}
                          <Link href="#" style={{ color: "#1966D1" }}>
                            Terms and Conditions
                          </Link>{" "}
                          and{" "}
                          <Link href="#" style={{ color: "#1966D1" }}>
                            Privacy Policy
                          </Link>
                          .
                        </Text>
                      }
                      {...register("terms", {
                        required: "You must agree to the terms",
                      })}
                      error={errors.terms?.message}
                    />

                    <Button
                      color="#1966D1"
                      type="submit"
                      size="md"
                      fullWidth
                      mt="md"
                    >
                      Create Account
                    </Button>
                  </Stack>
                </form>
              )}

              {activeStep === 2 && userId && (
                <UserVerificationStep
                  userId={userId}
                  onComplete={() => setShowSignupSuccess(true)}
                  onSkip={() => setShowSignupSuccess(true)}
                />
              )}
            </Paper>
          </Stack>
        )}
      </Center>
    </Container>
  );
}
