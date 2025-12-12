import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getCachedUserAuthData } from "@/dal/userAuth";

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

  if (validUser && isPublicAuthRoute) {
    return NextResponse.redirect(new URL("/customer/mails", request.url));
  }

  if (!validUser && (isCustomerRoute || isAdminRoute || isOnboardingRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Only fetch auth data if we need it for route protection
  const authData =
    validUser && (isCustomerRoute || isAdminRoute || isOnboardingRoute)
      ? await getCachedUserAuthData({
          request,
          response: supabaseResponse,
          supabase,
          userId: validUser.sub,
        })
      : {
          is_admin: false,
          is_subscribed: false,
          is_business: false,
          account_type: "AT-FREE",
          account_status: "SST-NONSUB",
        };

  const {
    is_admin: isAdmin,
    is_subscribed: hasSubscription,
    is_business: hasBusinessPlan,
    account_type: accountType,
  } = authData;

  const isFreePlan = accountType === "AT-FREE";

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

  if (requireNotFreePlan && validUser && isFreePlan && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/customer/mails";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
