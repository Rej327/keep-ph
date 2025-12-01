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

type CreateUserProfileParams = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
};

export const createUserProfile = async (userData: CreateUserProfileParams) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc("create_user_profile" as never, {
      input_data: {
        user_id: userData.userId,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        avatar_bucket_path: userData.avatar,
      },
    });

    if (error) throw error;
    return { data };
  } catch (err) {
    console.error("Error creating user profile:", err);
    return { error: err as Error };
  }
};

export type CreateUserSubscriptionAccount = {
  userId: string;
  account: {
    account_type: string;
    account_is_subscribed: boolean;
    account_subscription_ends_at: string | null;
    account_remaining_mailbox_access: number;
    account_subscription_status_id: string;
    account_address_key: string;
  };
  mailbox: Array<{
    mailbox_status_id: string;
    mailbox_label: string;
    mailbox_mail_remaining_space: number;
    mailbox_package_remaining_space: number;
  }>;
};

export const createUserSubscriptionAccount = async (
  subscriptionData: CreateUserSubscriptionAccount
) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc(
      "create_user_subscription_account" as never,
      {
        input_data: {
          user_id: subscriptionData.userId,
          account_type: subscriptionData.account.account_type,
          account_is_subscribed: subscriptionData.account.account_is_subscribed,
          account_subscription_ends_at:
            subscriptionData.account.account_subscription_ends_at,
          account_remaining_mailbox_access:
            subscriptionData.account.account_remaining_mailbox_access,
          account_subscription_status_id:
            subscriptionData.account.account_subscription_status_id,
          account_address_key: subscriptionData.account.account_address_key,
          mailbox: subscriptionData.mailbox,
        },
      }
    );

    if (error) throw error;
    return { data };
  } catch (err) {
    console.error("Error creating mailbox with account update:", err);
    return { error: err as Error };
  }
};

export type CreateMailItemParams = {
  mailboxId: string;
  sender: string;
  description: string;
  itemName: string;
  imagePath: string;
  receivedAt: Date;
  statusId?: string;
};

export const createMailItem = async (params: CreateMailItemParams) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc(
      "create_mail_item_with_space_decrement" as never,
      {
        input_data: {
          mailbox_id: params.mailboxId,
          sender: params.sender,
          image_path: params.imagePath,
          received_at: new Date(params.receivedAt).toISOString(),
          status_id: "MIS-RECEIVED",
          name: params.itemName,
          description: params.description,
        },
      }
    );

    if (error) throw error;
    return { data };
  } catch (err) {
    console.error("Error creating mail item:", err);
    return { error: err as Error };
  }
};

export type AddMailboxesParams = {
  accountId: string;
  mailboxes: Array<{
    mailbox_status_id: string;
    mailbox_label: string;
    mailbox_mail_remaining_space: number;
    mailbox_package_remaining_space: number;
  }>;
};

export const addMailboxesToAccount = async (params: AddMailboxesParams) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc(
      "add_mailboxes_to_account" as never,
      {
        input_data: {
          account_id: params.accountId,
          mailbox: params.mailboxes,
        },
      }
    );

    if (error) throw error;
    return { data };
  } catch (err) {
    console.error("Error adding mailboxes to account:", err);
    return { error: err as Error };
  }
};
