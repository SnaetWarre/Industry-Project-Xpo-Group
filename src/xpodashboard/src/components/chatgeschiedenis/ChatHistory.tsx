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
import { useState } from 'react';

type ChatEntry = {
  id: string;
  bedrijf: string;
  functie: string;
  date: string;
  beurs: string;
  status: 'completed' | 'rejected';
};

const data: ChatEntry[] = [
  { id: '00001', bedrijf: 'Howest', functie: 'Student', date: '04 Sep 2019', beurs: 'Flor', status: 'completed' },
  { id: '00002', bedrijf: 'Tapijtfirma', functie: 'Innovation functie', date: '28 May 2019', beurs: 'Flor', status: 'rejected' },
  { id: '00003', bedrijf: 'Darrell Caldwell', functie: '8587 Frida Ports', date: '23 Nov 2019', beurs: 'Abiss', status: 'rejected' },
  { id: '00004', bedrijf: 'Gilbert Johnston', functie: '768 Destiny Lake Suite 600', date: '05 Feb 2019', beurs: 'Abiss', status: 'completed' },
  { id: '00005', bedrijf: 'Alan Cain', functie: '042 Mylene Throughway', date: '29 Jul 2019', beurs: 'Artisan', status: 'rejected' },
  { id: '00006', bedrijf: 'Alfred Murray', functie: '543 Weimann Mountain', date: '15 Aug 2019', beurs: 'Artisan', status: 'completed' },
  { id: '00007', bedrijf: 'Maggie Sullivan', functie: 'New Scottieberg', date: '21 Dec 2019', beurs: 'Artisan', status: 'completed' },
  { id: '00008', bedrijf: 'Rosie Todd', functie: 'New Jon', date: '30 Apr 2019', beurs: 'Artisan', status: 'rejected' },
  { id: '00009', bedrijf: 'Dollie Hines', functie: '124 Lyla Forge Suite 975', date: '09 Jan 2019', beurs: 'Artisan', status: 'completed' },
];

const columnHelper = createColumnHelper<ChatEntry>();

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('bedrijf', {
    header: 'BEDRIJF',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('functie', {
    header: 'FUNCTIE',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('date', {
    header: 'DATE',
    cell: (info) => (
      <div className="text-black flex gap-1">
        <span>{info.getValue().split(' ')[0]}</span>
        <span>{info.getValue().split(' ')[1]}</span>
        <span>{info.getValue().split(' ')[2]}</span>
      </div>
    ),
  }),
  columnHelper.accessor('beurs', {
    header: 'BEURS',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'GEKLIKT',
    cell: (info) => (
      <span
        className={`px-3 py-1 rounded-md text-xs inline-block text-center w-24 ${
          info.getValue() === 'completed'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-red-100 text-red-700'
        }`}
      >
        {info.getValue() === 'completed' ? 'Voltooid' : 'Geweigerd'}
      </span>
    ),
  }),
] as ColumnDef<ChatEntry>[];

const ChatHistory = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [beursFilter, setBeursFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isBeursOpen, setIsBeursOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Get unique values for filters
  const uniqueDates = Array.from(new Set(data.map(item => item.date.split(' ')[1])));
  const uniqueBeurs = Array.from(new Set(data.map(item => item.beurs)));
  const statusOptions = ['Completed', 'Rejected'];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    sortDescFirst: true,
  });

  const applyDateFilter = (value: string) => {
    setDateFilter(value);
    table.getColumn('date')?.setFilterValue(value);
    setIsDateOpen(false);
  };

  const applyBeursFilter = (value: string) => {
    setBeursFilter(value);
    table.getColumn('beurs')?.setFilterValue(value);
    setIsBeursOpen(false);
  };

  const applyStatusFilter = (value: string) => {
    setStatusFilter(value);
    table.getColumn('status')?.setFilterValue(value.toLowerCase());
    setIsStatusOpen(false);
  };

  const resetFilters = () => {
    setDateFilter('');
    setBeursFilter('');
    setStatusFilter('');
    table.resetColumnFilters();
  };

  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold text-black mb-6">Chatgeschiedenis</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl p-6">
          <p className="text-sm text-black">Totale Chats</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-bold text-black">156</p>
            <div className="bg-blue-50 p-3 rounded-full">
              <MessageSquare className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-emerald-500 text-sm">↑ 12.5%</span>
            <span className="text-black text-sm ml-1">Laatste 30 dagen</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6">
          <p className="text-sm text-black">Gemiddelde Duur</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-bold text-black">4m 12s</p>
            <div className="bg-green-50 p-3 rounded-full">
              <MessageSquare className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-emerald-500 text-sm">↑ 3.2%</span>
            <span className="text-black text-sm ml-1">Per gesprek</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6">
          <p className="text-sm text-black">Berichten</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-bold text-black">1,248</p>
            <div className="bg-purple-50 p-3 rounded-full">
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-emerald-500 text-sm">↑ 8.1%</span>
            <span className="text-black text-sm ml-1">Totaal verstuurd</span>
          </div>
        </div>
      </div>

      {/* Chat History Table */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-xl font-semibold text-black mb-4">Recente Gesprekken</h2>
        
        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-neutral-150 pr-4">
            <Filter className="h-5 w-5 text-neutral-500" />
            <span className="font-medium text-black">Filteren op</span>
          </div>
          
          {/* Date Filter */}
          <div className="relative">
            <button 
              className="flex items-center gap-2 px-4 py-2 hover:bg-white rounded-lg text-black"
              onClick={() => setIsDateOpen(!isDateOpen)}
            >
              <span>{dateFilter || 'Datum'}</span>
              <ChevronDown className="h-4 w-4 text-neutral-500" />
            </button>
            {isDateOpen && (
              <div className="absolute top-full mt-1 w-40 bg-white border border-neutral-150 rounded-lg shadow-lg z-10">
                {uniqueDates.map((date) => (
                  <button
                    key={date}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-black"
                    onClick={() => applyDateFilter(date)}
                  >
                    {date}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Beurs Filter */}
          <div className="relative">
            <button 
              className="flex items-center gap-2 px-4 py-2 hover:bg-white rounded-lg text-black"
              onClick={() => setIsBeursOpen(!isBeursOpen)}
            >
              <span>{beursFilter || 'Beurs'}</span>
              <ChevronDown className="h-4 w-4 text-neutral-500" />
            </button>
            {isBeursOpen && (
              <div className="absolute top-full mt-1 w-40 bg-white border border-neutral-150 rounded-lg shadow-lg z-10">
                {uniqueBeurs.map((beurs) => (
                  <button
                    key={beurs}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-black"
                    onClick={() => applyBeursFilter(beurs)}
                  >
                    {beurs}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <button 
              className="flex items-center gap-2 px-4 py-2 hover:bg-white rounded-lg text-black"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
            >
              <span>{statusFilter || 'Geklikt'}</span>
              <ChevronDown className="h-4 w-4 text-neutral-500" />
            </button>
            {isStatusOpen && (
              <div className="absolute top-full mt-1 w-40 bg-white border border-neutral-150 rounded-lg shadow-lg z-10">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-black"
                    onClick={() => applyStatusFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
          
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
              {table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id} 
                  className="border-b border-neutral-150 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/chatgeschiedenis/${row.original.id}`}
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
        <div className="flex items-center justify-between mt-4 text-sm text-black">
          <span>
            {table.getFilteredRowModel().rows.length} resultaten
          </span>
          <div className="flex gap-2">
            <button
              className="text-black hover:text-gray-700 disabled:opacity-50"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Vorige
            </button>
            <button
              className="text-black hover:text-gray-700 disabled:opacity-50"
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