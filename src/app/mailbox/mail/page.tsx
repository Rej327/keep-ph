import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { mockMailItems, mockSubscriptions } from "@/utils/mockData";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MailboxPage() {
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

  // Use mock data for mail items
  const mailItems = mockMailItems
    .filter((mail) => mail.user_id === user.id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Mailbox</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Received Mail</h2>

        {mailItems && mailItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mailItems.map((mail: any) => (
                  <tr key={mail.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(mail.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mail.sender || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mail.type || "Letter"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/mailbox/mail/${mail.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </Link>
                      <Link
                        href={`/mailbox/mail/${mail.id}/dispose`}
                        className="text-red-600 hover:text-red-900"
                      >
                        Dispose
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No mail items found.</p>
        )}
      </div>
    </div>
  );
}
