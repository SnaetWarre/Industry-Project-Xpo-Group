import axios from 'axios';

const API_URL = 'https://localhost:5001';

interface LoginResponse {
  token: string;
}

interface OverviewData {
  registrationClicks: number;
  users: number;
  conversionRate: number;
}

class ApiService {
  private static token: string | null = null;

  public static async getToken(username: string, password: string): Promise<string> {
    if (this.token) return this.token;

    try {
      const response = await axios.post<LoginResponse>(`${API_URL}/api/auth/login`, {
        username,
        password,
      });

      if (!response.data.token) {
        throw new Error('No token received from login endpoint');
      }

      this.token = response.data.token;
      return response.data.token;
    } catch (error) {
      console.error('Failed to get token:', error);
      throw error;
    }
  }

  private static async getHeaders() {
    const token = await this.getToken(process.env.NEXT_PUBLIC_API_USERNAME!, process.env.NEXT_PUBLIC_API_PASSWORD!);
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  static async getOverviewData(website: string): Promise<OverviewData> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get<OverviewData>(`${API_URL}/api/analytics-dashboard/overview?website=${website}`, { headers });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch overview data for ${website}:`, error);
      throw error;
    }
  }

  static async getAllOverviewData(): Promise<OverviewData> {
    try {
      const websites = ['ffd', 'artisan', 'abiss'];
      const results = await Promise.all(websites.map((website) => this.getOverviewData(website)));

      // Combine the results
      return results.reduce(
        (acc, curr) => ({
          registrationClicks: acc.registrationClicks + curr.registrationClicks,
          users: acc.users + curr.users,
          conversionRate: acc.users + curr.users > 0 ? (acc.registrationClicks + curr.registrationClicks) / (acc.users + curr.users) : 0,
        }),
        {
          registrationClicks: 0,
          users: 0,
          conversionRate: 0,
        }
      );
    } catch (error) {
      console.error('Failed to fetch all overview data:', error);
      throw error;
    }
  }
}

export default ApiService;
