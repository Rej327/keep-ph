"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { redirect } from "next/navigation";
import SubscriptionClient from "@/components/page/SubscriptionPage/SubscriptionClient";
import useAuthStore from "@/zustand/stores/useAuthStore";
import { notifications } from "@mantine/notifications";

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
      // Payment was successful - show success message and clean URL
      notifications.show({
        message: "Payment successful! Your subscription has been activated.",
        color: "green",
      });
      router.replace("/customer/subscription");
    }
  }, [searchParams, router]);

  if (!user) {
    redirect("/login");
  }

  return <SubscriptionClient user={user} />;
}
