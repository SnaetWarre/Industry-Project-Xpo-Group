'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ApiService from '@/services/api';

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await ApiService.getToken(username, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid username or password');
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-center items-center p-6 relative">
      <Link 
        href="/dashboard" 
        className="flex items-center gap-2 text-neutral-500 absolute top-8 left-8"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Terug naar dashboard
      </Link>

      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#1D2939] mb-2">Inloggen</h1>
        <p className="text-neutral-500 mb-8">Voer je e-mailadres en wachtwoord in om in te loggen!</p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {error && (
              <div className="text-red-600 text-sm mb-2">{error}</div>
            )}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#344054] mb-1.5">
                Gebruikersnaam*
              </label>
              <input
                type="text"
                id="username"
                placeholder="Gebruikersnaam"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-black placeholder-neutral-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#344054] mb-1.5">
                Wachtwoord*
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Wachtwoord"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-black placeholder-neutral-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-red-500 focus:ring-red-500/20"
                />
                <span className="text-sm text-neutral-700">Ingelogd blijven</span>
              </label>

              <Link href="/forgot-password" className="text-sm text-red-10 hover:text-red-600">
                Wachtwoord vergeten?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-red-10 text-white py-2.5 rounded-lg hover:bg-red-600 transition-colors"
              disabled={loading}
            >
              {loading ? 'Bezig met inloggen...' : 'Inloggen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 