'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// List of routes that do not require authentication
const AUTH_PATHS = ['/auth/sign-in', '/auth/forgot-password', '/favicon.ico'];

export function AuthCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Skip check for auth paths
    if (AUTH_PATHS.some((path) => pathname?.startsWith(path)) || pathname === '/') {
      return;
    }

    // Check for JWT in localStorage
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      router.push(`/auth/sign-in?from=${pathname}`);
    }
  }, [pathname, router, mounted]);

  return null;
} 