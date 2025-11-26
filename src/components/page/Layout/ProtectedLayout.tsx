"use client";

import useAuthStore from "@/zustand/stores/useAuthStore";
import {
  Anchor,
  Center,
  Flex,
  Group,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { Topbar } from "../../common/TopBar/TopBar";
import { SideBar } from "../../common/SideBar/SideBar";
import { useEffect, useState } from "react";
// import { getUserTeams } from "@/actions/supabase/get";
import CustomLoader from "@/components/common/CustomLoader";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuthStore();
  const { colorScheme } = useMantineColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const [hasTeamData, setHasTeamData] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpened, setMobileOpened] = useState(false);

  const layoutType = hasTeamData;

  useEffect(() => {
    const checkTeamData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const hasTeams = "customer";
        setHasTeamData(hasTeams);

        // If user has no team data, redirect to public dashboard
        if (!hasTeams) {
          router.push("/");
        }
      } catch (error) {
        console.error("Error checking team data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkTeamData();
  }, [user, router]);

  const DashboardBreadcrumbs = () => {
    const path = usePathname();
    if (!path) return null;
    const segments = path.split("/").filter(Boolean);
    const dashboardIndex = segments.indexOf("dashboard");
    const crumbs =
      dashboardIndex !== -1 ? segments.slice(dashboardIndex) : segments;
    const breadcrumbLinks: { label: string; href: string }[] = [];
    let href = "";
    crumbs.forEach((seg) => {
      href += `/${seg}`;
      breadcrumbLinks.push({
        label: decodeURIComponent(seg.replace(/-/g, " ")),
        href,
      });
    });
    return (
      <Group gap={4} style={{ margin: "0 24px 8px 12px" }} align="center">
        {breadcrumbLinks.map((crumb, idx) => (
          <Group gap={2} key={crumb.href} align="center">
            {idx !== 0 && (
              <IconChevronRight
                size={14}
                stroke={1.5}
                color="#868e96"
                style={{ verticalAlign: "middle" }}
              />
            )}
            {idx === breadcrumbLinks.length - 1 ? (
              <Text
                size="xs"
                fw={500}
                c="gray.7"
                style={{
                  textTransform: "capitalize",
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              >
                {crumb.label}
              </Text>
            ) : (
              <Anchor
                href={crumb.href}
                size="xs"
                fw={500}
                style={{
                  borderRadius: 4,
                  padding: "2px 6px",
                  textTransform: "capitalize",
                  fontWeight: 500,
                  fontSize: "12px",
                  color: "inherit",
                  transition: "text-decoration 0.2s",
                  textUnderlineOffset: 3,
                }}
                underline="hover"
              >
                {crumb.label}
              </Anchor>
            )}
          </Group>
        ))}
      </Group>
    );
  };

  // Show loading state or error message while checking team data
  if (isLoading) {
    return (
      <Center h="100vh">
        <CustomLoader />
      </Center>
    );
  }

  // Only render dashboard if user has team data
  if (hasTeamData === "customer") {
    return (
      <Flex h="100vh">
        <SideBar
          type={layoutType as "admin" | "customer"}
          user={user}
          mobileOpened={mobileOpened}
          onMobileClose={() => setMobileOpened(false)}
          onMobileOpen={() => setMobileOpened(true)}
        />
        <Flex direction="column" flex={1} className="overflow-hidden">
          <Topbar
            user={user}
            type={layoutType as "admin" | "customer"}
            onMenuClick={() => setMobileOpened((o) => !o)}
          />
          <main
            style={{
              overflow: "auto",
              flex: 1,
              backgroundColor:
                colorScheme === "dark" ? "#12121240" : "#9eabaf20",
              padding: "20px 0",
            }}
          >
            <DashboardBreadcrumbs />
            {children}
          </main>
        </Flex>
      </Flex>
    );
  }

  // This will show briefly before redirect happens
  return (
    <Center h="100vh">
      <CustomLoader />
    </Center>
  );
}
