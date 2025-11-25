"use client";

import useAuthStore from "@/zustand/stores/useAuthStore";
import {
  Center,
  Flex,
  Group,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getApplicantDataByEmail } from "@/actions/supabase/get";
import PublicSidebar from "../PublicDashboard/PublicSidebar";
import ApplicationList from "../PublicDashboard/ApplicationList";
import { Topbar } from "../DashboardPage/TopBar/TopBar";
import { ApplicationData } from "@/utils/types/types";
import CustomLoader from "@/components/common/CustomLoader";

type PublicLayoutProps = {
  children: React.ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { user } = useAuthStore();
  const { colorScheme } = useMantineColorScheme();
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user || !user.email) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await getApplicantDataByEmail(user.email);
        if (error) {
          setError(error);
        } else {
          setApplications(data || []);
        }
      } catch (err) {
        setError("Failed to fetch application data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  const isApplicationsPage = usePathname() === "/public/applications";

  const PublicBreadcrumbs = () => {
    const path = usePathname();
    if (!path) return null;
    const segments = path.split("/").filter(Boolean);
    const publicIndex = segments.indexOf("public");
    const crumbs = publicIndex !== -1 ? segments.slice(publicIndex) : segments;
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
              <a
                href={crumb.href}
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "inherit",
                  textDecoration: "none",
                  borderRadius: 4,
                  padding: "2px 6px",
                  textTransform: "capitalize",
                  transition: "text-decoration 0.2s",
                  textUnderlineOffset: 3,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.textDecoration = "underline")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.textDecoration = "none")
                }
              >
                {crumb.label}
              </a>
            )}
          </Group>
        ))}
      </Group>
    );
  };

  if (!user) {
    return (
      <Center h="100vh">
        <Text size="lg">Please sign in to view your applications.</Text>
      </Center>
    );
  }

  let mainContent;
  if (isApplicationsPage) {
    if (loading) {
      mainContent = (
        <Center h="50vh">
          <CustomLoader />
        </Center>
      );
    } else if (error) {
      mainContent = (
        <Center h="50vh">
          <Text c="red">{error}</Text>
        </Center>
      );
    } else {
      mainContent = <ApplicationList applications={applications} />;
    }
  } else {
    mainContent = children;
  }

  return (
    <Flex direction="column" h="100vh">
      <Topbar user={user} />
      <Flex flex={1} className="overflow-hidden">
        <PublicSidebar />
        <main
          style={{
            overflow: "auto",
            flex: 1,
            backgroundColor: colorScheme === "dark" ? "#12121240" : "#9eabaf20",
            padding: "20px 0",
          }}
        >
          <PublicBreadcrumbs />
          {mainContent}
        </main>
      </Flex>
    </Flex>
  );
}
