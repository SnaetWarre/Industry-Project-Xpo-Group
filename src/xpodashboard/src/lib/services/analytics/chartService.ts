import axios from 'axios';
import { API_CONFIG } from '../../config';
import { RegistrationClick, ChartData } from '../../types/analytics';
import AuthService from '../auth/authService';

class ChartService {
  private static readonly websites = ['ffd', 'artisan', 'abiss'];

  static async getRegistrationClicks(year: number, week: number): Promise<RegistrationClick[]> {
    try {
      const headers = await AuthService.getHeaders();

      // Fetch data for all websites in parallel
      const promises = this.websites.map((website) =>
        axios.get<RegistrationClick[]>(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.analytics.registrationClicks}?website=${website}&year=${year}&week=${week}`, {
          headers,
          withCredentials: true,
        })
      );

      const responses = await Promise.all(promises);
      // Combine all responses into a single array
      return responses.flatMap((response) => response.data);
    } catch (error) {
      console.error('Failed to fetch registration clicks:', error);
      throw error;
    }
  }

  static processClicksForChart(clicks: RegistrationClick[]): ChartData[] {
    // Group clicks by date and sum the counts
    const clicksByDate = clicks.reduce((acc, click) => {
      const date = click.date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += click.count;
      return acc;
    }, {} as Record<string, number>);

    // Convert to chart data format and sort by date
    return Object.entries(clicksByDate)
      .map(([date, clicks]) => ({
        date: new Date(date).toLocaleDateString('nl-BE', {
          day: '2-digit',
          month: '2-digit',
        }),
        clicks,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  static getWeeksInMonth(year: number, month: number): number[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const getWeekNumber = (date: Date) => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    const firstWeek = getWeekNumber(firstDay);
    const lastWeek = getWeekNumber(lastDay);

    return Array.from({ length: lastWeek - firstWeek + 1 }, (_, i) => firstWeek + i);
  }

  static async getChartData(year: number = new Date().getFullYear(), month: number = new Date().getMonth()): Promise<ChartData[]> {
    try {
      // Get all weeks that contain days from the selected month
      const weeks = this.getWeeksInMonth(year, month);

      // Fetch data for all weeks in parallel
      const clicksPromises = weeks.map((week) => this.getRegistrationClicks(year, week));
      const allClicks = await Promise.all(clicksPromises);

      // Combine all clicks and filter to only include dates from the selected month
      const monthClicks = allClicks.flat().filter((click) => {
        const clickDate = new Date(click.date);
        return clickDate.getMonth() === month;
      });

      return this.processClicksForChart(monthClicks);
    } catch (error) {
      console.error('Failed to get chart data:', error);
      throw error;
    }
  }
}

export default ChartService;
