"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import useAuthStore from "@/zustand/stores/useAuthStore";
import { notifications } from "@mantine/notifications";
import { markToastAsShown } from "@/actions/supabase/notification";
import { IconBell } from "@tabler/icons-react";
import { mutate } from "swr";
import { usePathname } from "next/navigation";
import { getUserFullDetails } from "@/actions/supabase/get";
import useSWR from "swr";

export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();

  const { data: userDetails } = useSWR(
    user ? ["user-details", user.id] : null,
    () => getUserFullDetails(user!.id)
  );

  useEffect(() => {
    if (!userDetails?.account?.account_id) return;

    const accountId = userDetails.account.account_id;
    const supabase = createSupabaseBrowserClient();

    console.log("Subscribing to notifications for account:", accountId);

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "notification_schema",
          table: "notification_table",
          // Now filtering by account_id because the table uses account_id
          filter: `notification_target_user_id=eq.${accountId}`,
        },
        (payload) => {
          console.log("Realtime Payload Received:", payload);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newNotif = payload.new as any;

          // 1. Show Toast if not shown (though newly inserted should be not shown)
          if (!newNotif.notification_toast_shown) {
            notifications.show({
              title: newNotif.notification_title,
              message: newNotif.notification_message,
              icon: <IconBell size={16} />,
              color: "blue",
              autoClose: 5000,
              withBorder: true,
            });

            // 2. Mark as Toast Shown in background
            markToastAsShown(newNotif.notification_id).catch(console.error);
          }

          // 3. Revalidate/Mutate data
          // If we are on the notification page or dropdown is open, we should refresh the list
          mutate("user-notifications");
          mutate("unread-notification-count");
          // Also mutate the paginated key if possible, though it's complex with args.
          // A global revalidation of 'user-notifications-page' might be needed.
        }
      )
      .subscribe((status) => {
        console.log("Realtime Subscription Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userDetails, pathname]);

  return <>{children}</>;
}
