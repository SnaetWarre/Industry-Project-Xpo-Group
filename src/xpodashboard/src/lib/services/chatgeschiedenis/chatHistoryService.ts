interface ChatMessage {
  timestamp: string;
  message: string;
  isUser: boolean;
}

export const getChatHistory = async (
  sessionId: string,
): Promise<ChatMessage[]> => {
  try {
    const token = localStorage.getItem("jwt");
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/analytics-dashboard/chat-history/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch chat history");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    throw error;
  }
};
