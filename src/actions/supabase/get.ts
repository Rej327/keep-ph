import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";

export const isUserAdmin = async (userId: string): Promise<boolean> => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("is_user_admin", {
    input_user_uuid: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as boolean;
};

export const isAccountSubscribed = async (userId: string): Promise<boolean> => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("is_account_subscribed", {
    input_account_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  console.log(data);

  return data as boolean;
};

export type UserFullDetails = {
  user: {
    user_id: string;
    user_username: string | null;
    user_email: string;
    user_first_name: string | null;
    user_last_name: string | null;
    user_is_admin: boolean;
    user_avatar_bucket_path: string | null;
  };
  account: {
    account_id: string;
    account_user_id: string;
    account_number: string;
    account_area_code: string;
    account_type: string;
    account_type_value: string;
    account_is_subscribed: boolean;
    account_subscription_ends_at: string | null;
  };
  virtual_address: {
    virtual_address_id: string;
    virtual_address_account_id: string;
    virtual_address_address: string;
    virtual_address_street: string | null;
    virtual_address_city: string;
    virtual_address_province: string;
    virtual_address_postal_code: string | null;
    virtual_address_country: string;
    virtual_address_area_code: string;
    virtual_address_status_id: string;
    virtual_address_status_value: string;
  };
};

export const getUserFullDetails = async (userId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_user_full_details", {
    input_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as UserFullDetails;
};
