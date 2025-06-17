import axios from "axios";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/analytics-dashboard/users`;

export interface UserProfile {
  profileInfo: string;
  createdAt: string;
}

export const getTotalChats = async (website: string): Promise<number> => {
  try {
    const token = localStorage.getItem("jwt");
    const response = await axios.get<UserProfile[]>(
      `${API_URL}?website=${website}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data.length;
  } catch (error) {
    console.error("Error fetching total chats:", error);
    throw error;
  }
};
