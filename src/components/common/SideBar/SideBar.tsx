import {
  Group,
  ScrollArea,
  ActionIcon,
  Drawer,
  Text,
  Stack,
  ThemeIcon,
  Button,
  Progress,
  Avatar,
} from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  IconChevronUp,
  IconChevronRight,
  IconMenu2,
  IconLayoutDashboard,
  IconMail,
  IconMailOpened,
  IconTrash,
  IconUsers,
  IconUser,
  IconChartBar,
  IconArrowsMaximize,
  IconCreditCard,
  IconShieldLock,
  IconUpload,
  IconPlus,
} from "@tabler/icons-react";
import classes from "./SideBar.module.css";
import { User } from "@supabase/supabase-js";

type LinksGroupProps = {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  link?: string;
  links?: { label: string; link: string }[];
};

const adminLinks: LinksGroupProps[] = [
  {
    label: "Admin Dashboard",
    icon: IconLayoutDashboard,
    link: "/admin/dashboard",
  },
  { label: "All Mail Items", icon: IconMail, link: "/admin/mail" },
  { label: "View Mail Item", icon: IconMailOpened, link: "/admin/mail/view" },
  { label: "Shredding Requests", icon: IconTrash, link: "/admin/shredding" },
  { label: "All Customers", icon: IconUsers, link: "/admin/customers" },
  { label: "Customer Detail", icon: IconUser, link: "/admin/customers/detail" },
  { label: "System Stats", icon: IconChartBar, link: "/admin/stats" },
];

const customerLinks: LinksGroupProps[] = [
  { label: "Dashboard", icon: IconLayoutDashboard, link: "/dashboard" },
  { label: "Profile", icon: IconUser, link: "/profile" },
  { label: "All Mail", icon: IconMail, link: "/mail" },
  { label: "Shredding Request", icon: IconArrowsMaximize, link: "/shredding" },
  { label: "Subscription", icon: IconCreditCard, link: "/subscription" },
];

function LinksGroup({ label, icon: Icon, link, links }: LinksGroupProps) {
  const pathname = usePathname();
  const nestedRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const hasSubLinks = Array.isArray(links) && links.length > 0;
  const hasActiveChild = links?.some((sub) => sub.link === pathname);
  const [opened, setOpened] = useState(hasActiveChild || false);

  useEffect(() => {
    if (nestedRef.current) {
      setHeight(nestedRef.current.scrollHeight);
    }
  }, [nestedRef, links, opened]);

  if (hasSubLinks) {
    return (
      <div className={classes.linksGroup}>
        <div
          className={`${classes.mainLinkWrapper} ${
            hasActiveChild ? classes.activeParent : ""
          }`}
          onClick={() => setOpened(!opened)}
        >
          <Group align="center">
            <Icon size={20} className={classes.icon} />
            <Text size="sm">{label}</Text>
          </Group>
          <div className={classes.chevronWrapper}>
            {opened ? (
              <IconChevronUp size={16} />
            ) : (
              <IconChevronRight size={16} />
            )}
          </div>
        </div>

        <div
          ref={nestedRef}
          className={classes.nestedLinks}
          style={{ maxHeight: opened ? `${height}px` : "0px" }}
        >
          {links!.map((sub) => {
            const isActive = pathname === sub.link;
            return (
              <Link
                key={sub.label}
                href={sub.link}
                className={`${classes.link} ${isActive ? classes.active : ""}`}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const isActive = pathname === link;

  return (
    <Link
      href={link!}
      className={`${classes.mainLinkWrapper} ${isActive ? classes.active : ""}`}
    >
      <Group align="center" gap="sm">
        <Icon size={20} className={classes.icon} />
        <Text size="sm">{label}</Text>
      </Group>
    </Link>
  );
}

export type SideBarProps = {
  type?: "admin" | "customer";
  user?: User | null;
  mobileOpened?: boolean;
  onMobileClose?: () => void;
  onMobileOpen?: () => void;
};

export function SideBar({
  type = "customer",
  user,
  mobileOpened = false,
  onMobileClose,
  onMobileOpen,
}: SideBarProps) {
  const linksData = type === "admin" ? adminLinks : customerLinks;
  const memoLinks = useMemo(() => linksData, [linksData]);

  const mainLinks = memoLinks.map((item) => (
    <LinksGroup {...item} key={item.label} />
  ));

  const renderHeader = () => {
    if (type === "admin") {
      return (
        <Group className={classes.header} p="md" mb="md">
          <ThemeIcon size="lg" variant="light" color="blue">
            <IconShieldLock size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text fw={700} size="sm" lh={1.2}>
              Keep PH
            </Text>
            <Text size="xs" c="dimmed" lh={1.2}>
              Admin Panel
            </Text>
          </Stack>
        </Group>
      );
    }

    return (
      <Group className={classes.header} p="md" mb="md">
        <Avatar src={user?.user_metadata?.avatar_url} radius="xl" />
        <Stack gap={0}>
          <Text fw={700} size="sm" lh={1.2}>
            Keep PH
          </Text>
          <Text size="xs" c="dimmed" lh={1.2}>
            Mail Management
          </Text>
        </Stack>
      </Group>
    );
  };

  const renderFooter = () => {
    if (type === "admin") {
      return (
        <div className={classes.footer}>
          <Button fullWidth leftSection={<IconUpload size={16} />}>
            Upload Scanned Mail
          </Button>
        </div>
      );
    }

    return (
      <div className={classes.footer}>
        <Stack gap="xs" mb="md">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Storage Usage
            </Text>
            <Text size="sm" fw={500}>
              65%
            </Text>
          </Group>
          <Progress value={65} size="sm" />
          <Text size="xs" c="dimmed">
            6.5 GB of 10 GB used
          </Text>
        </Stack>
        <Button fullWidth leftSection={<IconPlus size={16} />}>
          New Scan
        </Button>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={classes.layout}>
        <nav className={classes.navbar}>
          {renderHeader()}
          <ScrollArea className={classes.links}>
            <div className={classes.linksInner}>{mainLinks}</div>
          </ScrollArea>
          {renderFooter()}
        </nav>
      </div>

      {/* Mobile Floating Action Button - Show only for admin as customer has topbar toggle */}
      {type === "admin" && (
        <ActionIcon
          size="xl"
          variant="filled"
          color="#1966D1"
          className={classes.actionIcon}
          style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1100 }}
          onClick={onMobileOpen}
        >
          <IconMenu2 size={24} />
        </ActionIcon>
      )}

      {/* Drawer for mobile */}
      <Drawer
        opened={mobileOpened}
        onClose={onMobileClose || (() => {})}
        title="Menu"
        padding="md"
        size="80%"
        zIndex={1200}
      >
        {renderHeader()}
        <div className={classes.linksInner}>{mainLinks}</div>
        {renderFooter()}
      </Drawer>
    </>
  );
}
