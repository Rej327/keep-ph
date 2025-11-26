import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
        {/* Profile content will go here */}
        <p>User Email: {user.email}</p>
        {/* Additional profile fields will be added here */}
      </div>
    </div>
  );
}
