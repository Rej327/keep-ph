"use client";

import { redirect } from "next/navigation";
import SubscriptionClient from "@/components/page/SubscriptionPage/SubscriptionClient";
import useAuthStore from "@/zustand/stores/useAuthStore";

export default function SubscriptionPage() {
  const { user } = useAuthStore();

  if (!user) {
    redirect("/login");
  }

  return <SubscriptionClient user={user} />;
}
