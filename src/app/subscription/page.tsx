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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Subscription</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Subscription Plans</h2>
        {/* Subscription content will go here */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Subscription plans will be added here */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold">Basic Plan</h3>
            <p className="text-gray-600 mt-2">For individuals</p>
            <p className="text-2xl font-bold mt-4">₱299/mo</p>
            <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md">
              Subscribe
            </button>
          </div>
          {/* More plans */}
        </div>
      </div>
    </div>
  );
}
