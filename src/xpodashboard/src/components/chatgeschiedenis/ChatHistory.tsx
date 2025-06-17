'use client';

import { MessageSquare, Filter, ChevronDown, RotateCcw, ChevronUp } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useState, useEffect } from 'react';
import CustomDropdown from '@/components/core/CustomDropdown';
import { getTotalMessages } from '@/lib/services/chatgeschiedenis/totalMessagesService';
import { getAverageChatDuration } from '@/lib/services/chatgeschiedenis/averageChatDurationService';
import { getTotalChats } from '@/lib/services/chatgeschiedenis/totalChatsService';
import { getUserProfiles, UserProfile } from '@/lib/services/chatgeschiedenis/userProfilesService';
import ChatDetail from './ChatDetail';
import { useSiteFilter } from '@/context/SiteFilterContext';

const WEBSITE = 'ffd'; // Of maak dit dynamisch/selecteerbaar

const columnHelper = createColumnHelper<UserProfile & { id: string; beurs: string }>();

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: (info) => info.getValue(),
    enableColumnFilter: false,
  }),
  columnHelper.accessor('profileInfo', {
    header: 'PROFIELINFO',
    cell: (info) => info.getValue(),
    enableColumnFilter: false,
  }),
  columnHelper.accessor('createdAt', {
    header: 'DATE',
    cell: (info) => {
      const date = new Date(info.getValue());
      return `${date.toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    },
    filterFn: (row, columnId, filterValue) => {
      const date = new Date(row.getValue(columnId)).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' });
      return !filterValue || date === filterValue;
    },
  }),
  columnHelper.accessor('beurs', {
    header: 'BEURS',
    cell: (info) => info.getValue(),
    filterFn: (row, columnId, filterValue) => {
      return !filterValue || row.getValue(columnId) === filterValue;
    },
  }),
  columnHelper.accessor('geklikt', {
    header: 'GEKLIKT',
    cell: (info) => (
      <span
        className={`px-3 py-1 rounded-md text-xs inline-block text-center w-24 ${
          info.getValue() ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}
      >
        {info.getValue() ? 'Voltooid' : 'Niet geklikt'}
      </span>
    ),
    filterFn: (row, columnId, filterValue) => {
      const label = row.getValue(columnId) ? 'Voltooid' : 'Niet geklikt';
      return !filterValue || label === filterValue;
    },
  }),
] as ColumnDef<UserProfile & { id: string; beurs: string }>[];

// Skeleton loader component
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const ChatHistory = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [profiles, setProfiles] = useState<(UserProfile & { id: string; beurs: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalMessages, setTotalMessages] = useState<number>(0);
  const [averageDuration, setAverageDuration] = useState<string>('...');
  const [totalChats, setTotalChats] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [beursFilter, setBeursFilter] = useState<string>('');
  const [gekliktFilter, setGekliktFilter] = useState<string>('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { site } = useSiteFilter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let websites: string[];
        if (site === 'all') {
          websites = ['ffd', 'abiss', 'artisan'];
        } else {
          websites = [site];
        }
        // Profielen van de geselecteerde websites ophalen en samenvoegen
        const allProfiles = (
          await Promise.all(
            websites.map(async (website) => {
              const profilesData = await getUserProfiles(website);
              return profilesData.map((p) => ({
                ...p,
                id: p.id,
                beurs: website,
              }));
            })
          )
        ).flat();

        // Statistieken ophalen per site en aggregeren
        const [totalMessagesArr, avgDurationArr, totalChatsArr] = await Promise.all([
          Promise.all(websites.map(w => getTotalMessages(w))),
          Promise.all(websites.map(w => getAverageChatDuration(w))),
          Promise.all(websites.map(w => getTotalChats(w))),
        ]);

        const totalMessages = totalMessagesArr.reduce((sum, val) => sum + (val?.totalMessages || 0), 0);
        const avgSecondsArr = avgDurationArr.map(d => d.averageDurationSeconds || 0);
        const avgDuration = avgSecondsArr.length > 0
          ? Math.round(avgSecondsArr.reduce((a, b) => a + b, 0) / avgSecondsArr.length)
          : 0;
        const avgDurationFormatted = avgDuration > 60
          ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`
          : `${avgDuration}s`;
        const totalChats = totalChatsArr.reduce((sum, val) => sum + (val || 0), 0);

        setProfiles(allProfiles);
        setTotalMessages(totalMessages);
        setAverageDuration(avgDurationFormatted);
        setTotalChats(totalChats);
      } catch (err) {
        setError('Er is een fout opgetreden bij het ophalen van de data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [site]);

  const table = useReactTable({
    data: profiles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    sortDescFirst: true,
  });

  const uniqueDates = Array.from(new Set(profiles.map(item => new Date(item.createdAt).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' }))));
  const uniqueBeurs = Array.from(new Set(profiles.map(item => item.beurs)));
  const gekliktOptions = ['Voltooid', 'Niet geklikt'];

  const resetFilters = () => {
    table.getColumn('createdAt')?.setFilterValue(undefined);
    table.getColumn('beurs')?.setFilterValue(undefined);
    table.getColumn('geklikt')?.setFilterValue(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <h1 className="text-3xl font-bold text-black mb-6">Chatgeschiedenis</h1>
        {/* Skeletons voor de statistieken */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <div className="flex items-center justify-between mt-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton voor de tabel */}
        <div className="bg-white rounded-xl p-6">
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-none">
              <thead>
                <tr className="border-b border-neutral-150">
                  <th className="py-4 px-6 text-xs font-bold text-black"><Skeleton className="h-4 w-24" /></th>
                  <th className="py-4 px-6 text-xs font-bold text-black"><Skeleton className="h-4 w-32" /></th>
                  <th className="py-4 px-6 text-xs font-bold text-black"><Skeleton className="h-4 w-24" /></th>
                  <th className="py-4 px-6 text-xs font-bold text-black"><Skeleton className="h-4 w-24" /></th>
                  <th className="py-4 px-6 text-xs font-bold text-black"><Skeleton className="h-4 w-10" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-black">
                {[...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-neutral-150 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
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
      </div>
    );
  }

  if (error) return <div className="text-red-500">{error}</div>;

  if (selectedChatId) {
    return <ChatDetail sessionId={selectedChatId} onBack={() => setSelectedChatId(null)} />;
  }

  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold text-black mb-6">Chatgeschiedenis</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl p-6">
          <p className="text-sm text-black">Totale Chats</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-bold text-black">{totalChats === null ? '...' : totalChats}</p>
            <div className="bg-blue-50 p-3 rounded-full">
              <MessageSquare className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6">
          <p className="text-sm text-black">Gemiddelde Duur</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-bold text-black">{averageDuration}</p>
            <div className="bg-green-50 p-3 rounded-full">
              <MessageSquare className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6">
          <p className="text-sm text-black">Berichten</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-bold text-black">{totalMessages}</p>
            <div className="bg-purple-50 p-3 rounded-full">
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Chat History Table */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-xl font-semibold text-black mb-4">Recente Gesprekken</h2>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-neutral-150 pr-4">
            <Filter className="h-5 w-5 text-neutral-500" />
            <span className="font-medium text-black">Filteren op</span>
          </div>
          {/* Date Filter */}
          <CustomDropdown
            value={String(table.getColumn('createdAt')?.getFilterValue() ?? '')}
            options={uniqueDates}
            placeholder="Datum"
            onChange={value => table.getColumn('createdAt')?.setFilterValue(value)}
          />
          {/* Beurs Filter */}
          <CustomDropdown
            value={String(table.getColumn('beurs')?.getFilterValue() ?? '')}
            options={uniqueBeurs}
            placeholder="Beurs"
            onChange={value => table.getColumn('beurs')?.setFilterValue(value)}
          />
          {/* Geklikt Filter */}
          <CustomDropdown
            value={String(table.getColumn('geklikt')?.getFilterValue() ?? '')}
            options={gekliktOptions}
            placeholder="Geklikt"
            onChange={value => table.getColumn('geklikt')?.setFilterValue(value)}
          />
          <button 
            className="flex items-center gap-2 text-red-10 ml-auto cursor-pointer"
            onClick={resetFilters}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Filter resetten</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-none">
            <thead>
              <tr className="border-b border-neutral-150">
                {table.getHeaderGroups().map(headerGroup => (
                  headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="text-left py-4 px-6 text-xs font-bold text-black cursor-pointer group"
                      onClick={() => {
                        const currentSort = header.column.getIsSorted();
                        header.column.toggleSorting(currentSort === 'asc');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <span className="text-neutral-400">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-black">
              {table.getRowModel().rows.slice(0, pagination.pageSize).map(row => (
                <tr 
                  key={row.id} 
                  className="border-b border-neutral-150 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedChatId(row.original.id)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="py-6 px-6 text-sm text-black">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 p-4 border-t border-neutral-150">
          <span className="text-sm text-neutral-500">
            {table.getFilteredRowModel().rows.length} resultaten
          </span>
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 hover:text-red-10 disabled:opacity-50 disabled:hover:text-neutral-700 transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Vorige
            </button>
            <span className="text-sm text-neutral-500">
              Pagina {table.getState().pagination.pageIndex + 1} van{' '}
              {table.getPageCount()}
            </span>
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 hover:text-red-10 disabled:opacity-50 disabled:hover:text-neutral-700 transition-colors"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Volgende
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHistory; 