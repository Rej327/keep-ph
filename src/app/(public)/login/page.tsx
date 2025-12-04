import AuthPage from "@/components/page/AuthPage/AuthPage";
import PublicProvider from "@/components/providers/PublicProvider";
import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <PublicProvider>
      <AuthPage />
    </PublicProvider>
  );
}
