import axios from "axios";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/analytics-dashboard`;

export interface AverageChatDurationResponse {
  averageDurationSeconds: number;
  formatted: string;
  count: number;
}

export const getAverageChatDuration = async (
  website: string,
): Promise<AverageChatDurationResponse> => {
  try {
    const token = localStorage.getItem("jwt");
    const response = await axios.get<AverageChatDurationResponse>(
      `${API_URL}/average-chat-duration?website=${website}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching average chat duration:", error);
    throw error;
  }
};
