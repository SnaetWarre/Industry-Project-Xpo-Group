import axios from 'axios';

const API_URL = 'https://localhost:5001/api/analytics-dashboard/users';

export interface UserProfile {
  id: string;
  sessionId: string;
  profileInfo: string;
  createdAt: string;
  geklikt: boolean;
  beurs?: string;
}

export const getUserProfiles = async (website: string): Promise<UserProfile[]> => {
  try {
    const token = localStorage.getItem('jwt');
    const response = await axios.get<UserProfile[]>(`${API_URL}?website=${website}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    throw error;
  }
};
