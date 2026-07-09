/**
 * 中间件 · 保护需要登录的路由
 * 未登录访问 /admin/* 会被跳转到 /sign-in
 */
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('__Secure-better-auth.session_token');

  // 保护 /admin 路径
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
