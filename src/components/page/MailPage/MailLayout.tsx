"use client";

import useAuthStore from "@/zustand/stores/useAuthStore";
import useSWR from "swr";
import { getUserFullDetails } from "@/actions/supabase/get";
import MailClient from "./MailClient";
import MailService from "./MailService";
import { useShallow } from "zustand/shallow";
import CustomLoader from "@/components/common/CustomLoader";

export default function MailLayout() {
  const user = useAuthStore(useShallow((state) => state.user));

  const { data: userDetails, isLoading } = useSWR(
    user ? ["user-full-details", user.id] : null,
    ([, userId]) => getUserFullDetails(userId)
  );

  if (isLoading) {
    return <CustomLoader />;
  }

  const hasAccount = !!userDetails?.account;
  const isPaidPlan = userDetails?.account?.account_type !== "AT-FREE";
  const isActiveAccount =
    userDetails?.account?.account_subscription_status_id === "SST-ACTIVE";

  if (hasAccount && isPaidPlan && isActiveAccount) return <MailClient />;

  return <MailService />;
}
