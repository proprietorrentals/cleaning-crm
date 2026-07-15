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

  if (pathname === "/super-admin") {
    response.headers.set("X-ServiceOS-Super-Admin-Build", "7814e7e");
  }

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/super-admin/login" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api");

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    console.info("middleware redirect", {
      currentPath: pathname,
      redirectDestination: "/login",
      reason: "unauthenticated-non-public-route",
    });
    if (pathname === "/super-admin") {
      redirectResponse.headers.set("X-ServiceOS-Super-Admin-Build", "7814e7e");
    }
    return redirectResponse;
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = request.nextUrl.searchParams.get("redirectTo") ?? "/";
    redirectUrl.searchParams.delete("redirectTo");
    console.info("middleware redirect", {
      currentPath: pathname,
      redirectDestination: redirectUrl.pathname,
      reason: "authenticated-user-at-generic-login",
    });
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
