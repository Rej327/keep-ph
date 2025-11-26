"use server";

import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
type CreateUserAccountParams = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType?: string;
};

export const createUserAccount = async (userData: CreateUserAccountParams) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc("create_user_account" as never, {
      input_data: {
        user_id: userData.userId,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        account_type: userData.accountType || "AT-FREE",
      },
    });

    if (error) throw error;
    return { data };
  } catch (err) {
    console.error("Error creating user account:", err);
    return { error: err as Error };
  }
};
