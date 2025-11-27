import { CustomerApiResponse } from "@/components/page/Admin/Customers/CustomersClient";
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
    account_max_quantity_storage: number;
    account_max_gb_storage: number;
    account_max_mailbox_access: number;
    account_subscription_ends_at: string | null;
    account_subscription_status_id: string;
    account_subscription_status_value: string;
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
  console.log(data);
  return data as UserFullDetails;
};

export const getMailAccessLimit = async (userId: string, planId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_mail_access_limit", {
    input_user_id: userId,
    input_plan_id: planId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as number;
};

export const filterExistingLabel = async () => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .schema("mailroom_schema")
    .from("mailbox_table")
    .select("mailbox_label");

  if (error) {
    console.error("Error fetching labels:", error);
    return null;
  }

  return data; // This will be an array of rows with only mailbox_label
};

export const getAllCustomers = async (filters?: {
  search?: string;
  status_filter?: string;
  type_filter?: string;
  sort_order?: "asc" | "desc";
}) => {
  const supabase = createSupabaseBrowserClient();

  const inputData = {
    search: filters?.search || "",
    status_filter: filters?.status_filter || "",
    type_filter: filters?.type_filter || "",
    sort_order: filters?.sort_order || "desc",
  };

  const { data, error } = await supabase.rpc("get_all_customers", {
    input_data: inputData,
  });

  if (error) {
    console.error("Error fetching customers:", error);
    throw new Error(error.message);
  }

  return data as CustomerApiResponse[];
};

export const getMailboxesByAccountId = async (accountId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .schema("mailroom_schema")
    .from("mailbox_table")
    .select("*")
    .eq("mailbox_account_id", accountId)
    .eq("mailbox_status_id", "MBS-ACTIVE");

  if (error) {
    console.error("Error fetching mailboxes:", error);
    throw new Error(error.message);
  }

  return data;
};

export type MailItem = {
  mail_item_id: string;
  mail_item_sender: string | null;
  mail_item_name: string | null;
  mail_item_description: string | null;
  mail_item_received_at: string;
  mail_item_created_at: string;
  mail_item_is_read: boolean;
  mail_item_status_value: string;
  mail_attachment_unopened_scan_file_path: string | null;
  mail_attachment_item_scan_file_path: string | null;
  mailbox_label: string | null;
};

export const getMailItemsByUser = async (
  userId: string,
  accountNo: string,
  mailboxId?: string
) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc(
    "get_all_item_mail_by_user_account_no_and_mailbox_id",
    {
      input_user_id: userId,
      input_account_no: accountNo,
      input_mailbox_id: mailboxId || null,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data as MailItem[];
};
