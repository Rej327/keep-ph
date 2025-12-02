import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";

export const markMailItemAsUnread = async (mailItemId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("mark_mail_item_as_unread", {
    input_mail_item_id: mailItemId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as boolean;
};

export const setMailItemArchiveStatus = async (
  mailItemId: string,
  isArchived: boolean
) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("set_mail_item_archive_status", {
    input_mail_item_id: mailItemId,
    input_is_archived: isArchived,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as boolean;
};

export const requestMailItemDisposal = async (
  mailItemId: string,
  accountId: string,
  notes?: string
) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("request_mail_item_disposal", {
    input_mail_item_id: mailItemId,
    input_account_id: accountId,
    input_notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const requestMailItemRetrieval = async (
  mailItemId: string,
  accountId: string,
  address: string,
  notes?: string
) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("request_mail_item_retrieval", {
    input_mail_item_id: mailItemId,
    input_account_id: accountId,
    input_address: address,
    input_notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateMailboxStatus = async (
  mailboxId: string,
  statusId: string
) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("update_mailbox_status", {
    input_mailbox_id: mailboxId,
    input_status_id: statusId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as boolean;
};

export const updateDisposalRequestStatus = async (
  requestId: string,
  statusId: string
) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("update_disposal_request_status", {
    input_request_id: requestId,
    input_status_id: statusId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as boolean;
};

export type UpdateUserProfileParams = {
  user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_path?: string | null;
};

export const updateUserProfile = async (params: UpdateUserProfileParams) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("update_user_profile", {
    input_data: params,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export type UpdateUserAddressParams = {
  userAddressId: string;
  userId: string;
  label?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
};

export const updateUserPhysicalAddress = async (
  params: UpdateUserAddressParams
) => {
  try {
    const supabase = await createSupabaseBrowserClient();

    const { data, error } = await supabase.rpc("update_user_physical_address", {
      input_data: {
        user_address_id: params.userAddressId,
        user_id: params.userId,
        address_label: params.label,
        address_line1: params.addressLine1,
        address_line2: params.addressLine2,
        city: params.city,
        province: params.province,
        postal_code: params.postalCode,
        country: params.country,
        is_default: params.isDefault,
      },
    });

    if (error) throw error;
    return { data };
  } catch (err) {
    console.error("Error updating user physical address:", err);
    return { error: err as Error };
  }
};
