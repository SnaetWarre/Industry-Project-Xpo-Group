import axios from 'axios';
import { API_CONFIG } from '../../config';

interface RegistrationClick {
  profileInfo: string;
  date: string;
  count: number;
}

interface TableRow {
  id: string;
  profielInfo: string;
  date: string;
  gespreksDuur: string;
}

class RegistrationClicksService {
  private static async getHeaders() {
    const token = localStorage.getItem('jwt');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private static getWeeksToFetch() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentWeek = Math.ceil((currentDate.getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

    // Get last 52 weeks (1 year of data)
    const weeks = [];
    let year = currentYear;
    let week = currentWeek;

    for (let i = 0; i < 52; i++) {
      weeks.push({ year, week });
      week--;
      if (week < 1) {
        year--;
        week = 52;
      }
    }

    return weeks;
  }

  private static async fetchDataForWebsite(website: string, year: number, week: number) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.analytics.registrationClicks}?website=${website}&year=${year}&week=${week}`, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error fetching data for ${website} week ${week}/${year}:`, error);
      return [];
    }
  }

  static async getAllRegistrationClicks(): Promise<TableRow[]> {
    const websites = ['ffd', 'abiss', 'artisan'];
    const weeks = this.getWeeksToFetch();
    const allClicks: TableRow[] = [];
    let idCounter = 1;

    function formatDuration(seconds: number | undefined): string {
      if (typeof seconds !== 'number' || isNaN(seconds)) return '-';
      const min = Math.floor(seconds / 60);
      const sec = +(seconds % 60).toFixed(2);
      return `${min > 0 ? min + ' min. ' : ''}${sec} sec`;
    }

    try {
      // Fetch data for all websites and weeks
      const promises = websites.flatMap((website) => weeks.map(({ year, week }) => this.fetchDataForWebsite(website, year, week)));

      const results = await Promise.all(promises);

      // Process and combine all results
      results.forEach((weekData) => {
        if (Array.isArray(weekData)) {
          weekData.forEach((click: any) => {
            allClicks.push({
              id: idCounter.toString().padStart(5, '0'),
              profielInfo: click.profileInfo,
              date: click.date,
              gespreksDuur: formatDuration(click.chatToRegistrationSeconds),
            });
            idCounter++;
          });
        }
      });

      // Sort by date descending
      return allClicks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error fetching registration clicks:', error);
      throw error;
    }
  }

  static async downloadCSV(): Promise<void> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.analytics.exportRegistrationClicks}`, {
        headers,
        responseType: 'blob',
      });

      // Create a blob from the response data
      const blob = new Blob([response.data], { type: 'text/csv' });

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = 'registration-clicks.csv';

      // Append the link to the body
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      throw error;
    }
  }
}

export default RegistrationClicksService;
