import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/audit",
  "/pricing",
  "/for-experts",
  "/for-business",
  "/for-agencies",
  "/how-it-works",
  "/find-expert",
  "/login",
  "/register",
  "/terms",
  "/privacy",
];

const PUBLIC_PREFIXES = [
  "/experts",
  "/questions",
  "/niches",
  "/scan",
  "/track",
  "/compare",
  "/api",
  "/auth",
  "/_next",
  "/favicon.ico",
  "/opengraph-image",
  "/twitter-image",
  "/apple-icon",
  "/icon",
  "/manifest",
  "/robots.txt",
  "/sitemap.xml",
  "/email-templates",
];

function isPublic(pathname: string) {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Handle referral parameter — save to cookie
  const ref = searchParams.get("ref");
  if (ref) {
    const response = isPublic(pathname)
      ? NextResponse.next()
      : NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set("ref", ref, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    if (isPublic(pathname)) return response;
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
