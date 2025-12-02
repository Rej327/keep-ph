"use server";

import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
// import { createClient } from "@supabase/supabase-js";

export const deleteUserFromAuth = async (userId: string) => {
  try {
    // 1. Verify the caller is the user they claim to be
    const supabaseServer = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Allow deletion if user is deleting themselves OR user is admin
    // (For now, strictly checking self-deletion for this flow)
    if (user.id !== userId) {
      // Check if admin? (Optional, but for this specific profile flow, strict check is safer)
      throw new Error("Unauthorized: You can only delete your own account.");
    }

    // 2. Initialize Admin Client
    // const supabaseAdmin = createClient(
    //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   process.env.NEXT_SERVICE_ROLE_KEY!,
    //   {
    //     auth: {
    //       autoRefreshToken: false,
    //       persistSession: false,
    //     },
    //   }
    // );

    const supabaseAdmin = createSupabaseBrowserClient();

    // 3. Delete User
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    console.error("Error deleting user from auth:", err);
    return { error: err as Error };
  }
};

export const deleteUserPhysicalAddress = async (
  userAddressId: string,
  userId: string
) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc("delete_user_physical_address", {
      input_data: {
        user_address_id: userAddressId,
        user_id: userId,
      },
    });

    if (error) throw error;
    return { data };
  } catch (err) {
    console.error("Error deleting user physical address:", err);
    return { error: err as Error };
  }
};
