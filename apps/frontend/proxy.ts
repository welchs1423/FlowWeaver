import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/canvas', '/dashboard'];
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = request.cookies.get('fw_authed')?.value === '1';

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  if (isProtected && !authed) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && authed) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/canvas/:path*', '/dashboard/:path*', '/auth/:path*'],
};
