import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { canOpenPath, staffHomeWithCode } from "@/lib/roles";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const login = new URL("/staff", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  // Redireccion rapida segun el rol del token. La revision que cuenta esta en
  // las paginas y acciones (getSession contra la base).
  if (!canOpenPath(session.role, pathname)) {
    const home = staffHomeWithCode(session.role, request.nextUrl.searchParams.get("code"));
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/escanear/:path*",
    "/staff/premios/:path*",
  ],
};
