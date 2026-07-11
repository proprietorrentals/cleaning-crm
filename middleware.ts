import "@/lib/globals-polyfill";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // All public entry-points — no auth required.
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/explore" ||
    pathname === "/admin-login" ||
    pathname === "/employee-login" ||
    pathname === "/customer-auth" ||
    pathname === "/super-admin/login" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api");

  if (!user && !isPublicRoute) {
    // Choose the right login page based on the path being accessed.
    let loginPath = "/admin-login";
    if (pathname.startsWith("/employee-portal")) loginPath = "/employee-login";
    if (pathname.startsWith("/customer-portal")) loginPath = "/customer-auth";
    if (pathname.startsWith("/super-admin"))     loginPath = "/super-admin/login";

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = loginPath;
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
