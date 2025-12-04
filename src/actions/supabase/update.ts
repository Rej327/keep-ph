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

export const markMailItemAsRead = async (mailItemId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("mark_mail_item_as_read", {
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

export const cancelDisposalRequest = async (mailItemId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("cancel_disposal_request", {
    input_mail_item_id: mailItemId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as boolean;
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

export const requestMailItemScan = async (
  mailItemId: string,
  accountId: string,
  instructions?: string
) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("request_mail_item_scan", {
    input_mail_item_id: mailItemId,
    input_account_id: accountId,
    input_instructions: instructions || null,
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

export const processRetrievalRequest = async (
  requestId: string,
  courier?: string,
  trackingNumber?: string,
  labelUrl?: string,
  statusId?: string
) => {
  const supabase = createSupabaseBrowserClient();

  const inputData = {
    request_id: requestId,
    courier: courier || null,
    tracking_number: trackingNumber || null,
    label_url: labelUrl || null,
    status_id: statusId || null,
  };

  const { error } = await supabase.rpc("process_retrieval_request", {
    input_data: inputData,
  });

  if (error) {
    console.error("Error processing retrieval request:", error);
    throw new Error(error.message);
  }
};

export const updateRetrievalRequestStatus = async (
  requestId: string,
  statusId: string
) => {
  // Reuse the dynamic process RPC for status updates
  return processRetrievalRequest(
    requestId,
    undefined,
    undefined,
    undefined,
    statusId
  );
};

export const processScanRequest = async (
  requestId: string,
  url?: string,
  statusId?: string
) => {
  const supabase = createSupabaseBrowserClient();

  const inputData = {
    request_id: requestId,
    url: url || null,
    status_id: statusId || null,
  };

  const { error } = await supabase.rpc("process_scan_request", {
    input_data: inputData,
  });

  if (error) {
    console.error("Error processing scan request:", error);
    throw new Error(error.message);
  }
};

export const updateScanRequestStatus = async (
  requestId: string,
  statusId: string
) => {
  return processScanRequest(requestId, undefined, statusId);
};

export const markMailItemAsRetrieved = async (mailItemId: string) => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("mark_mail_item_as_retrieved", {
    input_mail_item_id: mailItemId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as boolean;
};
