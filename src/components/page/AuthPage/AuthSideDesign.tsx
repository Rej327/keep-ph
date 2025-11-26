"use client";

import React from "react";
import {
  Stack,
  Container,
  Box,
  Text,
  Group,
  useMantineColorScheme,
} from "@mantine/core";
import AuthBg from "./Svg/AuthBg";
import Image from "next/image";

export default function AuthSideDesign() {
  const { colorScheme } = useMantineColorScheme();

  const isDark = colorScheme === "dark";

  return (
    <Container
      fluid
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        backgroundColor: "#5198ad50",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        padding: "2rem",
      }}
    >
      {/* Background SVG */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      >
        <AuthBg />
      </Box>

      {/* Main content */}
      <Stack
        align="center"
        justify="center"
        gap="md"
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: 400,
        }}
      >
        <Stack justify="start" align="end">
          <Group gap="md">
            <Image
              src={isDark ? "/logo-icon-dark.svg" : "/logo-icon-light.svg"}
              alt="Icon"
              width={120}
              height={120}
            />
            <Text fz="h1" fw={700} c={isDark ? "#ffffff" : "#1c3238"}>
              Keep - PH
            </Text>
          </Group>
          <Text fz="md" c={isDark ? "#b3b3b3" : "#40646e"}>
            Mailroom services
          </Text>
        </Stack>
      </Stack>
    </Container>
  );
}
