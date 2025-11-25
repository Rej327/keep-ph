import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { mockMailItems, mockUsers } from "@/utils/mockData";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!data || data.role !== "admin") {
    redirect("/dashboard");
  }

  // Use mock data for statistics
  const mailCount = mockMailItems.length;
  const customerCount = mockUsers.filter(
    (user) => user.role === "customer"
  ).length;
  const disposeCount = mockMailItems.filter(
    (mail) => mail.dispose_requested
  ).length;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Total Mail Items</h2>
          <p className="text-3xl font-bold">{mailCount || 0}</p>
          <Link
            href="/admin/mail"
            className="text-blue-600 text-sm mt-2 inline-block"
          >
            View All Mail
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Total Customers</h2>
          <p className="text-3xl font-bold">{customerCount || 0}</p>
          <Link
            href="/admin/customers"
            className="text-blue-600 text-sm mt-2 inline-block"
          >
            View All Customers
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">
            Pending Dispose Requests
          </h2>
          <p className="text-3xl font-bold">{disposeCount || 0}</p>
          <Link
            href="/admin/mail/dispose-requests"
            className="text-blue-600 text-sm mt-2 inline-block"
          >
            View Dispose Requests
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Mail</h2>
            <Link href="/admin/mail" className="text-blue-600 text-sm">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {/* This would be populated with actual data */}
            <p className="text-gray-500">No recent mail items to display.</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>

          <div className="space-y-2">
            <Link
              href="/admin/mail/upload"
              className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700"
            >
              Upload New Mail
            </Link>
            <Link
              href="/admin/stats"
              className="block w-full bg-gray-200 text-gray-800 text-center py-2 px-4 rounded hover:bg-gray-300"
            >
              View Statistics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
