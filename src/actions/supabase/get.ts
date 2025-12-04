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

export const isAccountBusiness = async (userId: string): Promise<boolean> => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("is_account_business", {
    input_account_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as boolean;
};

export type IsAcccountFree = {
  account_type: string;
  account_status: string;
};

export const isAccountFree = async (userId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("is_account_free", {
    input_account_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  console.log("isAccountFree", data);

  return data as IsAcccountFree;
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
    account_address_key: string;
    account_type: string;
    account_type_sort_order: number;
    account_type_value: string;
    account_is_subscribed: boolean;
    account_max_quantity_storage: number;
    account_max_gb_storage: number;
    account_max_mailbox_access: number;
    account_remaining_mailbox_access: number;
    account_subscription_ends_at: string | null;
    account_subscription_status_id: string;
    account_subscription_status_value: string;
  };
  address: {
    mailroom_address_id: string;
    mailroom_address_key: string;
    mailroom_address_value: string;
    mailroom_address_link: string | null;
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

export type UserProfileDetail = {
  user_id: string;
  user_username: string | null;
  user_email: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_phone: string | null;
  user_is_admin: boolean;
  user_avatar_bucket_path: string | null;
  user_referral_email: string | null;
};

export const getUser = async (userId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_user", {
    input_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const userDetails = data.user as UserProfileDetail;
  if (userDetails.user_avatar_bucket_path) {
    const { data: publicUrlData } = supabase.storage
      .from("USER-AVATARS")
      .getPublicUrl(userDetails.user_avatar_bucket_path);
    userDetails.user_avatar_bucket_path = publicUrlData.publicUrl;
  }

  console.log(userDetails);
  return userDetails;
};

export type UserMailAccessLimit = {
  account_max_mailbox_access: number;
  account_max_quantity_storage: number;
  account_max_gb_storage: number;
  account_max_parcel_handling: number;
  account_duration_days: number;
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
  console.log("Limit: ", data);
  return data as UserMailAccessLimit;
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

  return data;
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
  mail_item_type: string;
  mail_attachment_unopened_scan_file_path: string | null;
  mail_attachment_item_scan_file_path: string | null;
  mailbox_label: string | null;
  has_retrieval_request: boolean;
  has_disposal_request: boolean;
  has_scan_request: boolean;
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
  console.log("Customer Mails: ", data);
  return data as MailItem[];
};

export type MailroomItem = {
  mailbox_id: string;
  mailbox_label: string | null;
  mailbox_status_id: string;
  mailbox_status_value: string;
  mailbox_mail_remaining_space: number;
  mailbox_package_remaining_space: number;
  account_address_key: string;
  account_remaining_mailbox_access: number;
  account_max_quantity_storage: number;
  account_max_parcel_handling: number;
  account_id: string;
  account_number: string;
  user_id: string;
  user_full_name: string;
  user_email: string;
  mailbox_created_at: string;
};

export const getAllMailrooms = async (filters?: {
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

  const { data, error } = await supabase.rpc("get_all_mailrooms", {
    input_data: inputData,
  });

  console.log("All Mailrooms:", data);

  if (error) {
    console.error("Error fetching mailrooms:", error);
    throw new Error(error.message);
  }

  return data as MailroomItem[];
};

export type DisposalRequestItem = {
  dispose_request_id: string;
  dispose_request_mail_item_id: string;
  dispose_request_account_id: string;
  dispose_request_status_id: string;
  dispose_request_status_value: string;
  dispose_request_requested_at: string;
  mail_item_name: string | null;
  mail_item_sender: string | null;
  user_id: string;
  user_full_name: string;
  user_email: string;
  account_address_key: string;
  account_account_number: string;
  account_type: string;
  account_type_value: string;
};

export const getAllDisposalRequests = async (filters?: {
  search?: string;
  status_filter?: string;
  sort_order?: "asc" | "desc";
}) => {
  const supabase = createSupabaseBrowserClient();

  const inputData = {
    search: filters?.search || "",
    status_filter: filters?.status_filter || "",
    sort_order: filters?.sort_order || "desc",
  };

  const { data, error } = await supabase.rpc("get_all_disposal_requests", {
    input_data: inputData,
  });

  if (error) {
    console.error("Error fetching disposal requests:", error);
    throw new Error(error.message);
  }

  console.log("disposal req: ", data);

  return data as DisposalRequestItem[];
};

export const getUserHasAccount = async (userId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_user_has_account", {
    input_user_id: userId,
  });

  if (error) {
    console.error("Error checking if user has account:", error);
    throw new Error(error.message);
  }

  return data as boolean;
};

export type SubscriptionPlanFeature = {
  feature_label: string;
  display_text: string;
  is_primary: boolean;
  sort_order: number;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  description: string;
  popular: boolean;
  button_text: string;
  usage_note: string | null;
  features: SubscriptionPlanFeature[];
};

export const getSubscriptionPlans = async () => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_subscription_plans", {
    input_data: {},
  });

  if (error) {
    console.error("Error fetching subscription plans:", error);
    throw new Error(error.message);
  }

  return data as SubscriptionPlan[];
};

export type VirtualAddressLocation = {
  mailroom_address_id: string;
  mailroom_address_key: string;
  mailroom_address_value: string;
  mailroom_address_link?: string;
};

export const getVirtualAddressLocations = async () => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_active_addresses");

  if (error) {
    console.error("Error fetching virtual address locations:", error);
    throw new Error(error.message);
  }

  console.log("Virtual Address: ", data);

  return data as VirtualAddressLocation[];
};

export type FreeSubscriber = {
  account_user_id: string;
  user_email: string;
};

export const getAllFreeSubscribers = async () => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_all_free_subscriber");

  if (error) {
    console.error("Error fetching free subscribers:", error);
    throw new Error(error.message);
  }

  console.log("Free Subscribers: ", data);

  return data.referral_user as FreeSubscriber[];
};

export type UserReferral = {
  referral_id: string;
  invitee_email: string;
  account_address_key: string | null;
  status: string | null;
  account_type: string | null;
  account_type_value: string | null;
  account_updated_at: string | null;
};

export const getUserReferrals = async (userId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_user_referrals", {
    input_user_id: userId,
  });

  if (error) {
    console.error("Error fetching user referrals:", error);
    throw new Error(error.message);
  }

  console.log("User Referrals: ", data);

  return data as UserReferral[];
};

export type UserPhysicalAddress = {
  user_address_id: string;
  user_address_user_id: string;
  user_address_label: string | null;
  user_address_line1: string;
  user_address_line2: string | null;
  user_address_city: string;
  user_address_province: string;
  user_address_postal_code: string;
  user_address_country: string;
  user_address_is_default: boolean;
};

export const getUserPhysicalAddresses = async (userId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_user_physical_addresses", {
    input_data: {
      user_id: userId,
    },
  });

  if (error) {
    console.error("Error fetching user physical addresses:", error);
    throw new Error(error.message);
  }

  return (data || []) as UserPhysicalAddress[];
};

export const getUserAddresses = async (userId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_user_address", {
    input_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Array<{
    address_id: string;
    address_value: string;
    address_label: string | null;
    address_is_default: boolean;
  }>;
};

export type MailHasRequestAction = {
  has_request_retrieval: boolean;
  has_request_disposal: boolean;
  has_request_scan: boolean;
};

export const getMailHasRequestAction = async (mailItemId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_mail_has_request_action", {
    input_mail_item_id: mailItemId,
  });

  if (error) {
    console.error("Error fetching mail has request action:", error);
    throw new Error(error.message);
  }

  console.log("Mail Has Request Action: ", data);

  return data as MailHasRequestAction;
};

export type RetrievalRequestItem = {
  retrieval_request_id: string;
  retrieval_request_status_value: string;
  retrieval_request_requested_at: string;
  retrieval_request_courier: string | null;
  retrieval_request_tracking_number: string | null;
  retrieval_request_address: string;
  retrieval_request_label_url: string | null;
  retrieval_request_notes: string | null;
  mail_item_sender: string | null;
  user_full_name: string;
  user_email: string;
  account_address_key: string;
  account_number: string;
  account_type_value: string;
  total_count: number;
};

export const getRetrievalRequests = async (filters?: {
  search?: string;
  status_filter?: string;
  page?: number;
  page_size?: number;
  sort_order?: "asc" | "desc";
}) => {
  const supabase = createSupabaseBrowserClient();

  const inputData = {
    search: filters?.search || "",
    status_filter: filters?.status_filter || "",
    page: filters?.page || 1,
    page_size: filters?.page_size || 10,
    sort_order: filters?.sort_order || "desc",
  };

  const { data, error } = await supabase.rpc("get_retrieval_requests", {
    input_data: inputData,
  });

  if (error) {
    console.error("Error fetching retrieval requests:", error);
    throw new Error(error.message);
  }

  return data as RetrievalRequestItem[];
};

export type ScanRequestItem = {
  scan_request_id: string;
  scan_request_status_value: string;
  scan_request_requested_at: string;
  scan_request_instructions: string | null;
  scan_request_url: string | null;
  mail_item_sender: string | null;
  user_full_name: string;
  user_email: string;
  account_address_key: string;
  account_number: string;
  account_type_value: string;
  total_count: number;
};

export const getScanRequests = async (filters?: {
  search?: string;
  status_filter?: string;
  page?: number;
  page_size?: number;
  sort_order?: "asc" | "desc";
}) => {
  const supabase = createSupabaseBrowserClient();

  const inputData = {
    search: filters?.search || "",
    status_filter: filters?.status_filter || "",
    page: filters?.page || 1,
    page_size: filters?.page_size || 10,
    sort_order: filters?.sort_order || "desc",
  };

  const { data, error } = await supabase.rpc("get_scan_requests", {
    input_data: inputData,
  });

  if (error) {
    console.error("Error fetching scan requests:", error);
    throw new Error(error.message);
  }

  return data as ScanRequestItem[];
};
