"use client";

import { deleteUserFromAuth } from "@/actions/supabase/delete";
import { createUserProfile } from "@/actions/supabase/post";
import { useWaitClient } from "@/hooks/useWaitClient";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import {
  Button,
  Center,
  Checkbox,
  Container,
  Group,
  LoadingOverlay,
  Paper,
  PasswordInput,
  Popover,
  Progress,
  Stack,
  Text,
  TextInput,
  Title,
  Avatar,
  FileButton,
  SimpleGrid,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconCircleCheck,
  IconMailFilled,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { useState } from "react";
import { useForm } from "react-hook-form";
import validator from "validator";

import UserVerificationStep from "./UserVerificationStep";

type FormValuesType = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
  avatar?: File | null;
  // Payment fields
  cardholderName?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvc?: string;
  eWalletProvider?: string;
  eWalletAccount?: string;
};

export default function SignupForm() {
  const [activeStep, setActiveStep] = useState(0);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    trigger,
    formState: { errors },
  } = useForm<FormValuesType>();

  const passwordValue = watch("password", "");
  const emailValue = watch("email", "");
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const topLoader = useTopLoader();
  const isClientReady = useWaitClient();

  if (!isClientReady) return null;

  const validateStep0 = async () => {
    const result = await trigger(["email", "password", "confirmPassword"]);

    if (result) {
      const pwd = watch("password");
      const confirm = watch("confirmPassword");

      const failed: string[] = [];
      if (pwd.length < 6)
        failed.push("Password must have at least 6 characters.");
      if (!/[0-9]/.test(pwd)) failed.push("Include number");
      if (!/[a-z]/.test(pwd)) failed.push("Include lowercase letter");
      if (!/[A-Z]/.test(pwd)) failed.push("Include uppercase letter");
      if (!/[$&+,:;=?@#|'<>.^*()%!-]/.test(pwd))
        failed.push("Include special symbol");

      if (failed.length > 0) {
        setError("password", {
          type: "manual",
          message: "Password does not meet minimum requirements.",
        });
        return false;
      }

      if (pwd !== confirm) {
        setError("confirmPassword", {
          type: "manual",
          message: "Passwords do not match",
        });
        return false;
      }

      return true;
    }
    return false;
  };

  const validateStep1 = async () => {
    const result = await trigger(["firstName", "lastName", "terms"]);
    if (result) {
      const terms = watch("terms");
      if (!terms) {
        setError("terms", { message: "You must agree to the terms." });
        return false;
      }
      return true;
    }
    return false;
  };

  const handleNextStep = async () => {
    if (activeStep === 0) {
      const isValid = await validateStep0();
      if (isValid) {
        setActiveStep(1);
      }
    } else if (activeStep === 1) {
      const isValid = await validateStep1();
      if (isValid) {
        handleSubmit(handleFinalSubmit)();
      }
    }
  };

  const handleBackStep = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const handleFinalSubmit = async (data: FormValuesType) => {
    try {
      topLoader.start();
      setIsLoading(true);

      const { data: userData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
        },
      });

      if (error) throw error;

      if (userData.user && userData.user.email) {
        setUserId(userData.user.id);
        let avatarPath: string | undefined;
        let fileExt: string | undefined;

        if (avatarFile) {
          fileExt = avatarFile.name.split(".").pop();
          avatarPath = `${userData.user.id}/avatar.${fileExt}`;
        }

        try {
          const result = await createUserProfile({
            userId: userData.user.id,
            email: userData.user.email,
            firstName: data.firstName,
            lastName: data.lastName,
            avatar: avatarPath,
          });

          if (result.error) {
            console.error("Server Action failed:", result.error);
            throw new Error(result.error.message || "Unknown server error");
          }

          if (avatarFile && avatarPath) {
            const { error: uploadError } = await supabase.storage
              .from("USER-AVATARS")
              .upload(avatarPath, avatarFile);

            if (uploadError) {
              throw uploadError;
            }
          }
        } catch (profileError) {
          // If profile creation or upload fails, delete the user from Auth
          await deleteUserFromAuth(userData.user.id);
          throw profileError;
        }
      }

      console.log("User created", {
        id: userData.user?.id,
        email: userData.user?.email,
      });

      setActiveStep(2);
      // setShowSignupSuccess(true);
    } catch (err) {
      console.log(err);
      notifications.show({
        message: "There was a problem on our end. Please try again later.",
        color: "red",
      });
    } finally {
      topLoader.done();
      setIsLoading(false);
    }
  };

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
                // onClick={() => router.push("https://mail.google.com/")}
                onClick={() => router.push("/subscription")}
                fullWidth
                maw={300}
              >
                Confirm your Email
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Stack w={{ base: "100%", md: 800 }} gap="xl">
            {/* Stepper Progress */}
            <Stack gap="xs">
              <Text size="sm" ta="center" fw={500}>
                Step {activeStep + 1} of 3
              </Text>

              <Progress
                value={((activeStep + 1) / 3) * 100}
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
              <form onSubmit={handleSubmit(handleFinalSubmit)}>
                {activeStep === 0 && (
                  <Stack gap="md">
                    <Stack gap="xs" align="center">
                      <Title order={2}>Create Your Account</Title>
                      <Text c="dimmed">Step 1: Account Information</Text>
                    </Stack>

                    <TextInput
                      label="Email"
                      placeholder="Enter your email address"
                      {...register("email", {
                        required: "Email is required",
                        validate: (value) =>
                          validator.isEmail(value) || "Email is invalid.",
                      })}
                      error={errors.email?.message}
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
                              label="Password"
                              placeholder="Enter your password"
                              {...register("password", {
                                required: "Password is required",
                              })}
                              error={errors.password?.message}
                              size="md"
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
                        label="Confirm Password"
                        placeholder="Confirm your password"
                        {...register("confirmPassword", {
                          required: "Please confirm your password",
                        })}
                        error={errors.confirmPassword?.message}
                        size="md"
                        styles={() => ({
                          label: {
                            fontWeight: 600,
                          },
                        })}
                      />
                    </SimpleGrid>

                    <Button
                      size="md"
                      color="#1966D1"
                      onClick={handleNextStep}
                      fullWidth
                      mt="md"
                    >
                      Next
                    </Button>

                    <Group justify="center" gap={5} mt="xs">
                      <Text size="sm" c="dimmed">
                        Already have an account?
                      </Text>
                      <Link
                        href="/login"
                        style={{
                          fontSize: "14px",
                          color: "#1966D1",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        Log In
                      </Link>
                    </Group>
                  </Stack>
                )}

                {activeStep === 1 && (
                  <Stack gap="md">
                    <Stack gap="xs" align="center">
                      <Title order={2}>Complete Profile</Title>
                      <Text c="dimmed">Step 2: Personal Information</Text>
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
                      value={emailValue}
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

                    <Group justify="space-between" mt="lg">
                      <Button
                        variant="default"
                        onClick={handleBackStep}
                        size="md"
                      >
                        Back
                      </Button>
                      <Button
                        color="#1966D1"
                        onClick={handleNextStep}
                        size="md"
                      >
                        Create Account
                      </Button>
                    </Group>
                  </Stack>
                )}
              </form>
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
