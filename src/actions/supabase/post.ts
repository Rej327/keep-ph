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

export type CreateMailboxWithAccountUpdateParams = {
  accountId: string;
  account: {
    account_type: string;
    account_is_subscribed: boolean;
    account_subscription_ends_at: string | null;
    account_remaining_mailbox_access: number;
  };
  mailbox: Array<{
    mailbox_account_id: string;
    mailbox_status_id: string;
    mailbox_label: string;
    mailbox_space_remaining: number;
  }>;
};

export const createMailboxWithAccountUpdate = async (
  subscriptionData: CreateMailboxWithAccountUpdateParams
) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc(
      "create_mailbox_with_account_update" as never,
      {
        input_data: {
          account_id: subscriptionData.accountId,
          account_type: subscriptionData.account.account_type,
          account_is_subscribed: subscriptionData.account.account_is_subscribed,
          account_subscription_ends_at:
            subscriptionData.account.account_subscription_ends_at,
          account_remaining_mailbox_access:
            subscriptionData.account.account_remaining_mailbox_access,
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
