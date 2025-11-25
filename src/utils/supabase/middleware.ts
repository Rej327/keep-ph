import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const validUser = data?.claims;
  const pathname = request.nextUrl.pathname;

  // Public routes (no authentication required)
  const publicRoutes = ["/", "/login", "/signup"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/#")
  );

  // Auth routes that should redirect to dashboard if user is already logged in
  const publicAuthRoutes = ["/login", "/signup"];
  const isPublicAuthRoute = publicAuthRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Customer routes (authentication required)
  const customerRoutes = [
    "/dashboard",
    "/profile",
    "/mailbox",
    "/subscription",
    "/notifications",
  ];
  const isCustomerRoute = customerRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Admin routes (authentication + admin role required)
  const adminRoutes = ["/admin"];
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Subscription required routes
  const subscriptionRequiredRoutes = [
    "/dashboard",
    "/mailbox",
    "/notifications",
  ];
  const requiresSubscription = subscriptionRequiredRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if user is admin
  const userRole = data?.claims?.role || "";
  const isAdmin = userRole === "admin";

  // Check if user has an active subscription
  // This would need to be implemented based on your subscription model
  // For now, we'll just check if the user has a subscription claim
  const hasSubscription = data?.claims?.has_subscription === true;

  // Redirect logic
  if ((isCustomerRoute || isAdminRoute) && !validUser) {
    // Redirect to login if trying to access protected routes without authentication
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && !isAdmin) {
    // Redirect non-admin users trying to access admin routes
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (requiresSubscription && validUser && !hasSubscription && !isAdmin) {
    // Redirect users without subscription to subscription page
    const url = request.nextUrl.clone();
    url.pathname = "/subscription";
    return NextResponse.redirect(url);
  }

  if (isPublicAuthRoute && validUser) {
    // Redirect logged-in users away from auth pages
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
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
