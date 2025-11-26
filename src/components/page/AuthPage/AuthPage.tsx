"use client";

import { Container } from "@mantine/core";
import { usePathname } from "next/navigation";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export default function AuthPage() {
  const pathname = usePathname() || "/login";
  const authRoute = pathname.includes("signup") ? "signup" : "login";

  return (
    <Container>
      {authRoute === "login" ? <LoginForm /> : <SignupForm />}
    </Container>
  );
}
