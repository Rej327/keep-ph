"use client";

import { Container } from "@mantine/core";
import AuthForm from "./AuthForm";

import { usePathname } from "next/navigation";

export default function AuthPage() {
  const pathname = usePathname() || "/login";
  const authRoute = pathname.includes("signup") ? "signup" : "login";
  return (
    <Container>
      <AuthForm mode={authRoute} />
    </Container>
  );
}
