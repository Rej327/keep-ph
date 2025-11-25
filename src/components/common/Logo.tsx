"use client";

import Image from "next/image";
import Link from "next/link";
import { Group, Text, useMantineColorScheme } from "@mantine/core";

export function Logo({ href = "/" }: { href?: string }) {
  const { colorScheme } = useMantineColorScheme();

  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {colorScheme === "dark" ? (
        <Group gap={4}>
          <Image
            src="/logo-icon-dark.svg"
            alt="Logo Dark"
            width={40}
            height={40}
            priority
          />
          <Text className="logo">Keep-PH</Text>
        </Group>
      ) : (
        <Group gap={4}>
          <Image
            src="/logo-icon-light.svg"
            alt="Logo Light"
            width={40}
            height={40}
            priority
          />
          <Text className="logo">Keep-PH</Text>
        </Group>
      )}
    </Link>
  );
}
