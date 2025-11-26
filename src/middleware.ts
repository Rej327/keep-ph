import { updateSession } from "./utils/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",

    // Include specific routes that need protection
    "/dashboard/:path*",
    "/profile/:path*",
    "/mailbox/:path*",
    "/subscription/:path*",
    "/notifications/:path*",
    "/admin/:path*",

    // Include auth routes
    "/login",
    "/signup",
  ],
};
