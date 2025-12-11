import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ status: "none" });
  }

  const { data, error } = await supabase.rpc("get_user_subscription_status", {
    input_data: { user_id: user.id },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
