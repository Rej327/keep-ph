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
