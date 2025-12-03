export type MailItemType = "MAIL" | "PACKAGE";

export type MailItem = {
  mail_item_id: string;
  mail_item_sender: string;
  mail_item_received_at: string;
  mail_item_type: MailItemType;
  mail_item_status_value: string;
  mailbox_label: string;
  mail_item_mailbox_id: string;
  mailbox_account_id: string;
  mailbox_mail_remaining_space: number;
  mailbox_package_remaining_space: number;
  account_remaining_mailbox_access: number;
  account_max_mailbox_access: number;
  account_max_quantity_storage: number;
  account_max_parcel_handling: number;
};

export type MailroomColumn = {
  id: string;
  title: string;
  itemIds: string[];
  account_max_mailbox_access: number;
  account_max_quantity_storage: number;
  account_max_parcel_handling: number;
  mail_remaining?: number;
  package_remaining?: number;
};

export type MailroomData = {
  items: Record<string, MailItem>;
  columns: Record<string, MailroomColumn>;
  columnOrder: string[];
};
