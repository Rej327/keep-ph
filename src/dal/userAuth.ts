import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export type UserAuthData = {
  is_admin: boolean;
  is_subscribed: boolean;
  is_business: boolean;
  account_type: string;
  account_status: string;
};

const AUTH_CACHE_COOKIE = "user_auth_cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

type CachedAuthPayload = {
  data: UserAuthData;
  exp: number;
  user_id?: string;
};

export async function getCachedUserAuthData(params: {
  request: NextRequest;
  response: NextResponse;
  supabase: ReturnType<typeof createServerClient>;
  userId: string;
}): Promise<UserAuthData> {
  const { request, response, supabase, userId } = params;

  const cachedAuth = request.cookies.get(AUTH_CACHE_COOKIE);

  if (cachedAuth?.value) {
    try {
      const parsed = JSON.parse(cachedAuth.value) as CachedAuthPayload;

      if (parsed.exp && parsed.exp > Date.now() && parsed.user_id === userId) {
        return parsed.data;
      }
    } catch {
      // ignore and fetch fresh
    }
  }

  const fresh = await fetchAuthData(supabase, userId);
  setCacheInResponse(response, fresh, userId);
  return fresh;
}

async function fetchAuthData(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<UserAuthData> {
  try {
    const { data, error } = await supabase.rpc("get_user_auth_data", {
      input_user_id: userId,
    } as never);

    if (error || !data) {
      return {
        is_admin: false,
        is_subscribed: false,
        is_business: false,
        account_type: "AT-FREE",
        account_status: "SST-NONSUB",
      };
    }

    return data as UserAuthData;
  } catch {
    return {
      is_admin: false,
      is_subscribed: false,
      is_business: false,
      account_type: "AT-FREE",
      account_status: "SST-NONSUB",
    };
  }
}

function setCacheInResponse(
  response: NextResponse,
  authData: UserAuthData,
  userId: string
) {
  const cacheValue = JSON.stringify({
    data: authData,
    exp: Date.now() + CACHE_TTL_MS,
    user_id: userId,
  });

  response.cookies.set(AUTH_CACHE_COOKIE, cacheValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });
}
