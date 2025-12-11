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
  referralCode?: string | null;
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
          referred_by: subscriptionData.referralCode || null,
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
  itemType: "mail" | "package";
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
          item_type: params.itemType,
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

export type AddUserAddressParams = {
  userId: string;
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
};

export const addUserPhysicalAddress = async (params: AddUserAddressParams) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc("add_user_physical_address", {
      input_data: {
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
    console.error("Error adding user physical address:", err);
    return { error: err as Error };
  }
};

export const logVisitor = async (
  visitorId: string,
  userAgent: string,
  source: string = "website",
  landingPage: string = "/"
) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("log_visitor", {
    p_visitor_id: visitorId,
    p_user_agent: userAgent,
    p_source: source,
    p_landing_page: landingPage,
  });

  if (error) throw error;

  return data;
};

export const logActivity = async (
  type: "user" | "scan" | "retrieval" | "disposal" | "mail_item",
  message: string,
  detail?: string,
  userId?: string
) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("log_activity", {
    p_type: type,
    p_message: message,
    p_detail: detail || null,
    p_user_id: userId || null,
  });

  if (error) {
    console.error("Error logging activity:", error);
  }

  return data;
};

export type SubmitUserVerificationParams = {
  userId: string;
  idType: string;
  idNumber?: string;
  frontPath: string;
  backPath?: string;
  selfiePath?: string;
  reason?: string;
};

export const submitUserVerification = async (
  params: SubmitUserVerificationParams
) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc(
      "submit_user_verification" as never,
      {
        input_data: {
          user_id: params.userId,
          id_type: params.idType,
          id_number: params.idNumber,
          front_path: params.frontPath,
          back_path: params.backPath,
          selfie_path: params.selfiePath,
          reason: params.reason,
        },
      }
    );

    if (error) throw error;
    return { data };
  } catch (err) {
    console.error("Error submitting user verification:", err);
    return { error: err as Error };
  }
};

export const checkAndProvisionSubscription = async (userId: string) => {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Get the latest pending/awaiting payment for this user
    const { data: paymentRecord, error: fetchError } = await supabase.rpc(
      "get_latest_pending_payment" as never,
      {
        input_user_id: userId,
      }
    );

    if (fetchError || !paymentRecord) {
      console.log("No pending payment found or error fetching", fetchError);
      return { message: "No pending payment found" };
    }

    // 2. Verify with PayMongo API
    const intentId = paymentRecord.customer_paymongo_payments_intent_id;
    if (!process.env.PAYMONGO_SECRET_KEY) {
      throw new Error("Missing PayMongo Secret Key");
    }

    const response = await fetch(
      `https://api.paymongo.com/v1/checkout_sessions/${intentId}`,
      {
        headers: {
          accept: "application/json",
          authorization: `Basic ${Buffer.from(
            process.env.PAYMONGO_SECRET_KEY
          ).toString("base64")}`,
        },
      }
    );

    const paymongoData = await response.json();
    const paymentStatus =
      paymongoData.data?.attributes?.payment_intent?.attributes?.status;
    const checkoutStatus = paymongoData.data?.attributes?.payment_status;

    // 3. If paid, trigger the webhook logic manually
    if (checkoutStatus === "paid" || paymentStatus === "succeeded") {
      const { data, error } = await supabase.rpc(
        "process_paymongo_webhook" as never,
        {
          input_data: {
            intent_id: intentId,
            payment_status: "succeeded",
            event_type: "manual_trigger",
          },
        }
      );

      if (error) throw error;
      return { success: true, data };
    }

    return { message: "Payment not yet succeeded" };
  } catch (err) {
    console.error("Error in checkAndProvisionSubscription:", err);
    return { error: err as Error };
  }
};
