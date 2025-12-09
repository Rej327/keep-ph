import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserAuthData = {
  is_admin: boolean;
  is_subscribed: boolean;
  is_business: boolean;
  account_type: string;
  account_status: string;
};

const AUTH_CACHE_COOKIE = "user_auth_cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  // const {
  //   data: { user },
  // } = await supabase.auth.getUser();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const validUser = user;
  const pathname = request.nextUrl.pathname;

  // Auth routes that should redirect to dashboard if user is already logged in
  const publicAuthRoutes = ["/login", "/signup"];
  const isPublicAuthRoute = publicAuthRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Customer routes (authentication required)
  const customerRoutes = [
    "/customer/dashboard",
    "/customer/profile",
    "/customer/mailroom",
    "/customer/mailbox",
    "/customer/mails",
    "/customer/disposal",
    "/customer/subscription",
    "/customer/notifications",
    "/customer/referral",
  ];

  // Subscription required routes
  const subscriptionRequiredRoutes = ["/customer/referral"];
  const subsciptionBusinessRoutes = ["/customer/dashboard"];
  const subscriptionNotForFreeRoutes = ["/customer/mailroom"];

  // Admin routes (authentication + admin role required)
  const adminRoutes = ["/admin"];

  const isCustomerRoute = customerRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isOnboardingRoute = pathname.startsWith("/onboarding");

  const requiresSubscription = subscriptionRequiredRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const requireBusinessPlan = subsciptionBusinessRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const requireNotFreePlan = subscriptionNotForFreeRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Early return for unauthenticated users on protected routes
  if ((isCustomerRoute || isAdminRoute || isOnboardingRoute) && !validUser) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Early return for public auth routes without needing auth data
  if (isPublicAuthRoute && validUser) {
    if (request.method === "POST") {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/customer/mails";
    return NextResponse.redirect(url);
  }

  // Only fetch auth data if we need it for route protection
  let authData: UserAuthData = {
    is_admin: false,
    is_subscribed: false,
    is_business: false,
    account_type: "AT-FREE",
    account_status: "SST-NONSUB",
  };

  if (validUser && (isCustomerRoute || isAdminRoute || isOnboardingRoute)) {
    // Try to get cached auth data from cookie
    const cachedAuth = request.cookies.get(AUTH_CACHE_COOKIE);

    if (cachedAuth?.value) {
      try {
        const parsed = JSON.parse(cachedAuth.value);
        // Check if cache is still valid (within TTL)
        if (parsed.exp && parsed.exp > Date.now()) {
          authData = parsed.data;
        } else {
          // Cache expired, fetch fresh data
          authData = await fetchAuthData(supabase, validUser.sub);
          setCacheInResponse(supabaseResponse, authData);
        }
      } catch {
        // Invalid cache, fetch fresh data
        authData = await fetchAuthData(supabase, validUser.sub);
        setCacheInResponse(supabaseResponse, authData);
      }
    } else {
      // No cache, fetch fresh data
      authData = await fetchAuthData(supabase, validUser.sub);
      setCacheInResponse(supabaseResponse, authData);
    }
  }

  const {
    is_admin: isAdmin,
    is_subscribed: hasSubscription,
    is_business: hasBusinessPlan,
  } = authData;

  // Redirect logic
  if (isOnboardingRoute && validUser) {
    if (isAdmin || hasSubscription || hasBusinessPlan) {
      const url = request.nextUrl.clone();
      url.pathname = "/customer/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (isAdminRoute && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  if (isCustomerRoute && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  if (requiresSubscription && validUser && !hasSubscription && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/customer/mails";
    return NextResponse.redirect(url);
  }

  if (requireBusinessPlan && validUser && !hasBusinessPlan && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/customer/mails";
    return NextResponse.redirect(url);
  }

  if (requireNotFreePlan && validUser && !hasSubscription && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/customer/mails";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
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

function setCacheInResponse(response: NextResponse, authData: UserAuthData) {
  const cacheValue = JSON.stringify({
    data: authData,
    exp: Date.now() + CACHE_TTL_MS,
  });

  response.cookies.set(AUTH_CACHE_COOKIE, cacheValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });
}
