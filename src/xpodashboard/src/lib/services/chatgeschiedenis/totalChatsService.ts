import axios from 'axios';

const API_URL = 'https://localhost:5001/api/analytics-dashboard/users';
const WEBSITES = ['ffd', 'abiss', 'artisan'];

export interface UserProfile {
  profileInfo: string;
  createdAt: string;
}

export const getTotalChats = async (website: string): Promise<number> => {
  try {
    const token = localStorage.getItem('jwt');
    const response = await axios.get<UserProfile[]>(`${API_URL}?website=${website}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.length;
  } catch (error) {
    console.error('Error fetching total chats:', error);
    throw error;
  }
};
