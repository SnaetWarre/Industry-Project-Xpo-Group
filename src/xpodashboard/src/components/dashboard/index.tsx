'use client';

import { useState, useEffect } from 'react';
import { AnalyticsService } from '../../services/api/analytics/analytics.service';
import { OverviewData, RegistrationClick } from '../../types/api';
import { OverviewCards } from './OverviewCards/OverviewCards';
import { RegistrationTable } from './RegistrationTable/RegistrationTable';

export const Dashboard = () => {
  const [overviewData, setOverviewData] = useState<OverviewData>({
    registrationClicks: 0,
    users: 0,
    conversionRate: 0,
  });
  const [registrationClicks, setRegistrationClicks] = useState<RegistrationClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overview, clicks] = await Promise.all([
          AnalyticsService.getAllOverviewData(),
          AnalyticsService.getRegistrationClicks(),
        ]);
        setOverviewData(overview);
        setRegistrationClicks(clicks);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Dashboard</h1>
      <OverviewCards data={overviewData} />
      <RegistrationTable registrationClicks={registrationClicks} />
    </div>
  );
}; 