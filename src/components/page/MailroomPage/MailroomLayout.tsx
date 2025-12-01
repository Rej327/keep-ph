"use client";

import useAuthStore from "@/zustand/stores/useAuthStore";
import React from "react";
import useSWR from "swr";
import { getUserHasAccount } from "@/actions/supabase/get";
import MailroomClient from "./MailroomClient";
import MailroomService from "./MailroomService";

export default function MailroomLayout() {
  const { user } = useAuthStore();
  const { data: useHasAccount } = useSWR(
    user ? ["user-has-account", user.id] : null,
    ([, userId]) => getUserHasAccount(userId)
  );

  if (useHasAccount) return <MailroomClient />;
  return <MailroomService />;
}
