import { type NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth API and login page are always public
  if (pathname === '/admin/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(request as unknown as Request);
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const username = await verifySessionToken(token);
  if (!username) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Attach username to a header for downstream use
  const res = NextResponse.next();
  res.headers.set('x-admin-user', username);
  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
