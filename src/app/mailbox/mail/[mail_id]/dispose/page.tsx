import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { mockMailItems, mockSubscriptions } from "@/utils/mockData";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DisposeMailPage({
  params,
}: {
  params: { mail_id: string };
}) {
  const mailId = params.mail_id;

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

  // Use mock data for mail item details
  const mail = mockMailItems.find(
    (mail) => mail.id === mailId && mail.user_id === user.id
  );

  if (!mail) {
    // Mail not found or doesn't belong to user
    redirect("/mailbox/mail");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dispose Mail</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Confirm Disposal Request</h2>
          <p className="text-gray-600 mt-2">
            Are you sure you want to request disposal of this mail item? This
            action cannot be undone.
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Mail Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date Received</p>
              <p>{new Date(mail.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sender</p>
              <p>{mail.sender || "Unknown"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p>{mail.type || "Letter"}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <Link
            href={`/mailbox/mail/${mailId}`}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-6 rounded"
          >
            Cancel
          </Link>
          <form action="/api/mail/dispose" method="POST">
            <input type="hidden" name="mailId" value={mailId} />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded"
            >
              Confirm Disposal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
