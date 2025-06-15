'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, LayoutDashboard, MessageSquare, LogOut } from 'lucide-react';
import AuthService from '@/lib/services/auth/authService';
import { useSiteFilter } from '@/context/SiteFilterContext';
import CustomDropdown from './CustomDropdown';

interface NavProps {
  children: React.ReactNode;
}

const Nav = ({ children }: NavProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; username: string } | null>(null);
  const { site, setSite } = useSiteFilter();

  useEffect(() => {
    setMounted(true);
    AuthService.getCurrentUser()
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const isActive = (path: string) => {
    if (!pathname) return false;
    return pathname.replace(/\/$/, '') === path.replace(/\/$/, '');
  };

  const renderNavLinks = () => {
    if (!mounted) return null;

    return (
      <nav className="space-y-2">
        <Link 
          href="/dashboard"
          className={`flex transition-all duration-300 items-center px-4 py-2 rounded-lg ${
            isActive('/dashboard') 
              ? 'bg-red-10 text-white' 
              : 'text-gray-700 hover:bg-red-10/10'
          }`}
        >
          <LayoutDashboard className="h-5 w-5 mr-3" />
          Dashboard
        </Link>
        <Link 
          href="/chatgeschiedenis"
          className={`flex transition-all duration-300 items-center px-4 py-2 rounded-lg ${
            isActive('/chatgeschiedenis')
              ? 'bg-red-10 text-white'
              : 'text-gray-700 hover:bg-red-10/10'
          }`}
        >
          <MessageSquare className="h-5 w-5 mr-3" />
          Chatgeschiedenis
        </Link>
      </nav>
    );
  };

  // Skeleton loader component
  const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );

  return (
    <div className="flex">
      {/* Sidebar Navigation */}
      <div className="fixed top-0 left-0 w-64 h-screen bg-white border-r">
        <div className="p-4">
          <Image
            src="/images/kortrijk-xpo-logo.svg"
            alt="Kortrijk Xpo"
            width={180}
            height={50}
            priority
            className="mb-8"
          />
          {renderNavLinks()}
        </div>
      </div>

      {/* Top Navigation and Main Content */}
      <div className="flex-1 ml-64">
        <div className="h-16 bg-white flex items-center justify-between px-6 border-b">
          <div className="flex items-center space-x-3 ml-auto">
            <CustomDropdown
              value={
                site === 'all' ? 'Alle sites' : site.charAt(0).toUpperCase() + site.slice(1)
              }
              options={['Alle sites', 'Ffd', 'Abiss', 'Artisan']}
              onChange={(_, index) => {
                const values = ['all', 'ffd', 'abiss', 'artisan'];
                setSite(values[index] as any);
              }}
            />
            <div className="text-sm text-right">
              {user === null && (
                <>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </>
              )}
              {user && (
                <>
                  <p className="font-medium text-gray-700">{user.name}</p>
                  <p className="text-gray-500">{user.role}</p>
                </>
              )}
            </div>
            <button
              onClick={() => AuthService.logout()}
              className="ml-4 p-2 rounded-lg hover:bg-red-10/10 text-gray-600 hover:text-red-10 transition-colors duration-300 cursor-pointer"
              title="Uitloggen"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Nav; 