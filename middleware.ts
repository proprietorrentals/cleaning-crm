import "@/lib/globals-polyfill";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
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
  const publicLandingPaths = new Set([
    "/cleaning-crm",
    "/commercial-cleaning-software",
    "/janitorial-crm",
    "/cleaning-business-management-software",
    "/ai-cleaning-business-software",
    "/commercial-cleaning-leads",
    "/office-cleaning-leads",
    "/medical-office-cleaning-leads",
    "/warehouse-cleaning-leads",
    "/school-cleaning-leads",
  ]);
  const isBlogRoute = pathname === "/blog" || pathname.startsWith("/blog/");
  const isDemoRoute = pathname === "/demo" || pathname.startsWith("/demo/");
  const isCityMarketplaceRoute = pathname.startsWith(
    "/commercial-cleaning-leads/",
  );
  const isMarketingRoute =
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/contact" ||
    pathname === "/explore" ||
    pathname === "/website-builder" ||
    publicLandingPaths.has(pathname) ||
    isCityMarketplaceRoute ||
    isBlogRoute ||
    isDemoRoute;

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/super-admin/login" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    isMarketingRoute ||
    pathname === "/request-quote" ||
    pathname.startsWith("/request-quote/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api");

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      request.nextUrl.searchParams.get("redirectTo") ?? "/";
    redirectUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
