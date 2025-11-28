"use client";

import { createUserAccount } from "@/actions/supabase/post";
import { useWaitClient } from "@/hooks/useWaitClient";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import {
  Badge,
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
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconCircleCheck,
  IconCreditCard,
  IconLock,
  IconMapPin,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import validator from "validator";

type FormValuesType = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
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
  const [paymentMethod, setPaymentMethod] = useState("credit-card");

  const {
    register,
    handleSubmit,
    watch,
    setError,
    trigger,
    control,
    formState: { errors },
  } = useForm<FormValuesType>();

  const passwordValue = watch("password", "");
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const topLoader = useTopLoader();
  const isClientReady = useWaitClient();

  if (!isClientReady) return null;

  const validateStep2 = async () => {
    const result = await trigger([
      "firstName",
      "lastName",
      "email",
      "phone",
      "password",
      "confirmPassword",
      "terms",
    ]);

    if (result) {
      const pwd = watch("password");
      const confirm = watch("confirmPassword");
      const terms = watch("terms");

      if (!terms) {
        setError("terms", { message: "You must agree to the terms." });
        return false;
      }

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

  const handleNextStep = async () => {
    if (activeStep === 0) {
      setActiveStep(1);
    } else if (activeStep === 1) {
      const isValid = await validateStep2();
      if (isValid) {
        setActiveStep(2);
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
            phone: data.phone,
          },
        },
      });

      if (error) throw error;

      if (userData.user && userData.user.email) {
        const result = await createUserAccount({
          userId: userData.user.id,
          email: userData.user.email,
          firstName: data.firstName,
          lastName: data.lastName,
        });

        if (result.error) throw result.error;
      }

      console.log("User created", {
        id: userData.user?.id,
        email: userData.user?.email,
      });

      setShowSignupSuccess(true);
    } catch (err) {
      console.error(err);
      notifications.show({
        message: "There was a problem on our end. Please try again later.",
        color: "red",
      });
    } finally {
      topLoader.done();
      setIsLoading(false);
    }
  };

  const handleSkipPayment = () => {
    handleSubmit(handleFinalSubmit)();
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

  return (
    <Container h="100vh" size="lg">
      <LoadingOverlay
        visible={isLoading}
        loaderProps={{ color: "#1966D1", size: 40, variant: "dots" }}
      />
      <Center h="inherit">
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

              <Paper w="100%" p="md" withBorder radius="md">
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    Your Virtual Address:
                  </Text>
                  <Text fw={500}>123 Digital Lane, Suite 500</Text>
                  <Text fw={500}>Manila, Philippines 1000</Text>
                </Stack>
              </Paper>

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
              <form onSubmit={handleSubmit(handleFinalSubmit)}>
                {activeStep === 0 && (
                  <Stack gap="xl">
                    <Stack gap="xs" align="center">
                      <Title order={2}>Your Virtual Address</Title>
                      <Text c="dimmed">
                        Step 1: Your account will be assigned to the following
                        virtual address.
                      </Text>
                    </Stack>

                    <Paper withBorder radius="md" p="lg">
                      <Stack gap="md">
                        <Group>
                          <Text c="#1966D1" fw={600} size="sm">
                            Your Designated Address
                          </Text>
                        </Group>
                        <Title order={4}>
                          Gold Building, 15 Annapolis St., Greenhills, San Juan,
                          Metro Manila
                        </Title>

                        {/* Placeholder for Map */}
                        <Paper
                          bg="gray.1"
                          h={250}
                          radius="md"
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {/* Google Maps Embed Placeholder - Ideally use an iframe here if allowed */}
                          <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.8854480471355!2d121.05527549999998!3d14.605600800000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b7dde89ff1f1%3A0xc7d73c48077da697!2sGold%20Building%2C%2015%20Annapolis%20St%2C%20San%20Juan%20City%2C%20Metro%20Manila!5e0!3m2!1sen!2sph!4v1764164554439!5m2!1sen!2sph"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </Paper>

                        <Group justify="center" gap="xs">
                          <Badge
                            color="blue"
                            variant="light"
                            leftSection={<IconMapPin size={12} />}
                            radius="sm"
                            tt="none"
                          >
                            Business Address
                          </Badge>
                          <Badge
                            color="yellow"
                            variant="light"
                            leftSection={<IconCircleCheck size={12} />}
                            radius="sm"
                            tt="none"
                          >
                            Mail & Package Handling
                          </Badge>
                          <Badge
                            color="green"
                            variant="light"
                            leftSection={<IconCheck size={12} />}
                            radius="sm"
                            tt="none"
                          >
                            Digital Mail Scanning
                          </Badge>
                        </Group>
                      </Stack>
                    </Paper>

                    <Button
                      size="lg"
                      color="#1966D1"
                      onClick={handleNextStep}
                      fullWidth
                      style={{ alignSelf: "center", maxWidth: "200px" }}
                    >
                      Next
                    </Button>
                  </Stack>
                )}

                {activeStep === 1 && (
                  <Stack gap="md">
                    <Stack gap="xs" align="center">
                      <Title order={2}>Create Your Account</Title>
                      <Text c="dimmed">Step 2: Personal Information</Text>
                    </Stack>

                    <Group grow align="flex-start">
                      <TextInput
                        label="First Name"
                        placeholder="Enter your first name"
                        {...register("firstName", {
                          required: "First name is required",
                        })}
                        error={errors.firstName?.message}
                        size="md"
                      />
                      <TextInput
                        label="Last Name"
                        placeholder="Enter your last name"
                        {...register("lastName", {
                          required: "Last name is required",
                        })}
                        error={errors.lastName?.message}
                        size="md"
                      />
                    </Group>

                    <Group grow align="flex-start">
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
                      />
                      <TextInput
                        label="Phone"
                        placeholder="Enter your phone number"
                        {...register("phone", {
                          required: "Phone number is required",
                        })}
                        error={errors.phone?.message}
                        size="md"
                      />
                    </Group>

                    <Group grow align="flex-start">
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
                      />
                    </Group>

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
                        Next
                      </Button>
                    </Group>

                    <Group justify="center" gap={5}>
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

                {activeStep === 2 && (
                  <Stack gap="xl">
                    <Stack gap="xs" align="center">
                      <Title order={2}>Set up your payment</Title>
                      <Text c="dimmed">
                        You will not be charged until your 14-day free trial
                        ends.
                      </Text>
                    </Stack>

                    <SegmentedControl
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      data={[
                        { label: "Credit Card", value: "credit-card" },
                        { label: "E-Wallet", value: "e-wallet" },
                      ]}
                      fullWidth
                      size="md"
                    />

                    {paymentMethod === "credit-card" && (
                      <Stack gap="md">
                        <TextInput
                          label="Cardholder Name"
                          placeholder="Enter name on card"
                          {...register("cardholderName")}
                          size="md"
                        />
                        <TextInput
                          label="Card Number"
                          placeholder="0000 0000 0000 0000"
                          leftSection={<IconCreditCard size={16} />}
                          {...register("cardNumber")}
                          size="md"
                        />
                        <Group grow>
                          <TextInput
                            label="Expiry Date"
                            placeholder="MM / YY"
                            {...register("expiryDate")}
                            size="md"
                          />
                          <TextInput
                            label="CVC"
                            placeholder="123"
                            {...register("cvc")}
                            size="md"
                          />
                        </Group>
                      </Stack>
                    )}

                    {paymentMethod === "e-wallet" && (
                      <Stack gap="md">
                        <Controller
                          name="eWalletProvider"
                          control={control}
                          render={({ field }) => (
                            <Select
                              label="E-Wallet Provider"
                              placeholder="Select your e-wallet"
                              data={[
                                { value: "gcash", label: "GCash" },
                                { value: "maya", label: "Maya" },
                                { value: "coins", label: "Coins.ph" },
                              ]}
                              size="md"
                              {...field}
                            />
                          )}
                        />
                        <TextInput
                          label="Account Number / Phone"
                          placeholder="Enter your account number or phone"
                          {...register("eWalletAccount")}
                          size="md"
                        />
                      </Stack>
                    )}

                    <Paper bg="gray.0" p="xs" radius="md">
                      <Center>
                        <Group gap="xs">
                          <IconLock size={14} color="green" />
                          <Text size="sm" c="dimmed">
                            Secure SSL Connection
                          </Text>
                        </Group>
                      </Center>
                    </Paper>

                    <Stack gap="md">
                      <Button type="submit" size="lg" color="#1966D1" fullWidth>
                        Proceed to Finish
                      </Button>
                      <Center>
                        <Text
                          size="sm"
                          style={{ cursor: "pointer" }}
                          onClick={handleSkipPayment}
                          fw={500}
                        >
                          Skip for now
                        </Text>
                      </Center>
                    </Stack>
                  </Stack>
                )}
              </form>
            </Paper>
          </Stack>
        )}
      </Center>
    </Container>
  );
}
