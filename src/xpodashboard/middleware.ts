import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// IMPORTANT: Set JWT_SECRET in your environment to match your backend Jwt:Key
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'supersecretkey1234567890');

// List of routes that do not require authentication
const PUBLIC_FILE = /\.(.*)$/;
const AUTH_PATHS = ['/auth/sign-in', '/auth/forgot-password', '/favicon.ico'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public files and auth routes
  if (
    PUBLIC_FILE.test(pathname) ||
    AUTH_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check for JWT cookie
  const jwt = req.cookies.get('jwt')?.value;
  if (!jwt) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/sign-in';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate JWT
  try {
    await jwtVerify(jwt, JWT_SECRET);
    // If valid, allow access
    return NextResponse.next();
  } catch (e) {
    // If invalid, redirect to login
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/sign-in';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 