import axios from 'axios';
import { API_CONFIG } from '../../config';

interface LoginResponse {
  token: string;
}

// Configure axios for development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

class AuthService {
  private static token: string | null = null;

  static async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth.login}`,
        {
          username,
          password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true, // Important for cookies
        }
      );

      this.token = response.data.token;
      // Store the token in localStorage
      localStorage.setItem('jwt', response.data.token);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  static async getToken(): Promise<string> {
    if (this.token) return this.token;

    const storedToken = localStorage.getItem('jwt');
    if (storedToken) {
      this.token = storedToken;
      return storedToken;
    }

    throw new Error('No token available. Please login first.');
  }

  static async getHeaders() {
    const token = await this.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  static clearToken() {
    this.token = null;
    localStorage.removeItem('jwt');
  }

  static async getCurrentUser() {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_CONFIG.baseUrl}/api/auth/me`, {
      headers,
      withCredentials: true,
    });
    return response.data;
  }
}

export default AuthService;
