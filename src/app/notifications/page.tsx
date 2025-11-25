import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { mockSubscriptions } from "@/utils/mockData";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use mock data for subscription check
  const subscription = mockSubscriptions.find((sub) => sub.user_id === user.id);

  if (!subscription) {
    redirect("/subscription");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Notifications</h2>
        {/* Notifications content will go here */}
        <div className="space-y-4">
          {/* Sample notifications - will be replaced with real data */}
          <div className="p-4 border-b">
            <p className="font-medium">New mail received</p>
            <p className="text-gray-600 text-sm">
              A new mail has been scanned and added to your mailbox.
            </p>
            <p className="text-gray-400 text-xs mt-1">2 hours ago</p>
          </div>
          <div className="p-4 border-b">
            <p className="font-medium">Subscription renewed</p>
            <p className="text-gray-600 text-sm">
              Your subscription has been successfully renewed.
            </p>
            <p className="text-gray-400 text-xs mt-1">2 days ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}
