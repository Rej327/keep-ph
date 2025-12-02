"use client";

import useAuthStore from "@/zustand/stores/useAuthStore";
import React from "react";
import useSWR from "swr";
import { getUserHasAccount, isAccountFree } from "@/actions/supabase/get";
import MailroomClient from "./MailroomClient";
import MailroomService from "./MailroomService";
import { useShallow } from "zustand/shallow";

export default function MailroomLayout() {
  const user = useAuthStore(useShallow((state) => state.user));

  console.log("User id", user?.id);

  const { data: userHasAccount } = useSWR(
    user ? ["user-has-account", user.id] : null,
    ([, userId]) => getUserHasAccount(userId)
  );

  const { data: useIsFreePlan, error } = useSWR(
    user ? ["user-is=free-plan", user.id] : null,
    ([, userId]) => isAccountFree(userId)
  );

  console.log("User Plan", useIsFreePlan);
  console.log("Error fetching plan", error);

  const accessMailService = useIsFreePlan?.account_type !== "AT-FREE";
  const accessAccount = useIsFreePlan?.account_status !== "SST-ACTIVE";

  if (userHasAccount && accessMailService && accessAccount)
    return <MailroomClient />;

  return <MailroomService />;
}
