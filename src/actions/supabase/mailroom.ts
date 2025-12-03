import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import { MailroomData } from "@/components/page/MailroomPage/types";

export const getMailroomData = async (
  accountId: string
): Promise<MailroomData> => {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_mailroom_data", {
    input_account_id: accountId,
  });

  if (error) {
    console.error("Error fetching mailroom data:", error);
    throw new Error(error.message);
  }

  // Process the data to ensure it has the correct structure
  const mailroomData: MailroomData = data;

  // Add mail_remaining and package_remaining if they don't exist
  Object.keys(mailroomData.columns).forEach((columnId) => {
    const column = mailroomData.columns[columnId];
    if (column.mail_remaining === undefined) {
      column.mail_remaining = 0;
    }
    if (column.package_remaining === undefined) {
      column.package_remaining = 0;
    }
  });

  return mailroomData;
};

export type MailItemMove = {
  mail_item_id: string;
  mailbox_id: string;
};

export const updateMailItemLocations = async (moves: MailItemMove[]) => {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.rpc("update_mail_item_locations", {
    moves: moves,
  });

  if (error) {
    console.error("Error updating mail item locations:", error);
    throw new Error(error.message);
  }
};
