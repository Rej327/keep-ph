import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  isAccountBusiness,
  isAccountSubscribed,
  isUserAdmin,
} from "@/actions/supabase/get";

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
  ) as unknown as SupabaseClient;

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getClaims()
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
    "/dashboard",
    "/profile",
    "/mailroom",
    "/mailbox",
    "/mails",
    "/disposal",
    "/subscription",
    "/notifications",
    "/referral",
  ];

  // Subscription required routes
  const subscriptionRequiredRoutes = ["/referral"];
  const subsciptionBusinessRoutes = ["/dashboard"];
  const subscriptionNotForFreeRoutes = ["/mailroom"];

  // Admin routes (authentication + admin role required)
  const adminRoutes = ["/admin"];

  const isCustomerRoute = customerRoutes.some((route) =>
    pathname.startsWith(route)
  );

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
  const isAdmin = validUser ? await isUserAdmin(validUser.sub) : false;

  // Check if user has an active subscription
  const hasSubscription = validUser
    ? await isAccountSubscribed(validUser.sub)
    : false;

  // Check if user has business subscription
  const hasBusinessPlan = validUser
    ? await isAccountBusiness(validUser.sub)
    : false;

  // Redirect logic
  if ((isCustomerRoute || isAdminRoute) && !validUser) {
    // Redirect to unauthorized if trying to access protected routes without authentication
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && !isAdmin) {
    // Redirect non-admin users trying to access admin routes
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  if (isCustomerRoute && isAdmin) {
    // Redirect admins trying to access customer routes to admin dashboard
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  if (requiresSubscription && validUser && !hasSubscription && !isAdmin) {
    // Redirect users without subscription to mailroom page
    const url = request.nextUrl.clone();
    url.pathname = "/mails";
    return NextResponse.redirect(url);
  }

  if (requireBusinessPlan && validUser && !hasBusinessPlan && !isAdmin) {
    // Redirect users in mailroom if not business plan
    const url = request.nextUrl.clone();
    url.pathname = "/mails";
    return NextResponse.redirect(url);
  }

  if (requireNotFreePlan && validUser && !hasSubscription && !isAdmin) {
    // Redirect users without subscription to mailroom page
    const url = request.nextUrl.clone();
    url.pathname = "/mails";
    return NextResponse.redirect(url);
  }

  if (isPublicAuthRoute && validUser) {
    // Do not redirect Server Actions or POST requests
    if (request.method === "POST") {
      return supabaseResponse;
    }
    // Redirect logged-in users away from auth pages
    const url = request.nextUrl.clone();
    url.pathname = "/mails";
    return NextResponse.redirect(url);
  }
  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
