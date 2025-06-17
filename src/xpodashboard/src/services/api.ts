import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface LoginResponse {
  token: string;
}

class ApiService {
  private static token: string | null = null;

  public static async getToken(
    username: string,
    password: string,
  ): Promise<string> {
    if (this.token) return this.token;

    try {
      const response = await axios.post<LoginResponse>(
        `${API_URL}/api/auth/login`,
        {
          username,
          password,
        },
      );

      if (!response.data.token) {
        throw new Error("No token received from login endpoint");
      }

      this.token = response.data.token;
      return response.data.token;
    } catch (error) {
      console.error("Failed to get token:", error);
      throw error;
    }
  }

  private static async getHeaders() {
    const token = await this.getToken(
      process.env.NEXT_PUBLIC_API_USERNAME!,
      process.env.NEXT_PUBLIC_API_PASSWORD!,
    );
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }
}

export default ApiService;
