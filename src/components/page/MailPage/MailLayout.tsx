"use client";

import useAuthStore from "@/zustand/stores/useAuthStore";
import React from "react";
import useSWR from "swr";
import { getUserHasAccount, isAccountFree } from "@/actions/supabase/get";
import MailClient from "./MailClient";
import MailService from "./MailService";
import { useShallow } from "zustand/shallow";
import CustomLoader from "@/components/common/CustomLoader";

export default function MailLayout() {
  const user = useAuthStore(useShallow((state) => state.user));

  const { data: userHasAccount, isLoading: isLoadingAccount } = useSWR(
    user ? ["user-has-account", user.id] : null,
    ([, userId]) => getUserHasAccount(userId)
  );

  const {
    data: useIsFreePlan,
    error,
    isLoading: isLoadingPlan,
  } = useSWR(user ? ["user-is-free-plan", user.id] : null, ([, userId]) =>
    isAccountFree(userId)
  );

  console.log("User Plan", useIsFreePlan);
  console.log("Error fetching plan", error);

  const isPaidPlan = useIsFreePlan?.account_type !== "AT-FREE";
  const isActiveAccount = useIsFreePlan?.account_status === "SST-ACTIVE";

  if (isLoadingAccount || isLoadingPlan) {
    return <CustomLoader />;
  }

  if (userHasAccount && isPaidPlan && isActiveAccount) return <MailClient />;

  return <MailService />;
}
