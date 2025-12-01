"use server";

import { createSupabaseServerClient } from "@/utils/supabase/serverClient";

export const deleteUserFromAuth = async (userId: string) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error deleting user from auth:", err);
    return { error: err as Error };
  }
};
