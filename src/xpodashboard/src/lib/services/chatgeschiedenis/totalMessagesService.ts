import axios from 'axios';

const API_URL = 'http://localhost:5000/api/analytics-dashboard';

export interface TotalMessagesResponse {
  totalMessages: number;
}

export const getTotalMessages = async (website: string): Promise<TotalMessagesResponse> => {
  try {
    const token = localStorage.getItem('jwt');
    const response = await axios.get<TotalMessagesResponse>(`${API_URL}/total-messages?website=${website}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching total messages:', error);
    throw error;
  }
};
