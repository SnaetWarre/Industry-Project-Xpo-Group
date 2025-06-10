'use client';

import { MousePointerClick, Users, TrendingUp, Download, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

// Voorbeeld data met alle dagen van oktober
const chartData = [
  { date: '01/10', clicks: 145 },
  { date: '02/10', clicks: 230 },
  { date: '03/10', clicks: 275 },
  { date: '04/10', clicks: 320 },
  { date: '05/10', clicks: 350 },
  { date: '06/10', clicks: 450 },
  { date: '07/10', clicks: 380 },
  { date: '08/10', clicks: 425 },
  { date: '09/10', clicks: 485 },
  { date: '10/10', clicks: 520 },
  { date: '11/10', clicks: 445 },
  { date: '12/10', clicks: 490 },
  { date: '13/10', clicks: 510 },
  { date: '14/10', clicks: 495 },
  { date: '15/10', clicks: 460 },
  { date: '16/10', clicks: 480 },
  { date: '17/10', clicks: 520 },
  { date: '18/10', clicks: 540 },
  { date: '19/10', clicks: 495 },
  { date: '20/10', clicks: 470 },
  { date: '21/10', clicks: 450 },
  { date: '22/10', clicks: 480 },
  { date: '23/10', clicks: 500 },
  { date: '24/10', clicks: 520 },
  { date: '25/10', clicks: 490 },
  { date: '26/10', clicks: 470 },
  { date: '27/10', clicks: 460 },
  { date: '28/10', clicks: 475 },
  { date: '29/10', clicks: 490 },
  { date: '30/10', clicks: 510 },
  { date: '31/10', clicks: 530 }
];

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

const Dashboard = () => {
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
              <p className="text-2xl font-bold">220</p>
              <div className="bg-amber-50 p-3 rounded-full">
                <MousePointerClick className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-emerald-500 text-sm">↑ 8.5%</span>
            <span className="text-gray-500 text-sm ml-1">Stijging t.o.v. gisteren</span>
          </div>
        </div>

        {/* Gebruikers Card */}
        <div className="bg-white rounded-xl p-6">
          <div className='text-black'>
            <p className="text-sm text-gray-500">Aantal gebruikers</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-2xl font-bold">12</p>
              <div className="bg-violet-50 p-3 rounded-full">
                <Users className="h-6 w-6 text-violet-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-emerald-500 text-sm">↑ 1.3%</span>
            <span className="text-gray-500 text-sm ml-1">Stijging t.o.v. vorige week</span>
          </div>
        </div>

        {/* Conversie Card */}
        <div className="bg-white rounded-xl p-6">
          <div className='text-black'>
            <p className="text-sm text-gray-500">Conversiepercentage</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-2xl font-bold">14%</p>
              <div className="bg-emerald-50 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-rose-500 text-sm">↓ 4.3%</span>
            <span className="text-gray-500 text-sm ml-1">Daling t.o.v. gisteren</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-12">
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-black">Registratie kliks</h2>
            <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-black">
              <option>Oktober</option>
              <option>November</option>
              <option>December</option>
            </select>
          </div>

          <div className="h-[400px]">
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
                  interval={2}
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
          </div>
        </div>
      </div>

      {/* Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl text-black">Registratie kliks</h2>
            <span className="text-black">4</span>
          </div>
          <button className="inline-flex items-center gap-2 text-black border border-black px-4 py-2 hover:bg-red-10 hover:text-white hover:border-red-10 transition-all duration-300 cursor-pointer">
            <Download className="h-5 w-5" />
            Download CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white">
            <thead>
              <tr>
                <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">#</th>
                <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Bedrijfsnaam</th>
                <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Functietitel</th>
                <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Klikdatum</th>
                <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Gespreksduur</th>
                <th scope="col" className="py-4 px-6 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-150">
              {[
                { id: '00001', bedrijf: 'Howest', functie: 'Student', date: '04 Sep 2019' },
                { id: '00002', bedrijf: 'Tapijtfirma', functie: 'Innovation functie', date: '28 May 2019' },
                { id: '00003', bedrijf: 'Darrell Caldwell', functie: '8587 Frida Ports', date: '23 Nov 2019' },
                { id: '00004', bedrijf: 'Gilbert Johnston', functie: '768 Destiny Lake Suite 600', date: '05 Feb 2019' }
              ].map((row) => (
                <tr 
                  key={row.id} 
                  className="border-b border-neutral-150 hover:bg-gray-50"
                >
                  <td className="py-6 px-6 text-sm text-black">{row.id}</td>
                  <td className="py-6 px-6 text-sm text-black">{row.bedrijf}</td>
                  <td className="py-6 px-6 text-sm text-black">{row.functie}</td>
                  <td className="py-6 px-6 text-sm text-black">{row.date}</td>
                  <td className="py-6 px-6 text-sm text-black">2 min. 15 sec.</td>
                  <td className="py-6 px-6">
                    <Link 
                      href={`/chatgeschiedenis/${row.id}`}
                      className="hover:bg-red-10/10 p-2 rounded-full transition-all duration-300 cursor-pointer inline-flex"
                    >
                      <ArrowUpRight className="h-4 w-4 text-black" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 