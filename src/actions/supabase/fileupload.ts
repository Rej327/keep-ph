import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";

export const uploadAttachmentfile = async (
  file: File,
  selectedMailbox: string
) => {
  const supabase = createSupabaseBrowserClient();

  // 1. Upload file to storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${selectedMailbox}/${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("KEEP-PH-ATTACHMENTS") // Using the bucket from schema
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  return { data: uploadData, error: uploadError };
};

export const uploadDocumentfile = async (
  file: File,
  selectedMailbox: string
) => {
  const supabase = createSupabaseBrowserClient();

  // 1. Upload file to storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${selectedMailbox}/${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("KEEP-PH-DOCUMENTS") // Using the bucket from schema
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  return { data: uploadData, error: uploadError };
};
