'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  getToken: () => string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token && pathname !== '/auth/sign-in') {
      router.push('/auth/sign-in');
    }
  }, [pathname, router]);

  const setToken = (token: string) => {
    localStorage.setItem('jwt', token);
  };

  const getToken = () => {
    return localStorage.getItem('jwt');
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    router.push('/auth/sign-in');
  };

  const value = {
    isAuthenticated: !!getToken(),
    setToken,
    getToken,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 