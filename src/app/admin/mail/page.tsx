import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { mockMailItems, mockUsers } from "@/utils/mockData";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminMailListPage() {
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

  // Use mock data for mail items
  // Add profile email to each mail item
  const mailItems = mockMailItems
    .map((mail) => {
      const user = mockUsers.find((u) => u.id === mail.user_id);
      return {
        ...mail,
        profiles: { email: user?.email || "Unknown" },
      };
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Mail</h1>
        <div>
          <Link
            href="/admin"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded mr-2"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/admin/mail/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Upload New Mail
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mailItems && mailItems.length > 0 ? (
                mailItems.map((mail: any) => (
                  <tr key={mail.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{mail.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(mail.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mail.profiles?.email || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mail.sender || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mail.type || "Letter"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mail.dispose_requested ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Dispose Requested
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/mail/${mail.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No mail items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
