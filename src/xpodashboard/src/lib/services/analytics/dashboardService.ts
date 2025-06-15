import axios from 'axios';
import { API_CONFIG } from '../../config';
import { DashboardOverview } from '../../types/analytics';
import AuthService from '../auth/authService';

class DashboardService {
  static async getOverview(website: string): Promise<DashboardOverview> {
    try {
      const headers = await AuthService.getHeaders();
      const response = await axios.get<DashboardOverview>(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.analytics.overview}?website=${website}`, {
        headers,
        withCredentials: true, // Important for cookies
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard overview:', error);
      throw error;
    }
  }

  static async getAllOverviewData(): Promise<DashboardOverview> {
    try {
      const websites = ['ffd', 'artisan', 'abiss'];
      const results = await Promise.all(websites.map((website) => this.getOverview(website)));

      // Combine the results
      return results.reduce(
        (acc, curr) => ({
          registrationClicks: acc.registrationClicks + curr.registrationClicks,
          users: acc.users + curr.users,
          conversionRate: acc.users + curr.users > 0 ? (acc.registrationClicks + curr.registrationClicks) / (acc.users + curr.users) : 0,
          avgResponseTimeMs: (acc.avgResponseTimeMs + curr.avgResponseTimeMs) / 2,
        }),
        {
          registrationClicks: 0,
          users: 0,
          conversionRate: 0,
          avgResponseTimeMs: 0,
        }
      );
    } catch (error) {
      console.error('Failed to fetch all overview data:', error);
      throw error;
    }
  }
}

export default DashboardService;
