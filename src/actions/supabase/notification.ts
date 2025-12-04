"use server";

import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { revalidatePath } from "next/cache";

export type NotificationItemType = "NIT-MAIL" | "NIT-PACKAGE" | "NIT-BILLING";
export type NotificationScopeType = "ST-ALL" | "ST-SPECIFIC";

export type Notification = {
  notification_id: string;
  notification_source_type_id: string;
  notification_scope_type_id: NotificationScopeType;
  notification_status_type_id: string;
  notification_target_user_id: string | null;
  notification_item_type_id: NotificationItemType | null;
  notification_item_id: string | null;
  notification_title: string;
  notification_message: string;
  notification_additional_data: Record<string, unknown> | null;
  notification_is_read: boolean;
  notification_read_at: string | null;
  notification_is_archived: boolean;
  notification_toast_shown: boolean;
  notification_created_at: string;
};

export type NotificationResponse = {
  data: Notification[];
  total_count: number;
  unread_count: number;
};

// Fetch User Notifications
export const getUserNotifications = async (
  page = 1,
  pageSize = 20,
  filterType: "all" | "unread" | "archived" = "all"
) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], total_count: 0, unread_count: 0 };

  // Resolve Account ID
  const { data: accountData } = await supabase
    .schema("user_schema")
    .from("account_table")
    .select("account_id")
    .eq("account_user_id", user.id)
    .single();

  // If no account found, return empty (or handle accordingly)
  if (!accountData) return { data: [], total_count: 0, unread_count: 0 };

  const { data, error } = await supabase.rpc("get_user_notifications", {
    input_user_id: accountData.account_id, // Passing Account ID as the "user_id" param
    input_page: page,
    input_page_size: pageSize,
    input_filter_type: filterType,
  });

  if (error) {
    console.error("Error fetching notifications:", error);
    return { data: [], total_count: 0, unread_count: 0 };
  }

  return data as NotificationResponse;
};

// Create Notification
export const createNotification = async (params: {
  userId: string;
  title: string;
  message: string;
  itemType?: string;
  itemId?: string;
  additionalData?: Record<string, unknown>;
}) => {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("create_notification", {
    input_source_type_id: "SRC-SYSTEM",
    input_scope_type_id: "ST-SPECIFIC",
    input_target_user_id: params.userId,
    input_title: params.title,
    input_message: params.message,
    input_item_type_id: params.itemType || null,
    input_item_id: params.itemId || null,
    input_additional_data: params.additionalData || null,
  });

  if (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Mark as Read
export const markNotificationAsRead = async (notificationId: string) => {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("mark_notification_as_read", {
    input_notification_id: notificationId,
  });

  if (error) throw error;
  revalidatePath("/notifications");
};

// Mark All as Read
export const markAllNotificationsAsRead = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Resolve Account ID
  const { data: accountData } = await supabase
    .schema("user_schema")
    .from("account_table")
    .select("account_id")
    .eq("account_user_id", user.id)
    .single();

  if (!accountData) return;

  const { error } = await supabase.rpc("mark_all_notifications_as_read", {
    input_user_id: accountData.account_id,
  });

  if (error) throw error;
  revalidatePath("/notifications");
};

// Mark Toast as Shown
export const markToastAsShown = async (notificationId: string) => {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("mark_notification_toast_shown", {
    input_notification_id: notificationId,
  });

  if (error) throw error;
};

// Archive Notification
export const archiveNotification = async (notificationId: string) => {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("archive_notification", {
    input_notification_id: notificationId,
  });

  if (error) throw error;
  revalidatePath("/notifications");
};
