import { Database } from "@/utils/types/database";
import { SupabaseClient as SC } from "@supabase/supabase-js";

declare global {
  type SupabaseClient = SC<Database>;
}
