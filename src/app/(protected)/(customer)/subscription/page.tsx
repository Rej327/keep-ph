import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { redirect } from "next/navigation";

export default async function SubscriptionPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <div className="container mx-auto py-8"></div>;
}
