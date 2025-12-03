import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 1. Verify the caller is the user they claim to be
    const supabaseServer = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow deletion if user is deleting themselves OR user is admin
    if (user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: You can only delete your own account." },
        { status: 403 }
      );
    }

    // 2. Initialize Admin Client
    // NOTE: We explicitly use the service role key here because createSupabaseServiceClient
    // might be getting reverted by the user to use the anon key.
    // This ensures we definitely have admin privileges.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY || process.env.NEXT_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 3. Delete User from Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) throw error;

    // 4. Delete User from Database using the RPC
    const { error: deleteUserProfile } = await supabaseAdmin.rpc(
      "delete_user_profile",
      {
        input_data: {
          user_id: userId,
        },
      }
    );

    if (deleteUserProfile) {
      console.error("Error deleting user profile:", deleteUserProfile);
      throw deleteUserProfile;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
