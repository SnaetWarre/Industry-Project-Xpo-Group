'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, LayoutDashboard, MessageSquare } from 'lucide-react';

interface NavProps {
  children: React.ReactNode;
}

const Nav = ({ children }: NavProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-10 text-black"
              />
            </div>
          </div>

          {/* Right Side Items */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-full">
              <Bell className="h-6 w-6 text-gray-600" />
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-10 rounded-full text-xs text-white flex items-center justify-center">
                2
              </span>
            </button>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full overflow-hidden">
                <Image
                  src="/images/nav/pfp.webp"
                  alt="User Avatar"
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-700">Jonas Naessens</p>
                <p className="text-gray-500">Admin</p>
              </div>
            </div>
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