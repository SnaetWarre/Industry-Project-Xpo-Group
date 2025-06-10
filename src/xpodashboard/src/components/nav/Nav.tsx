import Link from 'next/link';
import { MessageSquare, LayoutDashboard } from 'lucide-react';

export default function Nav() {
  return (
    <nav className="w-64 min-h-screen bg-white border-r border-neutral-150 p-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-black">XPO Dashboard</h1>
      </div>
      
      <div className="space-y-2">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-3 px-4 py-2 text-neutral-500 hover:text-black rounded-lg hover:bg-gray-50"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>
        
        <Link 
          href="/chatgeschiedenis" 
          className="flex items-center gap-3 px-4 py-2 text-neutral-500 hover:text-black rounded-lg hover:bg-gray-50"
        >
          <MessageSquare className="h-5 w-5" />
          <span>Chatgeschiedenis</span>
        </Link>
      </div>
    </nav>
  );
} 