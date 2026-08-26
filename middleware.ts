import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login');
  const isApiAuth = pathname.startsWith('/api/auth');

  if (isApiAuth) {
    return NextResponse.next();
  }

  // Redirect to dashboard if logged in and trying to access /login
  if (isAuthPage) {
    if (session?.user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!session?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = session.user as any;

  // Admin-only route protection
  const adminOnlyPaths = [
    '/users',
    '/audit-log',
    '/settings',
    '/categories',
    '/locations',
  ];

  const isAdminRoute = adminOnlyPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isAdminRoute && user.baseRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard?error=Unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
