import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { redirect } from "next/navigation";
import React from "react";

export default async function PublicProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims || null;

  if (user) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
