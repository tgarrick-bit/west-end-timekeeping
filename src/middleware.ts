// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  // Allow test page
  if (req.nextUrl.pathname === '/test') {
    return res;
  }

  // Public routes
  const publicPaths = ['/auth/login', '/auth/signup'];
  const isPublicPath = publicPaths.some(path => 
    req.nextUrl.pathname === path
  );

  // Protected routes
  const protectedPaths = ['/dashboard', '/employee', '/manager', '/timesheet', '/timesheets'];
  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  );

  // Redirect logged-in users away from login page
  if (session && req.nextUrl.pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Redirect to login if accessing protected route without session
  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};