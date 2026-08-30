import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login');
  const isApiAuth = pathname.startsWith('/api/auth');

  // Rate Limiting
  // Note: Prioritize Cloudflare Tunnel header (cf-connecting-ip), fallback to x-forwarded-for or x-real-ip
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  
  if (pathname.startsWith('/api/auth/signin') || pathname.startsWith('/api/auth/callback/credentials')) {
    const { success } = checkRateLimit(ip, 'AUTH', 5); // 5 attempts per 15 min
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '900' } });
    }
  } else if (pathname.startsWith('/api/')) {
    const { success } = checkRateLimit(ip, 'API', 60); // 60 requests per 1 min
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }
  }

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
