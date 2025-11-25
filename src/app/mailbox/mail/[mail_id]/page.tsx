import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { mockMailItems, mockSubscriptions } from "@/utils/mockData";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MailDetailPage({
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mail Details</h1>
        <div>
          <Link
            href="/mailbox/mail"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded mr-2"
          >
            Back to Mailbox
          </Link>
          <Link
            href={`/mailbox/mail/${mailId}/dispose`}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            Dispose Mail
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Mail Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Date Received</p>
                <p>{new Date(mail.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sender</p>
                <p>{mail.sender || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p>{mail.type || "Letter"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p>{mail.description || "No description provided"}</p>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Scanned Images</h2>
            <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px] flex items-center justify-center">
              {mail.images && mail.images.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {mail.images.map((image: string, index: number) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Scanned mail page ${index + 1}`}
                      className="max-w-full h-auto"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No scanned images available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
