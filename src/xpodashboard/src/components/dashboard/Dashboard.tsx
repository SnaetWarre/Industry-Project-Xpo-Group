'use client';

import { MousePointerClick, Users, TrendingUp, Download, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DashboardService from '@/lib/services/dashboard/dashboardService';
import ChartService from '@/lib/services/dashboard/chartService';
import type { DashboardOverview, ChartData } from '@/lib/types/analytics';
import CustomDropdown from '@/components/core/CustomDropdown';
import RegistrationClicksTable from './RegistrationClicksTable';
import ChatDetail from '@/components/chatgeschiedenis/ChatDetail';
import { useSiteFilter } from '@/context/SiteFilterContext';

const MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

const getAvailableMonths = () => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  return MONTHS.slice(0, currentMonth + 1);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 rounded-lg shadow-sm">
        <p className="text-sm text-black/70">{payload[0].payload.date}</p>
        <p className="text-sm font-medium text-black">{payload[0].value} kliks</p>
      </div>
    );
  }
  return null;
};

const NoDataDisplay = () => (
  <div className="h-full flex flex-col items-center justify-center text-gray-500">
    <MousePointerClick className="h-12 w-12 mb-4 opacity-50" />
    <p className="text-lg font-medium">Geen data beschikbaar</p>
    <p className="text-sm">Er zijn geen registratie kliks voor deze periode</p>
  </div>
);

// Skeleton loader component
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardOverview>({
    registrationClicks: 0,
    users: 0,
    conversionRate: 0,
    avgResponseTimeMs: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const scrollPosition = useRef<number>(0);
  const availableMonths = getAvailableMonths();
  const { site } = useSiteFilter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        let overview, clicks;
        if (site === 'all') {
          [overview, clicks] = await Promise.all([
            DashboardService.getAllOverviewData(),
            ChartService.getChartData(selectedYear, selectedMonth)
          ]);
        } else {
          [overview, clicks] = await Promise.all([
            DashboardService.getOverview(site),
            ChartService.getChartData(selectedYear, selectedMonth, site)
          ]);
        }
        setData(overview);
        setChartData(clicks);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear, site]);

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(event.target.value));
  };

  const handleSelectSessionId = (sessionId: string) => {
    scrollPosition.current = window.scrollY;
    setSelectedSessionId(sessionId);
  };

  const handleBack = () => {
    setSelectedSessionId(null);
    setTimeout(() => {
      window.scrollTo(0, scrollPosition.current);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <h1 className="text-3xl font-bold text-black mb-6">Dashboard</h1>
        {/* Skeletons voor de statistieken */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <div className="flex items-center gap-3 mt-1">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton voor de grafiek */}
        <div className="mb-12">
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="h-[400px] flex items-center justify-center">
              <Skeleton className="h-80 w-full" />
            </div>
          </div>
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

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (selectedSessionId) {
    return <ChatDetail sessionId={selectedSessionId} onBack={handleBack} />;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Dashboard</h1>
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* Registratie Kliks Card */}
        <div className="bg-white rounded-xl p-6">
          <div className='text-black'>
            <p className="text-sm text-gray-500">Aantal registratie kliks</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-2xl font-bold">{data.registrationClicks}</p>
              <div className="bg-amber-50 p-3 rounded-full">
                <MousePointerClick className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Gebruikers Card */}
        <div className="bg-white rounded-xl p-6">
          <div className='text-black'>
            <p className="text-sm text-gray-500">Aantal gebruikers</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-2xl font-bold">{data.users}</p>
              <div className="bg-violet-50 p-3 rounded-full">
                <Users className="h-6 w-6 text-violet-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Conversie Card */}
        <div className="bg-white rounded-xl p-6">
          <div className='text-black'>
            <p className="text-sm text-gray-500">Conversiepercentage</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-2xl font-bold">{(data.conversionRate * 100).toFixed(1)}%</p>
              <div className="bg-emerald-50 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-12">
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-black">Registratie kliks</h2>
            <CustomDropdown
              value={MONTHS[selectedMonth]}
              options={availableMonths}
              onChange={(_, index) => setSelectedMonth(index)}
            />
          </div>

          <div className="h-[400px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false}
                    stroke="#E5E7EB"
                  />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickFormatter={(value) => `${value}`}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#colorClicks)"
                    dot={{ fill: '#3B82F6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <NoDataDisplay />
            )}
          </div>
        </div>
      </div>

      {/* Registration Clicks Table */}
      <RegistrationClicksTable onSelectSessionId={handleSelectSessionId} />
    </div>
  );
};

export default Dashboard; 