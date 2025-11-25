import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { mockUsers } from "@/utils/mockData";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminMailUploadPage() {
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

  // Use mock data for customers dropdown
  const customers = mockUsers
    .filter((user) => user.role === "customer")
    .map((user) => ({ id: user.id, email: user.email }))
    .sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Upload Mail</h1>
        <Link
          href="/admin/mail"
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
        >
          Back to Mail List
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form
          action="/api/admin/mail/upload"
          method="POST"
          encType="multipart/form-data"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer
              </label>
              <select
                name="customerId"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                required
              >
                <option value="">Select a customer</option>
                {customers &&
                  customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.email}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mail Type
              </label>
              <select
                name="mailType"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                required
              >
                <option value="">Select mail type</option>
                <option value="letter">Letter</option>
                <option value="package">Package</option>
                <option value="document">Document</option>
                <option value="postcard">Postcard</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sender
              </label>
              <input
                type="text"
                name="sender"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                placeholder="Enter sender name or organization"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Received
              </label>
              <input
                type="date"
                name="dateReceived"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              placeholder="Enter a brief description of the mail item"
            ></textarea>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Scanned Images
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload files</span>
                    <input
                      id="file-upload"
                      name="files"
                      type="file"
                      className="sr-only"
                      multiple
                      accept="image/*"
                      required
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB each
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded"
            >
              Upload Mail
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
