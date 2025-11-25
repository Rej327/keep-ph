"use client";

// import { insertNewUser } from "@/actions/supabase/post";
import { useWaitClient } from "@/hooks/useWaitClient";
import { BASE_URL } from "@/utils/constant";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import {
  Button,
  Center,
  Container,
  Divider,
  LoadingOverlay,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
  Popover,
  Progress,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCircleCheck,
  IconHomeFilled,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
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
  confirmPassword?: string;
};

export default function AuthForm({
  mode = "login",
}: {
  mode?: "login" | "signup";
}) {
  const isLogin = mode === "login";
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValuesType>();
  const passwordValue = watch("password", "");
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const topLoader = useTopLoader();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const isClientReady = useWaitClient();

  if (!isClientReady) return null;

  const handleSubmitForm = async (data: FormValuesType) => {
    if (!isLogin) {
      const pwd = data.password || "";
      const confirm = data.confirmPassword || "";

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
        return;
      }

      if (pwd !== confirm) {
        setError("confirmPassword", {
          type: "manual",
          message: "Passwords do not match",
        });
        return;
      }
    }

    try {
      topLoader.start();
      setIsLoading(true);

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword(data);
        if (error) throw error;
        notifications.show({ message: "Login successful", color: "green" });
        router.push("/dashboard");
      } else {
        const { data: userData, error } = await supabase.auth.signUp(data);
        if (error) throw error;

        console.log("User to insert", {
          id: userData.user?.id,
          email: userData.user?.email,
        });

        // if (data) {
        //   await insertNewUser({
        //     id: userData.user?.id || "",
        //     email: userData.user?.email || "",
        //   });
        // }

        setShowSignupSuccess(true);
        notifications.show({ message: "Sign up successful", color: "green" });
      }
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
          <IconHomeFilled
            onClick={handleBackHome}
            color="#1966D1"
            className="cursor-pointer"
          />
          {showSignupSuccess ? (
            <Stack align="center">
              <IconCircleCheck color="#1966D1" size={48} />
              <Text ta="center">
                We&apos;ve sent a confirmation email to your inbox. Please check
                your email to complete the signup.
              </Text>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit(handleSubmitForm)}>
              <Stack justify="center" pos="relative">
                <Title
                  order={3}
                  c={!isDark ? "#14262b" : "#1966D1"}
                  style={{
                    textAlign: "center",
                    textTransform: "uppercase",
                  }}
                >
                  {isLogin ? "Login" : "Sign up"}
                </Title>

                <TextInput
                  label="Email"
                  placeholder="Enter your email address"
                  {...register("email", {
                    required: "Email is required",
                    validate: (value) =>
                      validator.isEmail(value) || "Email is invalid.",
                  })}
                  error={errors?.email?.message}
                  variant="default" //
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

                {isLogin ? (
                  <PasswordInput
                    label="Password"
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
                ) : (
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
                            minLength: {
                              value: 6,
                              message:
                                "Password must have at least 6 characters.",
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
                      {requirements.map((requirement, index) => (
                        <PasswordRequirement
                          key={index}
                          label={requirement.label}
                          meets={requirement.re.test(passwordValue)}
                        />
                      ))}
                    </Popover.Dropdown>
                  </Popover>
                )}

                {!isLogin && (
                  <PasswordInput
                    label="Confirm password"
                    placeholder="Confirm your password"
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === passwordValue || "Passwords do not match",
                    })}
                    error={errors?.confirmPassword?.message}
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
                )}

                <Button type="submit" style={{ backgroundColor: "#1966D1" }}>
                  {isLogin ? "Login" : "Sign up"}
                </Button>

                <Text ta="center" fz="sm">
                  {isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <Text
                    c="#14262b"
                    fz="sm"
                    fw="bold"
                    component={Link}
                    href={isLogin ? "/signup" : "/login"}
                    span
                  >
                    {isLogin ? "Sign up" : "Login"}
                  </Text>{" "}
                  instead.
                </Text>

                <Divider
                  label={`Or ${isLogin ? "login" : "sign up"} with your email`}
                  labelPosition="center"
                  my="sm"
                />

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
                  {isLogin ? "Login" : "Sign up"} with Google
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
                  {isLogin ? "Login" : "Sign up"} with Facebook
                </Button>
              </Stack>
            </form>
          )}
        </Paper>
        {/* <Image
          src="/logo-icon-light.svg"
          alt="Google-Icon"
          width={20}
          height={20}
        /> */}
      </Center>
    </Container>
  );
}
