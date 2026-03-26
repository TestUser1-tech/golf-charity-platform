import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function isAdminLoginPath(pathname: string): boolean {
  return pathname === "/admin/login";
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminLoginPath(pathname)) {
    if (!user) {
      return response;
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!user) {
    return NextResponse.redirect(new URL(isAdminPath(pathname) ? "/admin/login" : "/login", request.url));
  }

  const { data: profile } = await supabase.from("profiles").select("role, subscription_status").eq("id", user.id).single();

  if (!profile) {
    return NextResponse.redirect(new URL(isAdminPath(pathname) ? "/admin/login" : "/login", request.url));
  }

  if (isAdminPath(pathname) && profile.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard") && profile.subscription_status !== "active") {
    return NextResponse.redirect(new URL("/subscribe?required=1", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
