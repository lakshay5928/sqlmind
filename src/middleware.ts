import { NextRequest, NextResponse } from "next/server";
import { generateSessionId } from "@/lib/security/rateLimit";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Inject session cookie if not present — ensures per-user isolation
  const existing = req.cookies.get("sqlmind_session")?.value;
  if (!existing || !/^[a-f0-9]{64}$/.test(existing)) {
    const sessionId = generateSessionId();
    res.cookies.set("sqlmind_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  // Security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
