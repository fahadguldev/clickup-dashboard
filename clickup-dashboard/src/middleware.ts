import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Routes that do NOT require auth
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  // Allow unauthenticated ACCESS to the root page; the client decides what to render.
  // API routes are protected here.
  if (pathname.startsWith("/api/")) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const sb = url && anonKey ? createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const c of cookiesToSet) req.cookies.set(c.name, c.value);
        },
      },
    }) : null;

    if (!sb) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
    }

    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Non-API pages: if not logged in and visiting a protected page, redirect to login.
  if (!isPublic) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const sb = url && anonKey ? createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const c of cookiesToSet) req.cookies.set(c.name, c.value);
        },
      },
    }) : null;

    if (sb) {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        const redirect = req.nextUrl.clone();
        redirect.pathname = "/login";
        redirect.searchParams.set("next", pathname);
        return NextResponse.redirect(redirect);
      }
    }
  }

  // If logged in on /login, bounce back home
  if (pathname === "/login") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      const sb = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const c of cookiesToSet) req.cookies.set(c.name, c.value);
          },
        },
      });
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user) {
        const redirect = req.nextUrl.clone();
        redirect.pathname = "/";
        redirect.search = "";
        return NextResponse.redirect(redirect);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|js|css)).*)",
  ],
};