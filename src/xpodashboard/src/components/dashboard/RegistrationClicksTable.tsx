'use client';

import { useState, useEffect } from 'react';
import { Download, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import RegistrationClicksService from '@/lib/services/dashboard/registrationClicksService';
import ChatDetail from '@/components/chatgeschiedenis/ChatDetail';

interface TableRow {
  id: string;
  profielInfo: string;
  date: string;
  gespreksDuur: string;
}

interface RegistrationClicksTableProps {
  onSelectSessionId: (sessionId: string) => void;
}

const RegistrationClicksTable = ({ onSelectSessionId }: RegistrationClicksTableProps) => {
  const [registrationClicks, setRegistrationClicks] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await RegistrationClicksService.getAllRegistrationClicks();
        data.sort((a, b) => Number(a.id) - Number(b.id));
        setRegistrationClicks(data);
      } catch (err) {
        setError('Er is een fout opgetreden bij het ophalen van de data.');
        console.error('Error fetching registration clicks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownloadCSV = async () => {
    try {
      setIsDownloading(true);
      await RegistrationClicksService.downloadCSV();
    } catch (err) {
      console.error('Error downloading CSV:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Skeleton loader component
  const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl text-black">Registratie kliks</h2>
            <Skeleton className="h-6 w-6" />
          </div>
          <button 
            disabled
            className="inline-flex items-center gap-2 text-black border border-black px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
          >
            <Download className="h-5 w-5" />
            Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl">
            <thead>
              <tr>
                <th className="py-4 px-6 text-left text-xs font-bold text-black uppercase"><Skeleton className="h-4 w-24" /></th>
                <th className="py-4 px-6 text-left text-xs font-bold text-black uppercase"><Skeleton className="h-4 w-32" /></th>
                <th className="py-4 px-6 text-left text-xs font-bold text-black uppercase"><Skeleton className="h-4 w-24" /></th>
                <th className="py-4 px-6 text-left text-xs font-bold text-black uppercase"><Skeleton className="h-4 w-24" /></th>
                <th className="py-4 px-6 w-10"><Skeleton className="h-4 w-10" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-150">
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-neutral-150 hover:bg-gray-50 cursor-pointer duration-200 transition-all">
                  <td className="py-6 px-6 text-sm text-black"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-6 px-6 text-sm text-black"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-6 px-6 text-sm text-black"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-6 px-6 text-sm text-black"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-6 px-6 text-sm text-black"><Skeleton className="h-4 w-10" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl text-black">Registratie kliks</h2>
          <span className="text-black">{registrationClicks.length}</span>
        </div>
        <button 
          onClick={handleDownloadCSV}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 text-black border border-black px-4 py-2 hover:border-red-10 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
        >
          <Download className="h-5 w-5" />
          {isDownloading ? 'Downloading...' : 'Download CSV'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl">
          <thead>
            <tr>
              <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">ID</th>
              <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">ProfielInfo</th>
              <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Klikdatum</th>
              <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Gespreksduur</th>
              <th scope="col" className="py-4 px-6 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150">
            {registrationClicks.map((click) => (
              <tr 
                key={click.id} 
                className="border-b border-neutral-150 hover:bg-gray-50 cursor-pointer duration-200 transition-all"
                onClick={() => onSelectSessionId(click.id.trim())}
              >
                <td className="py-6 px-6 text-sm text-black">{click.id.trim()}</td>
                <td className="py-6 px-6 text-sm text-black">{click.profielInfo}</td>
                <td className="py-6 px-6 text-sm text-black">
                  {new Date(click.date).toLocaleDateString('nl-BE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </td>
                <td className="py-6 px-6 text-sm text-black">{click.gespreksDuur}</td>
                <td className="py-6 px-6">
                  <button
                    onClick={e => { e.stopPropagation(); onSelectSessionId(click.id.trim()); }}
                    className="hover:bg-red-10/10 p-2 rounded-full transition-all duration-300 cursor-pointer inline-flex"
                    title="Bekijk chatgeschiedenis"
                  >
                    <ArrowUpRight className="h-4 w-4 text-black" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegistrationClicksTable; 