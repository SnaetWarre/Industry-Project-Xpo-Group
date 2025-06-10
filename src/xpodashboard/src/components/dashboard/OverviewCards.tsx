import { MousePointerClick, Users, TrendingUp } from 'lucide-react';
import { OverviewData } from '../../../types/api';

interface OverviewCardsProps {
  data: OverviewData;
}

export const OverviewCards = ({ data }: OverviewCardsProps) => {
  return (
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
  );
}; 